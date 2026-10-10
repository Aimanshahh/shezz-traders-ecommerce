import CrmSettings, { getSettings } from '../models/CrmSettings.js'

const FIELDS = [
  'shopName',
  'address',
  'phone',
  'email',
  'bankName',
  'bankAccountName',
  'bankAccountNumber',
  'taxNumber',
  'invoicePrefix',
  'warrantyMonths',
  'warrantyNote',
  'invoiceFooter',
]

export async function getCrmSettings(req, res, next) {
  try {
    const settings = await getSettings()
    res.json({ ok: true, settings })
  } catch (err) {
    next(err)
  }
}

export async function saveCrmSettings(req, res, next) {
  try {
    const update = {}
    FIELDS.forEach((f) => {
      if (req.body[f] !== undefined) update[f] = req.body[f]
    })
    if (update.warrantyMonths !== undefined) {
      const n = Number(update.warrantyMonths)
      if (!Number.isInteger(n) || n < 0 || n > 120) {
        return res.status(400).json({ ok: false, message: 'Warranty months must be a whole number' })
      }
      update.warrantyMonths = n
    }
    if (update.invoicePrefix !== undefined) {
      update.invoicePrefix = String(update.invoicePrefix).trim().slice(0, 12)
    }
    await getSettings()
    const settings = await CrmSettings.findOneAndUpdate({ key: 'main' }, { $set: update }, { new: true })
    res.json({ ok: true, settings })
  } catch (err) {
    next(err)
  }
}