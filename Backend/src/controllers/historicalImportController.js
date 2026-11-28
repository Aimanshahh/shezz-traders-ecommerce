// Historical stock import — deliberately isolated from the live stock tools.
//
// Nothing here is reachable from the existing bulk importer, the scanners or the
// checkout flow, and nothing here updates or deletes a pre-existing document. Every
// write is a new document stamped with a batch id, so a batch can be removed again
// without touching anything the shop recorded before.
//
// The Excel sheet is the source of HISTORICAL records only. It is never treated as an
// instruction to change live inventory.

import mongoose from 'mongoose'
import Device from '../models/Device.js'
import Product from '../models/Product.js'
import Customer from '../models/Customer.js'
import Sale from '../models/Sale.js'
import SaleItem from '../models/SaleItem.js'
import Warranty from '../models/Warranty.js'
import DeviceHistory from '../models/DeviceHistory.js'
import CustomerPrice from '../models/CustomerPrice.js'
import Counter from '../models/Counter.js'
import Transfer from '../models/Transfer.js'
import ReturnCase from '../models/ReturnCase.js'
import HistoricalImport from '../models/HistoricalImport.js'
import PendingCustomer from '../models/PendingCustomer.js'
import { getSettings } from '../models/CrmSettings.js'
import { addMonths } from '../utils/dates.js'
import {
  validateHistoricalImei,
  parseMonth,
  parseSaleDate,
  normalizeName,
  nameSimilarity,
} from '../utils/historicalRows.js'

const MAX_ROWS = 20000
const PREVIEW_SAMPLE = 300
// One transaction keeps the whole batch atomic. Above this many documents the batch is
// split into chunks with the same batch id, and a failure removes only this batch.
const TXN_DOC_LIMIT = 1500
const CHUNK_ROWS = 400
const AUTO_MATCH = 0.92
const REVIEW_MATCH = 0.75

const DEFAULT_SOLD_WORDS = ['sold', 'sale', 'sold out', 's']
const DEFAULT_STOCK_WORDS = ['in stock', 'instock', 'in-stock', 'available', 'stock', 'unsold']

class ImportError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

const round2 = (n) => Math.round(n * 100) / 100
const text = (v) => (v === null || v === undefined ? '' : String(v).trim())
const cellOf = (row, index) =>
  index === null || index === undefined ? '' : text(row[index])
const modelKey = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')

function readMapping(body) {
  const m = body?.mapping || {}
  const col = (key) => (Number.isInteger(m[key]) && m[key] >= 0 ? m[key] : null)
  return {
    imei: col('imei'),
    month: col('month'),
    saleDate: col('saleDate'),
    model: col('model'),
    customer: col('customer'),
    status: col('status'),
    price: col('price'),
    box: col('box'),
  }
}

function readWords(list, fallback) {
  const cleaned = (Array.isArray(list) ? list : [])
    .map((v) => String(v ?? '').trim().toLowerCase())
    .filter(Boolean)
  return new Set(cleaned.length ? cleaned : fallback)
}

function readVocab(body) {
  return {
    sold: readWords(body?.statusValues?.sold, DEFAULT_SOLD_WORDS),
    inStock: readWords(body?.statusValues?.inStock, DEFAULT_STOCK_WORDS),
  }
}

function readOptions(body) {
  return {
    allowFailedChecksum: body?.options?.allowFailedChecksum === true,
    dateOrder: body?.options?.dateOrder === 'mdy' ? 'mdy' : 'dmy',
  }
}

function classifyStatus(raw, vocab) {
  const value = String(raw ?? '').trim().toLowerCase()
  if (!value) return null
  if (vocab.sold.has(value)) return 'sold'
  if (vocab.inStock.has(value)) return 'inStock'
  return null
}

function buildCustomerIndex(customers) {
  const exact = new Map()
  const byInitial = new Map()
  customers.forEach((customer) => {
    const normalized = normalizeName(customer.name)
    if (!normalized) return
    if (!exact.has(normalized)) exact.set(normalized, [])
    exact.get(normalized).push(customer)
    const initial = normalized[0]
    if (!byInitial.has(initial)) byInitial.set(initial, [])
    byInitial.get(initial).push({ customer, normalized })
  })
  return { exact, byInitial }
}

function matchCustomer(rawName, index, cache) {
  const normalized = normalizeName(rawName)
  if (!normalized) return { kind: 'new', candidates: [] }
  if (cache.has(normalized)) return cache.get(normalized)

  const exact = index.exact.get(normalized) || []
  let result
  if (exact.length === 1) {
    result = {
      kind: 'exact',
      customerId: String(exact[0]._id),
      customerName: exact[0].name,
      score: 1,
      candidates: exact.slice(0, 3).map((c) => ({ customerId: String(c._id), name: c.name, score: 1 })),
    }
  } else if (exact.length > 1) {
    // Two customers genuinely share this name: never pick one silently.
    result = {
      kind: 'ambiguous',
      candidates: exact.slice(0, 3).map((c) => ({ customerId: String(c._id), name: c.name, score: 1 })),
    }
  } else {
    const bucket = index.byInitial.get(normalized[0]) || []
    const scored = []
    bucket.forEach(({ customer, normalized: other }) => {
      if (Math.abs(other.length - normalized.length) > Math.max(6, normalized.length * 0.6)) return
      const score = nameSimilarity(normalized, other)
      if (score >= REVIEW_MATCH) {
        scored.push({
          customerId: String(customer._id),
          name: customer.name,
          score: Math.round(score * 1000) / 1000,
        })
      }
    })
    scored.sort((a, b) => b.score - a.score)
    const top = scored[0]
    const strong = scored.filter((s) => s.score >= AUTO_MATCH)
    if (top && top.score >= AUTO_MATCH && strong.length === 1) {
      result = {
        kind: 'fuzzy',
        customerId: top.customerId,
        customerName: top.name,
        score: top.score,
        candidates: scored.slice(0, 3),
      }
    } else if (scored.length) {
      result = { kind: 'review', candidates: scored.slice(0, 3) }
    } else {
      result = { kind: 'new', candidates: [] }
    }
  }
  cache.set(normalized, result)
  return result
}

// Pure reads. Used by the preview (and by the commit, which never trusts the preview).
async function buildPlan(body) {
  const rows = Array.isArray(body?.rows) ? body.rows : []
  if (!rows.length) throw new ImportError('No rows to read. Upload the sheet first.')
  if (rows.length > MAX_ROWS) {
    throw new ImportError(`This importer handles up to ${MAX_ROWS} rows at a time.`)
  }
  const mapping = readMapping(body)
  if (mapping.imei === null) throw new ImportError('Choose the column that holds the IMEI.')
  const options = readOptions(body)
  const vocab = readVocab(body)
  const startRow = Number.isInteger(body?.startRow) && body.startRow > 0 ? body.startRow : 1

  const [products, customers] = await Promise.all([
    Product.find({}).select('_id name slug').lean(),
    Customer.find({}).select('_id name phone').lean(),
  ])

  const productByKey = new Map()
  products.forEach((product) => {
    productByKey.set(modelKey(product.name), product)
    if (product.slug) productByKey.set(modelKey(product.slug), product)
  })
  const customerIndex = buildCustomerIndex(customers)
  const matchCache = new Map()

  const parsed = []
  const invalid = []
  const ignored = []

  rows.forEach((row, i) => {
    const rowNumber = startRow + i
    const safeRow = Array.isArray(row) ? row : []
    const imeiRaw = cellOf(safeRow, mapping.imei)
    const monthRaw = cellOf(safeRow, mapping.month)
    const saleDateRaw = cellOf(safeRow, mapping.saleDate)
    const modelRaw = cellOf(safeRow, mapping.model)
    const customerRaw = cellOf(safeRow, mapping.customer)
    const statusRaw = cellOf(safeRow, mapping.status)

    const mappedEmpty = [
      mapping.imei, mapping.month, mapping.saleDate,
      mapping.model, mapping.customer, mapping.status,
    ]
      .filter((c) => c !== null)
      .every((c) => !text(safeRow[c]))

    if (mappedEmpty) {
      ignored.push({ row: rowNumber, reason: 'Blank row' })
      return
    }
    if (!imeiRaw) {
      ignored.push({ row: rowNumber, reason: 'No IMEI in this row' })
      return
    }

    const imeiCheck = validateHistoricalImei(imeiRaw, options)
    if (!imeiCheck.valid) {
      invalid.push({ row: rowNumber, imei: imeiRaw, reason: imeiCheck.reason })
      return
    }

    const kind = classifyStatus(statusRaw, vocab)
    if (!kind) {
      invalid.push({
        row: rowNumber,
        imei: imeiCheck.imei,
        reason: statusRaw
          ? `Status "${statusRaw}" is neither Sold nor In Stock`
          : 'Missing device status (Sold / In Stock)',
      })
      return
    }

    const receivedMonth = parseMonth(monthRaw)
    if (!receivedMonth) {
      invalid.push({
        row: rowNumber,
        imei: imeiCheck.imei,
        reason: monthRaw
          ? `Could not read the arrival month "${monthRaw}"`
          : 'Missing arrival month',
      })
      return
    }

    if (!modelRaw) {
      invalid.push({ row: rowNumber, imei: imeiCheck.imei, reason: 'Missing tracker model' })
      return
    }
    const product = productByKey.get(modelKey(modelRaw))
    if (!product) {
      invalid.push({
        row: rowNumber,
        imei: imeiCheck.imei,
        reason: `Tracker model "${modelRaw}" is not a product in Shezz Traders`,
      })
      return
    }

    // Unsold devices are never associated with a customer, whatever else the row holds.
    let saleDate = null
    let customerMatch = null
    if (kind === 'sold') {
      if (!customerRaw) {
        invalid.push({
          row: rowNumber,
          imei: imeiCheck.imei,
          reason: 'Sold device has no customer name',
        })
        return
      }
      saleDate = parseSaleDate(saleDateRaw, options)
      if (!saleDate) {
        invalid.push({
          row: rowNumber,
          imei: imeiCheck.imei,
          reason: saleDateRaw
            ? `Could not read the sale date "${saleDateRaw}"`
            : 'Sold device has no sale date',
        })
        return
      }
      customerMatch = matchCustomer(customerRaw, customerIndex, matchCache)
    }

    const priceNumber = Number(String(cellOf(safeRow, mapping.price)).replace(/[^0-9.]/g, ''))
    parsed.push({
      row: rowNumber,
      imei: imeiCheck.imei,
      checksumOk: imeiCheck.checksumOk,
      kind,
      receivedMonth,
      productId: String(product._id),
      productName: product.name,
      modelRaw,
      customerNameRaw: customerRaw,
      saleDate,
      priceRaw: Number.isFinite(priceNumber) && priceNumber > 0 ? round2(priceNumber) : 0,
      boxCode: text(cellOf(safeRow, mapping.box)),
      customerMatch,
      duplicate: false,
      duplicateOfRow: null,
      existing: false,
      existingStatus: null,
    })
  })

  // Same IMEI twice in the sheet: the first row wins, later rows are reported.
  const duplicatesInFile = []
  const firstRowOfImei = new Map()
  parsed.forEach((row) => {
    if (firstRowOfImei.has(row.imei)) {
      row.duplicate = true
      row.duplicateOfRow = firstRowOfImei.get(row.imei)
      duplicatesInFile.push({
        row: row.row,
        imei: row.imei,
        firstRow: row.duplicateOfRow,
      })
    } else {
      firstRowOfImei.set(row.imei, row.row)
    }
  })

  const existingRows =
    parsed.length > 0
      ? await Device.find({ imei: { $in: parsed.filter((r) => !r.duplicate).map((r) => r.imei) } })
          .select('imei status')
          .lean()
      : []
  const existingByImei = new Map(existingRows.map((d) => [d.imei, d]))
  const alreadyInSystem = []
  parsed.forEach((row) => {
    const found = existingByImei.get(row.imei)
    if (found) {
      row.existing = true
      row.existingStatus = found.status
      alreadyInSystem.push({ row: row.row, imei: row.imei, status: found.status })
    }
  })

  const importable = parsed.filter((r) => !r.duplicate && !r.existing)
  const sold = importable.filter((r) => r.kind === 'sold')
  const inStock = importable.filter((r) => r.kind === 'inStock')
  const matchedCustomers = sold.filter(
    (r) => r.customerMatch && (r.customerMatch.kind === 'exact' || r.customerMatch.kind === 'fuzzy')
  )
  const pendingDevices = sold.filter(
    (r) => !r.customerMatch || !['exact', 'fuzzy'].includes(r.customerMatch.kind)
  )

  const newCustomerGroups = new Map()
  const reviewGroups = new Map()
  sold.forEach((row) => {
    const match = row.customerMatch
    const key = normalizeName(row.customerNameRaw)
    if (match?.kind === 'new' || !match) {
      if (!newCustomerGroups.has(key)) {
        newCustomerGroups.set(key, { name: row.customerNameRaw, rows: [], imeis: [], devices: 0 })
      }
      const group = newCustomerGroups.get(key)
      group.devices += 1
      group.rows.push(row.row)
      group.imeis.push(row.imei)
    } else if (match.kind === 'review' || match.kind === 'ambiguous') {
      if (!reviewGroups.has(key)) {
        reviewGroups.set(key, {
          name: row.customerNameRaw,
          reason: match.kind === 'ambiguous' ? 'Several customers share this name' : 'Close name match',
          candidates: match.candidates,
          rows: [],
          imeis: [],
          devices: 0,
        })
      }
      const group = reviewGroups.get(key)
      group.devices += 1
      group.rows.push(row.row)
      group.imeis.push(row.imei)
    }
  })

  return {
    rows: parsed,
    invalid,
    ignored,
    duplicatesInFile,
    alreadyInSystem,
    importable,
    sold,
    inStock,
    matchedCustomers,
    pendingDevices,
    newCustomerGroups: [...newCustomerGroups.values()],
    reviewGroups: [...reviewGroups.values()],
    options,
    mapping,
    startRow,
    counts: {
      processed: rows.length,
      valid: parsed.length,
      importable: importable.length,
      sold: sold.length,
      inStock: inStock.length,
      matchedCustomers: matchedCustomers.length,
      pendingDevices: pendingDevices.length,
      newCustomers: newCustomerGroups.size,
      reviewCustomers: reviewGroups.size,
      duplicatesInFile: duplicatesInFile.length,
      alreadyInSystem: alreadyInSystem.length,
      invalid: invalid.length,
      ignored: ignored.length,
      failedChecksum: parsed.filter((r) => !r.checksumOk).length,
    },
  }
}

function sample(list) {
  return list.slice(0, PREVIEW_SAMPLE)
}

// POST /api/imports/historical/preview — reads only, writes nothing.
export async function previewHistoricalImport(req, res, next) {
  try {
    const plan = await buildPlan(req.body || {})
    res.json({
      ok: true,
      summary: plan.counts,
      importableSample: sample(
        plan.importable.map((r) => ({
          row: r.row,
          imei: r.imei,
          kind: r.kind,
          productName: r.productName,
          receivedMonth: r.receivedMonth,
          saleDate: r.saleDate,
          customerName: r.customerNameRaw,
          customer: r.customerMatch,
        }))
      ),
      matched: sample(
        plan.matchedCustomers.map((r) => ({
          row: r.row,
          imei: r.imei,
          sheetName: r.customerNameRaw,
          customerId: r.customerMatch.customerId,
          customerName: r.customerMatch.customerName,
          how: r.customerMatch.kind,
          score: r.customerMatch.score ?? 1,
        }))
      ),
      newCustomers: sample(plan.newCustomerGroups),
      review: sample(plan.reviewGroups),
      duplicatesInFile: sample(plan.duplicatesInFile),
      alreadyInSystem: sample(plan.alreadyInSystem),
      invalid: sample(plan.invalid),
      ignored: sample(plan.ignored),
      truncated:
        plan.invalid.length > PREVIEW_SAMPLE ||
        plan.ignored.length > PREVIEW_SAMPLE ||
        plan.duplicatesInFile.length > PREVIEW_SAMPLE ||
        plan.alreadyInSystem.length > PREVIEW_SAMPLE,
    })
  } catch (err) {
    next(err)
  }
}

function readDecisions(raw) {
  const map = new Map()
  if (!raw || typeof raw !== 'object') return map
  Object.entries(raw).forEach(([imei, value]) => {
    if (value === 'pending') {
      map.set(String(imei), 'pending')
      return
    }
    if (typeof value === 'string' && mongoose.isValidObjectId(value)) {
      map.set(String(imei), value)
    }
  })
  return map
}

function applyDecisions(rows, decisions) {
  rows.forEach((row) => {
    if (row.kind !== 'sold') return
    const decision = decisions.get(row.imei)
    if (decision === 'pending') {
      row.targetCustomerId = null
      row.decision = 'pending'
      return
    }
    if (decision) {
      row.targetCustomerId = decision
      row.decision = 'linked'
      return
    }
    const match = row.customerMatch
    if (match && (match.kind === 'exact' || match.kind === 'fuzzy')) {
      row.targetCustomerId = match.customerId
      row.decision = match.kind
    } else {
      row.targetCustomerId = null
      row.decision = 'pending'
    }
  })
  return rows
}

async function priceMapFor(rows) {
  const pairs = rows.filter((r) => r.kind === 'sold' && r.targetCustomerId)
  if (!pairs.length) return new Map()
  const customerIds = [...new Set(pairs.map((r) => r.targetCustomerId))]
  const prices = await CustomerPrice.find({ customer: { $in: customerIds } })
    .select('customer product price')
    .lean()
  const map = new Map()
  prices.forEach((p) => map.set(`${String(p.customer)}|${String(p.product)}`, p.price))
  return map
}

function priceOf(row, priceMap) {
  const rate = priceMap.get(`${row.targetCustomerId}|${row.productId}`)
  if (typeof rate === 'number' && rate > 0) return round2(rate)
  return row.priceRaw || 0
}

async function nextHistoricalInvoice(session) {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'historicalInvoice' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  )
  return `HIST-${1000 + counter.seq}`
}

async function writeChunk({ chunk, batch, adminId, adminName, settings, priceMap, session }) {
  const devices = await Device.insertMany(
    chunk.map((row) => ({
      imei: row.imei,
      product: row.productId,
      status: row.kind === 'sold' ? 'sold' : 'available',
      box: null,
      holder: row.kind === 'sold' ? row.targetCustomerId || null : null,
      importBatch: batch,
      receivedMonth: row.receivedMonth,
      recordSource: 'historical_import',
      customerPending: row.kind === 'sold' && !row.targetCustomerId,
      saleDateHint: row.kind === 'sold' ? row.saleDate : null,
      notes: `Historical import · sheet row ${row.row}`,
      createdBy: adminId,
    })),
    { session, ordered: true }
  )
  const deviceByImei = new Map(devices.map((d) => [d.imei, d]))

  // One historical invoice per customer per sale date, so sale dates stay exact.
  const groups = new Map()
  chunk
    .filter((row) => row.kind === 'sold' && row.targetCustomerId)
    .forEach((row) => {
      const key = `${row.targetCustomerId}|${row.saleDate.toISOString().slice(0, 10)}`
      if (!groups.has(key)) {
        groups.set(key, {
          customerId: row.targetCustomerId,
          saleDate: row.saleDate,
          rows: [],
        })
      }
      groups.get(key).rows.push(row)
    })

  let invoiceCount = 0
  for (const group of groups.values()) {
    const customer = await Customer.findById(group.customerId).session(session).lean()
    if (!customer) throw new ImportError('A customer chosen during review no longer exists', 409)

    const priced = group.rows.map((row) => ({ row, unitPrice: priceOf(row, priceMap) }))
    const subtotal = round2(priced.reduce((sum, item) => sum + item.unitPrice, 0))
    const invoiceNumber = await nextHistoricalInvoice(session)

    const [sale] = await Sale.create(
      [
        {
          invoiceNumber,
          saleNumber: invoiceNumber,
          customer: customer._id,
          customerSnapshot: {
            name: customer.name || '',
            phone: customer.phone || '',
            city: customer.city || '',
            address: customer.address || '',
          },
          source: 'other',
          itemCount: priced.length,
          extras: [],
          subtotal,
          discount: 0,
          total: subtotal,
          amountPaid: subtotal,
          paymentStatus: 'paid',
          paymentMethod: 'cash',
          saleDate: group.saleDate,
          soldBy: adminId,
          soldByName: adminName || 'Historical import',
          warrantyMonths: settings.warrantyMonths,
          notes: `Historical stock import ${batch} — record only, not a new trade.`,
          status: 'completed',
          importBatch: batch,
        },
      ],
      { session }
    )

    await SaleItem.insertMany(
      priced.map(({ row, unitPrice }) => {
        const device = deviceByImei.get(row.imei)
        return {
          sale: sale._id,
          device: device._id,
          imei: row.imei,
          product: row.productId,
          productName: row.productName,
          box: null,
          boxCode: row.boxCode || '',
          unitPrice,
          total: unitPrice,
          importBatch: batch,
        }
      }),
      { session }
    )

    const endDate = addMonths(group.saleDate, settings.warrantyMonths)
    await Warranty.insertMany(
      priced.map(({ row }) => {
        const device = deviceByImei.get(row.imei)
        return {
          device: device._id,
          sale: sale._id,
          customer: customer._id,
          startDate: group.saleDate,
          endDate,
          months: settings.warrantyMonths,
          status: 'active',
          policy: 'standard',
          importBatch: batch,
        }
      }),
      { session }
    )
    invoiceCount += 1
  }

  await DeviceHistory.insertMany(
    chunk.map((row) => {
      const device = deviceByImei.get(row.imei)
      return {
        device: device._id,
        imei: row.imei,
        action: 'historical_import',
        fromStatus: null,
        toStatus: row.kind === 'sold' ? 'sold' : 'available',
        note: `Historical import ${batch} · sheet row ${row.row}${
          row.kind === 'sold' && !row.targetCustomerId ? ' · customer pending' : ''
        }`,
        meta: {
          batch,
          row: row.row,
          receivedMonth: row.receivedMonth,
          saleDate: row.kind === 'sold' ? row.saleDate : null,
          source: 'historical_import',
        },
        importBatch: batch,
        performedBy: adminId,
        performedByName: adminName,
      }
    }),
    { session }
  )

  const pendingRows = chunk.filter((row) => row.kind === 'sold' && !row.targetCustomerId)
  if (pendingRows.length) {
    await PendingCustomer.insertMany(
      pendingRows.map((row) => ({
        batch,
        device: deviceByImei.get(row.imei)._id,
        imei: row.imei,
        rawCustomerName: row.customerNameRaw,
        saleDate: row.saleDate,
        productName: row.productName,
        receivedMonth: row.receivedMonth,
        suggestedCustomer: row.customerMatch?.candidates?.[0]?.customerId || null,
        suggestionNote:
          row.customerMatch?.kind === 'review' || row.customerMatch?.kind === 'ambiguous'
            ? row.customerMatch.kind === 'ambiguous'
              ? 'Several customers share this name'
              : 'Close name match — confirm or choose another customer'
            : '',
        status: 'pending',
      })),
      { session }
    )
  }

  return { devices: devices.length, invoices: invoiceCount, pending: pendingRows.length }
}

// Removes every document this batch wrote. Never touches anything written earlier,
// because every filter includes the batch id or the ids of devices this batch created.
async function removeBatchData(batch) {
  const devices = await Device.find({ importBatch: batch, recordSource: 'historical_import' })
    .select('_id')
    .lean()
  const deviceIds = devices.map((d) => d._id)
  const sales = await Sale.find({ importBatch: batch }).select('_id').lean()
  const saleIds = sales.map((s) => s._id)

  if (saleIds.length) {
    await Promise.all([
      SaleItem.deleteMany({ sale: { $in: saleIds } }),
      Warranty.deleteMany({ sale: { $in: saleIds } }),
    ])
    await Sale.deleteMany({ _id: { $in: saleIds } })
  }
  if (deviceIds.length) {
    await Promise.all([
      DeviceHistory.deleteMany({ device: { $in: deviceIds } }),
      PendingCustomer.deleteMany({ device: { $in: deviceIds } }),
    ])
    await Device.deleteMany({ _id: { $in: deviceIds } })
  }
  await PendingCustomer.deleteMany({ batch })
}

function newBatchId() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `HIST-IMP-${stamp}-${rand}`
}

// POST /api/imports/historical/commit — re-validates everything, then writes.
export async function commitHistoricalImport(req, res, next) {
  const adminId = req.admin?._id || null
  const adminName = req.admin?.name || req.admin?.username || req.admin?.email || ''
  let batch = null
  let logCreated = false
  try {
    const body = req.body || {}
    const plan = await buildPlan(body)
    if (!plan.importable.length) {
      throw new ImportError('Nothing to import — every row is invalid, duplicated or already in the system.')
    }
    applyDecisions(plan.importable, readDecisions(body.decisions))

    // A customer picked during review must exist before anything is written.
    const chosenIds = [...new Set(plan.importable.map((r) => r.targetCustomerId).filter(Boolean))]
    if (chosenIds.length) {
      const found = await Customer.find({ _id: { $in: chosenIds } }).select('_id').lean()
      if (found.length !== chosenIds.length) {
        throw new ImportError('One of the chosen customers no longer exists. Run the check again.')
      }
    }

    const settings = await getSettings()
    const priceMap = await priceMapFor(plan.importable)
    batch = newBatchId()

    await HistoricalImport.create({
      batch,
      fileName: text(body.fileName),
      fileHash: text(body.fileHash),
      sheetName: text(body.sheetName),
      columnMap: plan.mapping,
      options: plan.options,
      status: 'failed',
      startedAt: new Date(),
      performedBy: adminId,
      performedByName: adminName,
      summary: { ...plan.counts, stage: 'started' },
    })
    logCreated = true

    const rows = plan.importable
    const soldWithCustomer = rows.filter((r) => r.kind === 'sold' && r.targetCustomerId).length
    // Devices + items + warranties + histories + pending rows + invoices.
    const estimatedDocs = rows.length * 2 + soldWithCustomer * 3 + 100
    const totals = { devices: 0, invoices: 0, pending: 0 }

    if (estimatedDocs <= TXN_DOC_LIMIT) {
      const session = await mongoose.startSession()
      try {
        await session.withTransaction(async () => {
          const existing = await Device.find({ imei: { $in: rows.map((r) => r.imei) } })
            .select('imei')
            .session(session)
            .lean()
          if (existing.length) {
            throw new ImportError(
              `These IMEIs were added to Shezz Traders in the meantime: ${existing
                .slice(0, 5)
                .map((d) => d.imei)
                .join(', ')}. Run the check again.`,
              409
            )
          }
          const result = await writeChunk({
            chunk: rows,
            batch,
            adminId,
            adminName,
            settings,
            priceMap,
            session,
          })
          totals.devices += result.devices
          totals.invoices += result.invoices
          totals.pending += result.pending
        })
      } finally {
        await session.endSession()
      }
    } else {
      // Large sheet: same batch id across chunks, whole batch removed if any chunk fails.
      for (let i = 0; i < rows.length; i += CHUNK_ROWS) {
        const chunk = rows.slice(i, i + CHUNK_ROWS)
        const session = await mongoose.startSession()
        try {
          await session.withTransaction(async () => {
            const existing = await Device.find({ imei: { $in: chunk.map((r) => r.imei) } })
              .select('imei')
              .session(session)
              .lean()
            if (existing.length) {
              throw new ImportError(
                `These IMEIs were added to Shezz Traders in the meantime: ${existing
                  .slice(0, 5)
                  .map((d) => d.imei)
                  .join(', ')}. Run the check again.`,
                409
              )
            }
            const result = await writeChunk({
              chunk,
              batch,
              adminId,
              adminName,
              settings,
              priceMap,
              session,
            })
            totals.devices += result.devices
            totals.invoices += result.invoices
            totals.pending += result.pending
          })
        } finally {
          await session.endSession()
        }
      }
    }

    const summary = {
      ...plan.counts,
      devicesImported: totals.devices,
      invoicesCreated: totals.invoices,
      pendingCustomers: totals.pending,
      stage: 'committed',
    }

    await HistoricalImport.updateOne(
      { batch },
      {
        $set: {
          status: 'committed',
          finishedAt: new Date(),
          summary,
          errors: plan.invalid.slice(0, 200).map((r) => ({
            row: r.row,
            imei: r.imei,
            reason: r.reason,
          })),
        },
      }
    )

    res.status(201).json({
      ok: true,
      batch,
      summary,
      message: `${totals.devices} devices imported, ${totals.invoices} historical invoices created, ${totals.pending} customer(s) waiting for details.`,
    })
  } catch (err) {
    // Anything written under this batch is removed again, and only that.
    if (logCreated && batch) {
      try {
        await removeBatchData(batch)
        await HistoricalImport.updateOne(
          { batch },
          {
            $set: {
              status: 'failed',
              finishedAt: new Date(),
              failureReason: String(err?.message || 'Import failed'),
            },
          }
        )
      } catch (cleanupErr) {
        console.error('Historical import cleanup failed:', cleanupErr.message)
      }
    }
    next(err)
  }
}

// GET /api/imports/historical/batches
export async function listHistoricalImports(req, res, next) {
  try {
    const batches = await HistoricalImport.find({})
      .sort({ startedAt: -1 })
      .limit(50)
      .lean()
    res.json({ ok: true, batches })
  } catch (err) {
    next(err)
  }
}

// GET /api/imports/historical/batches/:batch
export async function getHistoricalImport(req, res, next) {
  try {
    const batch = String(req.params.batch || '')
    const [log, pendingCount, deviceCount] = await Promise.all([
      HistoricalImport.findOne({ batch }).lean(),
      PendingCustomer.countDocuments({ batch, status: 'pending' }),
      Device.countDocuments({ importBatch: batch, recordSource: 'historical_import' }),
    ])
    if (!log) return res.status(404).json({ ok: false, message: 'Import batch not found' })
    res.json({ ok: true, batch: log, pendingCount, deviceCount })
  } catch (err) {
    next(err)
  }
}

// POST /api/imports/historical/batches/:batch/rollback
// Removes only the documents this batch created, and refuses if anything has moved on.
export async function rollbackHistoricalImport(req, res, next) {
  try {
    const batch = String(req.params.batch || '')
    const log = await HistoricalImport.findOne({ batch })
    if (!log) return res.status(404).json({ ok: false, message: 'Import batch not found' })
    if (log.status === 'rolled_back') {
      throw new ImportError('This batch was already rolled back.')
    }
    if (log.status !== 'committed') {
      throw new ImportError('Only a committed batch can be rolled back.')
    }

    const devices = await Device.find({ importBatch: batch, recordSource: 'historical_import' })
      .select('_id imei status customerPending')
      .lean()
    if (!devices.length) throw new ImportError('No devices from this batch exist any more.', 404)
    const deviceIds = devices.map((d) => d._id)

    const sales = await Sale.find({ importBatch: batch }).select('_id').lean()
    const saleIds = sales.map((s) => s._id)
    const importedItems = saleIds.length
      ? await SaleItem.find({ sale: { $in: saleIds } }).select('device').lean()
      : []
    const soldDeviceIds = new Set(importedItems.map((i) => String(i.device)))

    const [transfer, returnCase, laterItem] = await Promise.all([
      Transfer.exists({ device: { $in: deviceIds } }),
      ReturnCase.exists({ device: { $in: deviceIds } }),
      SaleItem.findOne({
        device: { $in: deviceIds },
        ...(saleIds.length ? { sale: { $nin: saleIds } } : {}),
      })
        .select('imei')
        .lean(),
    ])
    if (transfer) {
      throw new ImportError('A device from this batch has been handed over since the import. Undo that first.')
    }
    if (returnCase) {
      throw new ImportError('A device from this batch has a warranty/return case. Close it first.')
    }
    if (laterItem) {
      throw new ImportError(
        `IMEI ${laterItem.imei} from this batch has since been put on another invoice. Void that invoice first.`
      )
    }

    const changed = devices.find((d) =>
      soldDeviceIds.has(String(d._id))
        ? d.status !== 'sold'
        : d.status !== 'available'
    )
    if (changed) {
      throw new ImportError(
        `Device ${changed.imei} from this batch has been changed since the import (now "${changed.status}"). Resolve it first.`
      )
    }

    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        if (saleIds.length) {
          await SaleItem.deleteMany({ sale: { $in: saleIds } }, { session })
          await Warranty.deleteMany({ sale: { $in: saleIds } }, { session })
          await Sale.deleteMany({ _id: { $in: saleIds } }, { session })
        }
        await Promise.all([
          DeviceHistory.deleteMany({ device: { $in: deviceIds } }, { session }),
          PendingCustomer.deleteMany({ batch }, { session }),
        ])
        await Device.deleteMany({ _id: { $in: deviceIds } }, { session })
      })
    } finally {
      await session.endSession()
    }

    const rollback = {
      at: new Date(),
      by: req.admin?.name || req.admin?.username || req.admin?.email || '',
      devicesRemoved: devices.length,
      invoicesRemoved: saleIds.length,
    }
    await HistoricalImport.updateOne(
      { batch },
      { $set: { status: 'rolled_back', rollback, finishedAt: new Date() } }
    )
    res.json({ ok: true, batch, rollback })
  } catch (err) {
    next(err)
  }
}

// ─── Pending customer queue ────────────────────────────────────────────────

// GET /api/imports/historical/pending
export async function listPendingCustomers(req, res, next) {
  try {
    const status = ['pending', 'resolved', 'rejected'].includes(String(req.query.status))
      ? String(req.query.status)
      : 'pending'
    const [items, counts] = await Promise.all([
      PendingCustomer.find({ status })
        .sort({ createdAt: 1 })
        .limit(300)
        .populate('device', 'imei status receivedMonth saleDateHint product')
        .populate('suggestedCustomer', 'name phone')
        .lean(),
      PendingCustomer.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ])
    const summary = { pending: 0, resolved: 0, rejected: 0 }
    counts.forEach((row) => {
      summary[row._id] = row.count
    })
    res.json({ ok: true, items, summary })
  } catch (err) {
    next(err)
  }
}

// POST /api/imports/historical/pending/:id/resolve  { customerId }
// Links the waiting device to a verified customer and creates its historical invoice.
export async function resolvePendingCustomer(req, res, next) {
  const session = await mongoose.startSession()
  try {
    const adminId = req.admin?._id || null
    const adminName = req.admin?.name || req.admin?.username || req.admin?.email || ''
    const pending = await PendingCustomer.findById(req.params.id)
    if (!pending) return res.status(404).json({ ok: false, message: 'Pending record not found' })
    if (pending.status !== 'pending') {
      throw new ImportError('This record has already been resolved.')
    }
    const customerId = req.body?.customerId
    if (!mongoose.isValidObjectId(customerId)) {
      throw new ImportError('Choose the customer this device belongs to.')
    }
    const customer = await Customer.findById(customerId).lean()
    if (!customer) throw new ImportError('Customer not found', 404)

    const device = await Device.findById(pending.device)
    if (!device) throw new ImportError('The imported device no longer exists.', 404)
    if (!device.customerPending) {
      throw new ImportError('This device already has a customer.')
    }

    const settings = await getSettings()
    const priceDoc = device.product
      ? await CustomerPrice.findOne({ customer: customerId, product: device.product }).lean()
      : null
    const unitPrice = round2(Number(priceDoc?.price) || 0)
    const saleDate = pending.saleDate || device.saleDateHint || new Date()
    let saleId = null
    let invoiceNumber = ''

    await session.withTransaction(async () => {
      invoiceNumber = await nextHistoricalInvoice(session)
      const [sale] = await Sale.create(
        [
          {
            invoiceNumber,
            saleNumber: invoiceNumber,
            customer: customer._id,
            customerSnapshot: {
              name: customer.name || '',
              phone: customer.phone || '',
              city: customer.city || '',
              address: customer.address || '',
            },
            source: 'other',
            itemCount: 1,
            extras: [],
            subtotal: unitPrice,
            discount: 0,
            total: unitPrice,
            amountPaid: unitPrice,
            paymentStatus: 'paid',
            paymentMethod: 'cash',
            saleDate,
            soldBy: adminId,
            soldByName: adminName || 'Historical import',
            warrantyMonths: settings.warrantyMonths,
            notes: `Historical stock import ${pending.batch} — customer details completed after import.`,
            status: 'completed',
            importBatch: pending.batch,
          },
        ],
        { session }
      )
      saleId = sale._id

      await SaleItem.create(
        [
          {
            sale: sale._id,
            device: device._id,
            imei: device.imei,
            product: device.product || null,
            productName: pending.productName || '',
            box: null,
            boxCode: '',
            unitPrice,
            total: unitPrice,
            importBatch: pending.batch,
          },
        ],
        { session }
      )
      await Warranty.create(
        [
          {
            device: device._id,
            sale: sale._id,
            customer: customer._id,
            startDate: saleDate,
            endDate: addMonths(saleDate, settings.warrantyMonths),
            months: settings.warrantyMonths,
            status: 'active',
            policy: 'standard',
            importBatch: pending.batch,
          },
        ],
        { session }
      )

      device.holder = customer._id
      device.customerPending = false
      await device.save({ session })

      await DeviceHistory.create(
        [
          {
            device: device._id,
            imei: device.imei,
            action: 'customer_linked',
            note: `Customer "${pending.rawCustomerName}" matched to ${customer.name} after import (${pending.batch})`,
            meta: { batch: pending.batch, pendingCustomer: String(pending._id), invoice: invoiceNumber },
            importBatch: pending.batch,
            performedBy: adminId,
            performedByName: adminName,
          },
        ],
        { session }
      )

      pending.status = 'resolved'
      pending.resolvedCustomer = customer._id
      pending.resolvedSale = sale._id
      pending.resolvedBy = adminId
      pending.resolvedByName = adminName
      pending.resolvedAt = new Date()
      pending.notes = text(req.body?.notes)
      await pending.save({ session })
    })

    res.json({
      ok: true,
      invoiceNumber,
      saleId,
      device: { _id: device._id, imei: device.imei, holder: customer._id },
    })
  } catch (err) {
    next(err)
  } finally {
    await session.endSession()
  }
}

// POST /api/imports/historical/pending/:id/reject  { reason }
// Marks the queue entry as rejected. The device stays sold + pending; nothing is deleted.
export async function rejectPendingCustomer(req, res, next) {
  try {
    const pending = await PendingCustomer.findById(req.params.id)
    if (!pending) return res.status(404).json({ ok: false, message: 'Pending record not found' })
    if (pending.status !== 'pending') {
      throw new ImportError('This record has already been resolved.')
    }
    pending.status = 'rejected'
    pending.notes = text(req.body?.reason)
    pending.resolvedBy = req.admin?._id || null
    pending.resolvedByName = req.admin?.name || req.admin?.username || req.admin?.email || ''
    pending.resolvedAt = new Date()
    await pending.save()

    await DeviceHistory.create({
      device: pending.device,
      imei: pending.imei,
      action: 'customer_rejected',
      note: `Customer "${pending.rawCustomerName}" rejected during review${pending.notes ? `: ${pending.notes}` : ''}`,
      meta: { batch: pending.batch, pendingCustomer: String(pending._id) },
      importBatch: pending.batch,
      performedBy: req.admin?._id || null,
      performedByName: pending.resolvedByName,
    })

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}
