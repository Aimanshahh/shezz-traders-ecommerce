import mongoose from 'mongoose'
import Device, { DEVICE_STATUSES } from '../models/Device.js'
import DeviceHistory from '../models/DeviceHistory.js'
import Product from '../models/Product.js'
import { validateImei } from '../utils/Imei.js'

const MAX_IMPORT = 5000
// Statuses staff may set by hand. "sold" only happens through a completed sale.
const MANUAL_STATUSES = ['available', 'faulty', 'lost', 'deactivated']

const actor = (req) => ({
  performedBy: req.admin?._id || null,
  performedByName: req.admin?.name || req.admin?.username || req.admin?.email || '',
})

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function analyse(values) {
  const valid = []
  const invalid = []
  const duplicatesInFile = []
  const seen = new Set()
  values.forEach((raw, i) => {
    const r = validateImei(raw)
    if (!r.valid) {
      invalid.push({ row: i + 1, value: String(raw ?? ''), reason: r.reason })
    } else if (seen.has(r.imei)) {
      duplicatesInFile.push(r.imei)
    } else {
      seen.add(r.imei)
      valid.push(r.imei)
    }
  })
  return { valid, invalid, duplicatesInFile }
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
    if (req.query.q) {
      filter.imei = { $regex: escapeRegex(String(req.query.q).trim()) }
    }
    const [devices, total] = await Promise.all([
      Device.find(filter)
        .populate('product', 'name title')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Device.countDocuments(filter),
    ])
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
    res.json({ ok: true, stats: { total, ...stats } })
  } catch (err) {
    next(err)
  }
}

export async function getDevice(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: 'Invalid device id' })
    }
    const device = await Device.findById(req.params.id).populate('product', 'name title').lean()
    if (!device) return res.status(404).json({ ok: false, message: 'Device not found' })
    const history = await DeviceHistory.find({ device: device._id })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()
    res.json({ ok: true, device, history })
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

    const { valid, invalid, duplicatesInFile } = analyse(imeis)
    const existing = await Device.find({ imei: { $in: valid } }).select('imei').lean()
    const existingSet = new Set(existing.map((d) => d.imei))
    const importable = valid.filter((i) => !existingSet.has(i))

    res.json({
      ok: true,
      summary: {
        processed: imeis.length,
        importable: importable.length,
        invalid: invalid.length,
        duplicatesInFile: duplicatesInFile.length,
        alreadyInInventory: existingSet.size,
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

    const { valid, invalid, duplicatesInFile } = analyse(imeis)
    const existing = await Device.find({ imei: { $in: valid } }).select('imei').lean()
    const existingSet = new Set(existing.map((d) => d.imei))
    const toInsert = valid.filter((i) => !existingSet.has(i))

    const batch = `IMP-${Date.now()}`
    if (toInsert.length > 0) {
      const docs = toInsert.map((imei) => ({
        imei,
        product: product.id,
        status: 'available',
        importBatch: batch,
        createdBy: req.admin?._id || null,
      }))
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
        inserted.map((d) => ({
          device: d._id,
          imei: d.imei,
          action: 'imported',
          toStatus: 'available',
          note: `Bulk import ${batch}`,
          ...actor(req),
        }))
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
      },
    })
  } catch (err) {
    next(err)
  }
}

// Only looks up and validates. Never changes a device's status.
export async function scanDevice(req, res, next) {
  try {
    const r = validateImei(req.body.imei)
    if (!r.valid) {
      return res.json({ ok: true, status: 'invalid', canSell: false, message: r.reason })
    }
    const device = await Device.findOne({ imei: r.imei }).populate('product', 'name title').lean()
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
    res.json({
      ok: true,
      status: device.status,
      canSell: device.status === 'available',
      message: messages[device.status] || device.status,
      device,
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