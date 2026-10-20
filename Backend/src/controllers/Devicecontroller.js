import mongoose from 'mongoose'
import Device, { DEVICE_STATUSES } from '../models/Device.js'
import DeviceHistory from '../models/DeviceHistory.js'
import Product from '../models/Product.js'
import Box from '../models/Box.js'
import { validateImei } from '../utils/Imei.js'
import { checkBoxCode, normalizeBoxCode } from '../utils/boxCode.js'
import { summarise, stateOf } from '../utils/boxSummary.js'
import { saleInfoFor } from '../utils/saleInfo.js'
import { chainFor } from '../utils/Chain.js'
import { isSalespersonRole } from '../utils/roles.js'
import SaleItem from '../models/SaleItem.js'
import Warranty from '../models/Warranty.js'
import Transfer from '../models/Transfer.js'
import ReturnCase from '../models/ReturnCase.js'

const MAX_IMPORT = 5000
// Statuses staff may set by hand. "sold" only happens through a completed sale.
const MANUAL_STATUSES = ['available', 'faulty', 'lost', 'deactivated']

const actor = (req) => ({
  performedBy: req.admin?._id || null,
  performedByName: req.admin?.name || req.admin?.username || req.admin?.email || '',
})

// Salespeople maintain stock through these same endpoints but must never see prices,
// so the unit price carried by a sale record is removed before it is sent back.
function saleFor(req, info, deviceId) {
  const sale = info.get(String(deviceId)) || null
  if (!sale) return null
  if (isSalespersonRole(req.admin?.role)) {
    const { unitPrice, ...rest } = sale
    return rest
  }
  return sale
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function analyse(values, boxCodes) {
  const valid = []
  const invalid = []
  const duplicatesInFile = []
  const seen = new Set()
  const boxOf = new Map()
  const rowOf = new Map()
  values.forEach((raw, i) => {
    const r = validateImei(raw)
    if (!r.valid) {
      invalid.push({ row: i + 1, value: String(raw ?? ''), reason: r.reason })
      return
    }
    let boxCode = ''
    const rawBox = Array.isArray(boxCodes) ? String(boxCodes[i] ?? '').trim() : ''
    if (rawBox) {
      const c = checkBoxCode(rawBox)
      if (!c.ok) {
        invalid.push({ row: i + 1, value: `${r.imei} / ${rawBox}`, reason: c.message })
        return
      }
      boxCode = c.code
    }
    if (seen.has(r.imei)) {
      duplicatesInFile.push(r.imei)
      return
    }
    seen.add(r.imei)
    valid.push(r.imei)
    rowOf.set(r.imei, i + 1)
    if (boxCode) boxOf.set(r.imei, boxCode)
  })
  return { valid, invalid, duplicatesInFile, boxOf, rowOf }
}

// Devices cannot go straight into a carton. Moves those rows to `invalid`.
async function planBoxes(valid, invalid, boxOf, rowOf) {
  const codes = [...new Set(boxOf.values())]
  const found = codes.length
    ? await Box.find({ code: { $in: codes } }).select('_id code type').lean()
    : []
  const foundMap = new Map(found.map((b) => [b.code, b]))
  const cartonCodes = new Set(found.filter((b) => b.type === 'carton').map((b) => b.code))
  const kept = []
  valid.forEach((imei) => {
    const code = boxOf.get(imei)
    if (code && cartonCodes.has(code)) {
      invalid.push({
        row: rowOf.get(imei),
        value: `${imei} / ${code}`,
        reason: 'That code is a carton. Devices go into boxes',
      })
    } else {
      kept.push(imei)
    }
  })
  return { kept, foundMap }
}

async function createMissingBoxes(codes, productId, adminId, map) {
  if (!codes.length) return
  try {
    await Box.insertMany(
      codes.map((code) => ({
        code,
        type: 'box',
        product: productId,
        expectedCount: 10,
        createdBy: adminId,
      })),
      { ordered: false }
    )
  } catch (err) {
    const onlyDup = err.code === 11000 || err.writeErrors?.every((e) => e.code === 11000)
    if (!onlyDup) throw err
  }
  const created = await Box.find({ code: { $in: codes } }).select('_id code type').lean()
  created.forEach((b) => map.set(b.code, b))
}

async function checkProduct(productId) {
  if (!productId) return { ok: true, id: null }
  if (!mongoose.isValidObjectId(productId)) return { ok: false }
  const exists = await Product.exists({ _id: productId })
  return exists ? { ok: true, id: productId } : { ok: false }
}

export async function listDevices(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100)
    const filter = {}
    if (req.query.status && DEVICE_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status
    }
    if (req.query.product && mongoose.isValidObjectId(req.query.product)) {
      filter.product = req.query.product
    }
    if (req.query.box && mongoose.isValidObjectId(req.query.box)) {
      filter.box = req.query.box
    }
    if (req.query.q) {
      const q = String(req.query.q).trim()
      const or = [{ imei: { $regex: escapeRegex(q) } }]
      // Also match box and carton codes
      const matched = await Box.find({ code: { $regex: escapeRegex(q.toUpperCase()) } })
        .select('_id type')
        .limit(200)
        .lean()
      const boxIds = matched.filter((b) => b.type === 'box').map((b) => b._id)
      const cartonIds = matched.filter((b) => b.type === 'carton').map((b) => b._id)
      if (cartonIds.length) {
        const kids = await Box.find({ parent: { $in: cartonIds } }).select('_id').lean()
        boxIds.push(...kids.map((k) => k._id))
      }
      if (boxIds.length) or.push({ box: { $in: boxIds } })
      filter.$or = or
    }
    const [devices, total] = await Promise.all([
      Device.find(filter)
        .populate('product', 'name title')
        .populate('box', 'code')
        .populate('holder', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Device.countDocuments(filter),
    ])
    const soldIds = devices.filter((d) => d.status === 'sold').map((d) => d._id)
    const info = await saleInfoFor(soldIds)
    devices.forEach((d) => {
      d.sale = saleFor(req, info, d._id)
    })
    res.json({ ok: true, devices, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    next(err)
  }
}

export async function getStats(req, res, next) {
  try {
    const rows = await Device.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
    const stats = Object.fromEntries(DEVICE_STATUSES.map((s) => [s, 0]))
    let total = 0
    rows.forEach((r) => {
      stats[r._id] = r.count
      total += r.count
    })

    // Aggregate device counts grouped by their Product ID for the breakdown table
    const breakdown = await Device.aggregate([
      {
        $group: {
          _id: '$product',
          total: { $sum: 1 },
          sold: { $sum: { $cond: [{ $eq: ['$status', 'sold'] }, 1, 0] } },
          available: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          total: 1,
          sold: 1,
          available: 1,
        },
      },
    ])

    res.json({ ok: true, stats: { total, ...stats, breakdown } })
  } catch (err) {
    next(err)
  }
}

export async function getDevice(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: 'Invalid device id' })
    }
    const device = await Device.findById(req.params.id)
      .populate('product', 'name title')
      .populate('holder', 'name phone')
      .populate({ path: 'box', select: 'code type parent', populate: { path: 'parent', select: 'code' } })
      .lean()
    if (!device) return res.status(404).json({ ok: false, message: 'Device not found' })
    const history = await DeviceHistory.find({ device: device._id })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()
    const info = await saleInfoFor([device._id])
    const chain = await chainFor(device._id)
    const openCase = await ReturnCase.findOne({ device: device._id, status: 'open' }).select('caseNumber').lean()
    let holder = device.holder || null
    if (!holder && chain.length) {
      const last = chain[chain.length - 1]
      holder =
        last.type === 'transfer'
          ? { _id: last.toId, name: last.toName, phone: last.toPhone }
          : { _id: last.customerId, name: last.customerName }
    }
    res.json({ ok: true, device, history, sale: saleFor(req, info, device._id), chain, holder, openCase })
  } catch (err) {
    next(err)
  }
}

export async function addDevice(req, res, next) {
  try {
    const r = validateImei(req.body.imei)
    if (!r.valid) return res.status(400).json({ ok: false, message: r.reason })

    const product = await checkProduct(req.body.productId)
    if (!product.ok) return res.status(400).json({ ok: false, message: 'Product not found' })

    if (await Device.exists({ imei: r.imei })) {
      return res.status(409).json({ ok: false, message: 'This IMEI already exists in inventory' })
    }

    let device
    try {
      device = await Device.create({
        imei: r.imei,
        product: product.id,
        notes: req.body.notes || '',
        status: 'available',
        createdBy: req.admin?._id || null,
      })
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ ok: false, message: 'This IMEI already exists in inventory' })
      }
      throw err
    }

    await DeviceHistory.create({
      device: device._id,
      imei: device.imei,
      action: 'added',
      toStatus: 'available',
      note: 'Added manually',
      ...actor(req),
    })
    res.status(201).json({ ok: true, device })
  } catch (err) {
    next(err)
  }
}

// Nothing is saved. Shows what an import would do.
export async function previewImport(req, res, next) {
  try {
    const { imeis } = req.body
    if (!Array.isArray(imeis) || imeis.length === 0) {
      return res.status(400).json({ ok: false, message: 'No IMEIs provided' })
    }
    if (imeis.length > MAX_IMPORT) {
      return res.status(400).json({ ok: false, message: `Maximum ${MAX_IMPORT} IMEIs per import` })
    }
    const product = await checkProduct(req.body.productId)
    if (!product.ok) return res.status(400).json({ ok: false, message: 'Product not found' })

    const { valid, invalid, duplicatesInFile, boxOf, rowOf } = analyse(imeis, req.body.boxes)
    const { kept, foundMap } = await planBoxes(valid, invalid, boxOf, rowOf)
    const existing = await Device.find({ imei: { $in: kept } }).select('imei').lean()
    const existingSet = new Set(existing.map((d) => d.imei))
    const importable = kept.filter((i) => !existingSet.has(i))
    const used = new Set(importable.map((i) => boxOf.get(i)).filter(Boolean))
    const boxesToCreate = [...used].filter((c) => !foundMap.has(c)).length
    invalid.sort((a, b) => a.row - b.row)

    res.json({
      ok: true,
      summary: {
        processed: imeis.length,
        importable: importable.length,
        invalid: invalid.length,
        duplicatesInFile: duplicatesInFile.length,
        alreadyInInventory: existingSet.size,
        boxesToCreate,
        boxesExisting: used.size - boxesToCreate,
      },
      invalid,
      duplicatesInFile,
      alreadyInInventory: [...existingSet],
    })
  } catch (err) {
    next(err)
  }
}

// Re-validates everything on the server. Never trusts the preview.
export async function commitImport(req, res, next) {
  try {
    const { imeis } = req.body
    if (!Array.isArray(imeis) || imeis.length === 0) {
      return res.status(400).json({ ok: false, message: 'No IMEIs provided' })
    }
    if (imeis.length > MAX_IMPORT) {
      return res.status(400).json({ ok: false, message: `Maximum ${MAX_IMPORT} IMEIs per import` })
    }
    const product = await checkProduct(req.body.productId)
    if (!product.ok) return res.status(400).json({ ok: false, message: 'Product not found' })

    const { valid, invalid, duplicatesInFile, boxOf, rowOf } = analyse(imeis, req.body.boxes)
    const { kept, foundMap } = await planBoxes(valid, invalid, boxOf, rowOf)
    const existing = await Device.find({ imei: { $in: kept } }).select('imei').lean()
    const existingSet = new Set(existing.map((d) => d.imei))
    const toInsert = kept.filter((i) => !existingSet.has(i))

    // Boxes: reuse existing ones, create the rest
    const boxMap = new Map(foundMap)
    const usedCodes = [...new Set(toInsert.map((i) => boxOf.get(i)).filter(Boolean))]
    const newCodes = usedCodes.filter((c) => !boxMap.has(c))
    await createMissingBoxes(newCodes, product.id, req.admin?._id || null, boxMap)

    const batch = `IMP-${Date.now()}`
    if (toInsert.length > 0) {
      const docs = toInsert.map((imei) => {
        const code = boxOf.get(imei)
        const box = code ? boxMap.get(code) : null
        return {
          imei,
          product: product.id,
          status: 'available',
          box: box && box.type === 'box' ? box._id : null,
          importBatch: batch,
          createdBy: req.admin?._id || null,
        }
      })
      try {
        await Device.insertMany(docs, { ordered: false })
      } catch (err) {
        // Someone else may have added the same IMEI a moment ago. Skip those, keep the rest.
        const onlyDuplicates = err.code === 11000 || err.writeErrors?.every((e) => e.code === 11000)
        if (!onlyDuplicates) throw err
      }
    }

    const inserted = await Device.find({ importBatch: batch }).select('_id imei').lean()
    if (inserted.length > 0) {
      await DeviceHistory.insertMany(
        inserted.map((d) => {
          const code = boxOf.get(d.imei)
          return {
            device: d._id,
            imei: d.imei,
            action: 'imported',
            toStatus: 'available',
            note: `Bulk import ${batch}${code ? ` · box ${code}` : ''}`,
            meta: code ? { box: code } : null,
            ...actor(req),
          }
        })
      )
    }

    res.status(201).json({
      ok: true,
      batch,
      summary: {
        processed: imeis.length,
        imported: inserted.length,
        invalid: invalid.length,
        duplicatesInFile: duplicatesInFile.length,
        alreadyInInventory: existingSet.size,
        boxesCreated: newCodes.length,
      },
    })
  } catch (err) {
    next(err)
  }
}

// Only looks up and validates. Never changes a device's status.
// Also understands box and carton barcodes (anything that is not plain digits).
export async function scanDevice(req, res, next) {
  try {
    const rawScan = String(req.body.imei ?? '').trim()

    if (rawScan && !/^\d+$/.test(rawScan)) {
      const box = await Box.findOne({ code: normalizeBoxCode(rawScan) })
        .select('_id code type')
        .lean()
      if (box) {
        const map = await summarise([box])
        const summary = map.get(String(box._id))
        return res.json({
          ok: true,
          status: 'box',
          canSell: false,
          message: `${box.type === 'carton' ? 'Carton' : 'Box'} ${box.code}`,
          box,
          summary,
          state: stateOf(summary),
        })
      }
      return res.json({
        ok: true,
        status: 'invalid',
        canSell: false,
        message: 'Not an IMEI, and no box or carton has this code',
      })
    }

    const r = validateImei(req.body.imei)
    if (!r.valid) {
      return res.json({ ok: true, status: 'invalid', canSell: false, message: r.reason })
    }
    const device = await Device.findOne({ imei: r.imei })
      .populate('product', 'name title')
      .populate('box', 'code')
      .populate('holder', 'name')
      .lean()
    if (!device) {
      return res.json({
        ok: true,
        status: 'not_found',
        canSell: false,
        imei: r.imei,
        message: 'Device not registered in inventory',
      })
    }
    const messages = {
      available: 'Device is available',
      reserved: 'Device is reserved',
      sold: 'Device already sold',
      returned: 'Device was returned',
      replacement: 'Device is a replacement unit',
      faulty: 'Device is marked faulty',
      lost: 'Device is marked lost',
      deactivated: 'Device is deactivated',
    }
    const info = await saleInfoFor([device._id])
    res.json({
      ok: true,
      status: device.status,
      canSell: device.status === 'available',
      message: messages[device.status] || device.status,
      device,
      sale: device.status === 'available' ? null : saleFor(req, info, device._id),
    })
  } catch (err) {
    next(err)
  }
}

export async function updateStatus(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: 'Invalid device id' })
    }
    const { status, note } = req.body
    if (!MANUAL_STATUSES.includes(status)) {
      return res.status(400).json({
        ok: false,
        message: `Status can only be set to: ${MANUAL_STATUSES.join(', ')}`,
      })
    }
    const device = await Device.findById(req.params.id)
    if (!device) return res.status(404).json({ ok: false, message: 'Device not found' })
    if (device.status === 'sold') {
      return res.status(400).json({
        ok: false,
        message: 'A sold device cannot be changed here. Use the warranty / return flow',
      })
    }
    if (device.status === status) {
      return res.status(400).json({ ok: false, message: `Device is already ${status}` })
    }

    const fromStatus = device.status
    device.status = status
    await device.save()
    await DeviceHistory.create({
      device: device._id,
      imei: device.imei,
      action: 'status_changed',
      fromStatus,
      toStatus: status,
      note: note || '',
      ...actor(req),
    })
    res.json({ ok: true, device })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/devices/:id
// Removes a device and its history. Only allowed for devices that have never been sold,
// so no invoice, warranty or ledger entry is ever left pointing at nothing.
export async function deleteDevice(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: 'Invalid device id' })
    }
    const device = await Device.findById(req.params.id)
    if (!device) return res.status(404).json({ ok: false, message: 'Device not found' })
    const [onSale, transfers] = await Promise.all([
      SaleItem.exists({ device: device._id }),
      Transfer.exists({ device: device._id }),
    ])
    if (device.status === 'sold' || onSale || transfers) {
      return res.status(400).json({
        ok: false,
        message: 'This device has sales records. Delete the invoice it belongs to first',
      })
    }
    await Promise.all([
      DeviceHistory.deleteMany({ device: device._id }),
      Warranty.deleteMany({ device: device._id }),
    ])
    await device.deleteOne()
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}