import mongoose from 'mongoose'
import Box, { BOX_TYPES } from '../models/Box.js'
import Device from '../models/Device.js'
import DeviceHistory from '../models/DeviceHistory.js'
import Product from '../models/Product.js'
import { validateImei } from '../utils/imei.js'
import { checkBoxCode, normalizeBoxCode } from '../utils/boxCode.js'
import { summarise, stateOf } from '../utils/boxSummary.js'

const MAX_ADD = 500
const MAX_BOXES_ADD = 100
const DEFAULT_EXPECTED = { box: 10, carton: 100 }

const actor = (req) => ({
  performedBy: req.admin?._id || null,
  performedByName: req.admin?.name || req.admin?.username || req.admin?.email || '',
})

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

async function findProduct(productId) {
  if (!productId) return { ok: true, id: null }
  if (!mongoose.isValidObjectId(productId)) return { ok: false }
  const exists = await Product.exists({ _id: productId })
  return exists ? { ok: true, id: productId } : { ok: false }
}

// Accepts a carton id or code. Returns the carton document or null.
async function findCarton(idOrCode) {
  if (!idOrCode) return null
  const carton = mongoose.isValidObjectId(idOrCode)
    ? await Box.findById(idOrCode)
    : await Box.findOne({ code: normalizeBoxCode(idOrCode) })
  return carton && carton.type === 'carton' ? carton : null
}

function decorate(box, summary) {
  return {
    ...box,
    summary,
    state: stateOf(summary),
    mismatch:
      box.expectedCount != null && summary.total > 0 && summary.total !== box.expectedCount,
  }
}

async function boxPayload(box) {
  const map = await summarise([box])
  const out = decorate(box, map.get(String(box._id)))
  let devices = []
  let children = []
  if (box.type === 'box') {
    devices = await Device.find({ box: box._id }).select('imei status').sort({ imei: 1 }).lean()
  } else {
    const kids = await Box.find({ parent: box._id })
      .populate('product', 'name')
      .sort({ code: 1 })
      .lean()
    const kidMap = await summarise(kids)
    children = kids.map((k) => decorate(k, kidMap.get(String(k._id))))
  }
  return { ok: true, box: out, devices, children }
}

// GET /api/boxes?q=&type=&page=&limit=
export async function listBoxes(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 100)
    const filter = {}
    if (BOX_TYPES.includes(req.query.type)) filter.type = req.query.type
    if (req.query.q) {
      filter.code = { $regex: escapeRegex(String(req.query.q).trim().toUpperCase()) }
    }
    const [boxes, total] = await Promise.all([
      Box.find(filter)
        .populate('product', 'name')
        .populate('parent', 'code')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Box.countDocuments(filter),
    ])
    const map = await summarise(boxes)
    res.json({
      ok: true,
      boxes: boxes.map((b) => decorate(b, map.get(String(b._id)))),
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/boxes/:id
export async function getBox(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: 'Invalid box id' })
    }
    const box = await Box.findById(req.params.id)
      .populate('product', 'name')
      .populate('parent', 'code')
      .lean()
    if (!box) return res.status(404).json({ ok: false, message: 'Box not found' })
    res.json(await boxPayload(box))
  } catch (err) {
    next(err)
  }
}

// GET /api/boxes/by-code/:code
export async function getBoxByCode(req, res, next) {
  try {
    const box = await Box.findOne({ code: normalizeBoxCode(req.params.code) })
      .populate('product', 'name')
      .populate('parent', 'code')
      .lean()
    if (!box) return res.status(404).json({ ok: false, status: 'not_found', message: 'Box not found' })
    res.json(await boxPayload(box))
  } catch (err) {
    next(err)
  }
}

// POST /api/boxes  { code, type, parentId?, productId?, expectedCount?, notes? }
export async function createBox(req, res, next) {
  try {
    const c = checkBoxCode(req.body.code)
    if (!c.ok) return res.status(400).json({ ok: false, message: c.message })

    const type = req.body.type || 'box'
    if (!BOX_TYPES.includes(type)) {
      return res.status(400).json({ ok: false, message: 'Type must be box or carton' })
    }

    const product = await findProduct(req.body.productId)
    if (!product.ok) return res.status(400).json({ ok: false, message: 'Product not found' })

    let parentId = null
    if (req.body.parentId) {
      if (type === 'carton') {
        return res.status(400).json({ ok: false, message: 'A carton cannot be inside another carton' })
      }
      const carton = await findCarton(req.body.parentId)
      if (!carton) return res.status(400).json({ ok: false, message: 'Carton not found' })
      parentId = carton._id
    }

    let expectedCount = DEFAULT_EXPECTED[type]
    if (req.body.expectedCount !== undefined && req.body.expectedCount !== '') {
      expectedCount = Number(req.body.expectedCount)
      if (!Number.isInteger(expectedCount) || expectedCount < 0) {
        return res.status(400).json({ ok: false, message: 'Expected count must be a whole number' })
      }
    }

    try {
      const box = await Box.create({
        code: c.code,
        type,
        parent: parentId,
        product: product.id,
        expectedCount,
        notes: req.body.notes || '',
        createdBy: req.admin?._id || null,
      })
      res.status(201).json({ ok: true, box })
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ ok: false, message: `${c.code} already exists` })
      }
      throw err
    }
  } catch (err) {
    next(err)
  }
}

// PATCH /api/boxes/:id  { expectedCount?, notes?, productId?, parentId? (null to clear) }
export async function updateBox(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: 'Invalid box id' })
    }
    const box = await Box.findById(req.params.id)
    if (!box) return res.status(404).json({ ok: false, message: 'Box not found' })

    if (req.body.expectedCount !== undefined) {
      const n = Number(req.body.expectedCount)
      if (!Number.isInteger(n) || n < 0) {
        return res.status(400).json({ ok: false, message: 'Expected count must be a whole number' })
      }
      box.expectedCount = n
    }
    if (req.body.notes !== undefined) box.notes = String(req.body.notes)
    if (req.body.productId !== undefined) {
      const product = await findProduct(req.body.productId)
      if (!product.ok) return res.status(400).json({ ok: false, message: 'Product not found' })
      box.product = product.id
    }
    if (req.body.parentId !== undefined) {
      if (req.body.parentId === null || req.body.parentId === '') {
        box.parent = null
      } else {
        if (box.type === 'carton') {
          return res.status(400).json({ ok: false, message: 'A carton cannot be inside another carton' })
        }
        const carton = await findCarton(req.body.parentId)
        if (!carton) return res.status(400).json({ ok: false, message: 'Carton not found' })
        box.parent = carton._id
      }
    }
    await box.save()
    res.json({ ok: true, box })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/boxes/:id  (only empty boxes / cartons)
export async function deleteBox(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: 'Invalid box id' })
    }
    const box = await Box.findById(req.params.id)
    if (!box) return res.status(404).json({ ok: false, message: 'Box not found' })
    const [devices, kids] = await Promise.all([
      Device.countDocuments({ box: box._id }),
      Box.countDocuments({ parent: box._id }),
    ])
    if (devices > 0 || kids > 0) {
      return res.status(400).json({
        ok: false,
        message: 'Only an empty box can be deleted. Take its devices or boxes out first',
      })
    }
    await box.deleteOne()
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

// POST /api/boxes/:id/devices  { imeis: [...], productId?, createMissing? }
// Links devices to a box. IMEIs not in inventory yet are created as Available.
export async function addDevicesToBox(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: 'Invalid box id' })
    }
    const box = await Box.findById(req.params.id)
    if (!box) return res.status(404).json({ ok: false, message: 'Box not found' })
    if (box.type !== 'box') {
      return res.status(400).json({ ok: false, message: 'Devices go into boxes, not cartons' })
    }

    const { imeis } = req.body
    const createMissing = req.body.createMissing !== false
    if (!Array.isArray(imeis) || imeis.length === 0) {
      return res.status(400).json({ ok: false, message: 'No IMEIs provided' })
    }
    if (imeis.length > MAX_ADD) {
      return res.status(400).json({ ok: false, message: `Maximum ${MAX_ADD} IMEIs at a time` })
    }

    const results = {
      added: [],
      created: [],
      alreadyInBox: [],
      inOtherBox: [],
      notAvailable: [],
      notFound: [],
      invalid: [],
      duplicatesInRequest: [],
    }

    const seen = new Set()
    const valid = []
    imeis.forEach((raw) => {
      const r = validateImei(raw)
      if (!r.valid) {
        results.invalid.push({ value: String(raw ?? ''), reason: r.reason })
      } else if (seen.has(r.imei)) {
        results.duplicatesInRequest.push(r.imei)
      } else {
        seen.add(r.imei)
        valid.push(r.imei)
      }
    })

    const existing = await Device.find({ imei: { $in: valid } })
      .populate('box', 'code')
      .lean()
    const existingMap = new Map(existing.map((d) => [d.imei, d]))

    const toLink = []
    const missing = []
    valid.forEach((imei) => {
      const d = existingMap.get(imei)
      if (!d) missing.push(imei)
      else if (d.box && String(d.box._id) === String(box._id)) results.alreadyInBox.push(imei)
      else if (d.box) results.inOtherBox.push({ imei, box: d.box.code })
      else if (d.status !== 'available') results.notAvailable.push({ imei, status: d.status })
      else toLink.push(d)
    })

    // Product for any brand-new devices
    let productId = box.product
    if (missing.length && createMissing) {
      if (!productId) {
        const p = await findProduct(req.body.productId)
        if (!p.ok || !p.id) {
          return res
            .status(400)
            .json({ ok: false, message: 'Choose a product for the new devices' })
        }
        productId = p.id
      }
    } else if (missing.length) {
      results.notFound.push(...missing)
    }
    if (!box.product && productId) {
      box.product = productId
      await box.save()
    }

    // Link existing available devices (guarded so two scans can't both win)
    if (toLink.length) {
      await Device.bulkWrite(
        toLink.map((d) => ({
          updateOne: {
            filter: { _id: d._id, box: null, status: 'available' },
            update: { $set: { box: box._id } },
          },
        }))
      )
      const after = await Device.find({ _id: { $in: toLink.map((d) => d._id) } })
        .select('imei box status')
        .lean()
      const linked = []
      after.forEach((d) => {
        if (d.box && String(d.box) === String(box._id)) linked.push(d)
        else results.notAvailable.push({ imei: d.imei, status: d.status })
      })
      if (linked.length) {
        await DeviceHistory.insertMany(
          linked.map((d) => ({
            device: d._id,
            imei: d.imei,
            action: 'box_assigned',
            note: `Added to box ${box.code}`,
            meta: { box: box.code },
            ...actor(req),
          }))
        )
        linked.forEach((d) => results.added.push(d.imei))
      }
    }

    // Create devices that are not in inventory yet
    if (missing.length && createMissing) {
      const batch = `BOX-${box.code}-${Date.now()}`
      try {
        await Device.insertMany(
          missing.map((imei) => ({
            imei,
            product: productId,
            status: 'available',
            box: box._id,
            importBatch: batch,
            createdBy: req.admin?._id || null,
          })),
          { ordered: false }
        )
      } catch (err) {
        const onlyDup = err.code === 11000 || err.writeErrors?.every((e) => e.code === 11000)
        if (!onlyDup) throw err
      }
      const created = await Device.find({ importBatch: batch }).select('_id imei').lean()
      if (created.length) {
        await DeviceHistory.insertMany(
          created.map((d) => ({
            device: d._id,
            imei: d.imei,
            action: 'added',
            toStatus: 'available',
            note: `Received in box ${box.code}`,
            meta: { box: box.code },
            ...actor(req),
          }))
        )
        created.forEach((d) => results.created.push(d.imei))
      }
      const createdSet = new Set(created.map((d) => d.imei))
      missing.forEach((imei) => {
        if (!createdSet.has(imei)) results.notAvailable.push({ imei, status: 'busy' })
      })
    }

    const total = await Device.countDocuments({ box: box._id })
    res.json({
      ok: true,
      results,
      total,
      expectedCount: box.expectedCount,
      overCapacity: box.expectedCount != null && total > box.expectedCount,
    })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/boxes/:id/devices/:deviceId
export async function removeDeviceFromBox(req, res, next) {
  try {
    const { id, deviceId } = req.params
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(deviceId)) {
      return res.status(400).json({ ok: false, message: 'Invalid id' })
    }
    const box = await Box.findById(id)
    if (!box) return res.status(404).json({ ok: false, message: 'Box not found' })
    const device = await Device.findOne({ _id: deviceId, box: box._id })
    if (!device) return res.status(404).json({ ok: false, message: 'Device is not in this box' })
    if (device.status !== 'available') {
      return res.status(400).json({
        ok: false,
        message: 'Only available devices can be taken out of a box',
      })
    }
    device.box = null
    await device.save()
    await DeviceHistory.create({
      device: device._id,
      imei: device.imei,
      action: 'box_removed',
      note: `Taken out of box ${box.code}`,
      meta: { box: box.code },
      ...actor(req),
    })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

// POST /api/boxes/:id/boxes  { codes: [...] }  (put boxes into a carton)
export async function addBoxesToCarton(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ ok: false, message: 'Invalid carton id' })
    }
    const carton = await Box.findById(req.params.id)
    if (!carton) return res.status(404).json({ ok: false, message: 'Carton not found' })
    if (carton.type !== 'carton') {
      return res.status(400).json({ ok: false, message: 'Boxes can only be added to a carton' })
    }

    const { codes } = req.body
    if (!Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({ ok: false, message: 'No box codes provided' })
    }
    if (codes.length > MAX_BOXES_ADD) {
      return res.status(400).json({ ok: false, message: `Maximum ${MAX_BOXES_ADD} boxes at a time` })
    }

    const results = {
      added: [],
      created: [],
      alreadyInCarton: [],
      inOtherCarton: [],
      notABox: [],
      invalid: [],
      duplicatesInRequest: [],
    }
    const seen = new Set()

    for (const raw of codes) {
      const c = checkBoxCode(raw)
      if (!c.ok) {
        results.invalid.push({ value: String(raw ?? ''), reason: c.message })
        continue
      }
      if (seen.has(c.code)) {
        results.duplicatesInRequest.push(c.code)
        continue
      }
      seen.add(c.code)

      const existing = await Box.findOne({ code: c.code }).populate('parent', 'code')
      if (!existing) {
        try {
          await Box.create({
            code: c.code,
            type: 'box',
            parent: carton._id,
            product: carton.product,
            expectedCount: DEFAULT_EXPECTED.box,
            createdBy: req.admin?._id || null,
          })
          results.created.push(c.code)
        } catch (err) {
          if (err.code === 11000) results.invalid.push({ value: c.code, reason: 'Already exists' })
          else throw err
        }
        continue
      }
      if (existing.type !== 'box') {
        results.notABox.push(c.code)
      } else if (existing.parent && String(existing.parent._id) === String(carton._id)) {
        results.alreadyInCarton.push(c.code)
      } else if (existing.parent) {
        results.inOtherCarton.push({ code: c.code, carton: existing.parent.code })
      } else {
        existing.parent = carton._id
        await existing.save()
        results.added.push(c.code)
      }
    }

    const boxesInCarton = await Box.countDocuments({ parent: carton._id })
    res.json({ ok: true, results, boxesInCarton })
  } catch (err) {
    next(err)
  }
}