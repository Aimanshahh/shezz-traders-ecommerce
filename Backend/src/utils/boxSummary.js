import Box from '../models/Box.js'
import Device from '../models/Device.js'

// Counts devices per box. For a carton, the counts of all boxes inside it are added up.
// `boxes` are plain objects with _id and type. Returns Map(boxId -> counts).
export async function summarise(boxes) {
  const map = new Map(
    boxes.map((b) => [
      String(b._id),
      { total: 0, available: 0, sold: 0, other: 0, childBoxes: 0 },
    ])
  )
  if (boxes.length === 0) return map

  const cartonIds = boxes.filter((b) => b.type === 'carton').map((b) => b._id)
  const children = cartonIds.length
    ? await Box.find({ parent: { $in: cartonIds } }).select('_id parent').lean()
    : []
  const parentOf = new Map(children.map((c) => [String(c._id), String(c.parent)]))
  children.forEach((c) => {
    const m = map.get(String(c.parent))
    if (m) m.childBoxes += 1
  })

  const ids = [
    ...boxes.filter((b) => b.type === 'box').map((b) => b._id),
    ...children.map((c) => c._id),
  ]
  if (ids.length === 0) return map

  const rows = await Device.aggregate([
    { $match: { box: { $in: ids } } },
    { $group: { _id: { box: '$box', status: '$status' }, count: { $sum: 1 } } },
  ])

  rows.forEach((r) => {
    const boxId = String(r._id.box)
    const targets = [boxId]
    if (parentOf.has(boxId)) targets.push(parentOf.get(boxId))
    targets.forEach((t) => {
      const m = map.get(t)
      if (!m) return
      m.total += r.count
      if (r._id.status === 'available') m.available += r.count
      else if (r._id.status === 'sold') m.sold += r.count
      else m.other += r.count
    })
  })
  return map
}

export function stateOf(s) {
  if (!s || s.total === 0) return 'empty'
  if (s.sold === s.total) return 'sold'
  if (s.available === s.total) return 'in_stock'
  return 'partial'
}