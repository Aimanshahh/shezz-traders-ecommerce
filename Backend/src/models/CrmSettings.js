import mongoose from 'mongoose'

// A single document (key: 'main') holding shop details used on invoices.
const crmSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    shopName: { type: String, default: 'Shezz Traders' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    bankName: { type: String, default: '' },
    bankAccountName: { type: String, default: '' },
    bankAccountNumber: { type: String, default: '' },
    taxNumber: { type: String, default: '' },
    invoicePrefix: { type: String, default: 'INV-' },
    warrantyMonths: { type: Number, default: 6, min: 0 },
    warrantyNote: {
      type: String,
      default:
        'Warranty covers manufacturing defects for the period shown against each device. Keep this invoice for any warranty claim.',
    },
    invoiceFooter: { type: String, default: 'Thank you for your business.' },
  },
  { timestamps: true }
)

export async function getSettings() {
  return mongoose.model('CrmSettings').findOneAndUpdate(
    { key: 'main' },
    { $setOnInsert: { key: 'main' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
}

export default mongoose.model('CrmSettings', crmSettingsSchema)