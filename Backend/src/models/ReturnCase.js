import mongoose from 'mongoose'
import { PAYMENT_METHODS } from './Sale.js'

export const CASE_TYPES = ['warranty_claim', 'return']
export const CASE_REASONS = ['not_working', 'defective', 'damaged', 'wrong_item', 'changed_mind', 'other']
export const CASE_RESOLUTIONS = ['replacement', 'refund', 'repaired', 'rejected']
export const DEVICE_OUTCOMES = ['faulty', 'available', 'deactivated']

const returnCaseSchema = new mongoose.Schema(
  {
    caseNumber: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['open', 'resolved', 'cancelled'], default: 'open', index: true },
    type: { type: String, enum: CASE_TYPES, default: 'warranty_claim' },
    reason: { type: String, enum: CASE_REASONS, default: 'not_working' },
    notes: { type: String, default: '' },
    openedAt: { type: Date, default: Date.now, index: true },
    resolvedAt: { type: Date, default: null, index: true },

    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
    imei: { type: String, required: true, index: true },
    productName: { type: String, default: '' },
    sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true, index: true },
    saleItem: { type: mongoose.Schema.Types.ObjectId, ref: 'SaleItem', required: true },
    invoiceNumber: { type: String, default: '' },
    itemValue: { type: Number, default: 0, min: 0 },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    holder: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    holderName: { type: String, default: '' },
    warranty: {
      status: { type: String, default: 'expired' },
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
      months: { type: Number, default: 0 },
    },

    resolution: { type: String, enum: [...CASE_RESOLUTIONS, null], default: null },
    deviceOutcome: { type: String, enum: [...DEVICE_OUTCOMES, null], default: null },
    replacementDevice: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', default: null },
    creditAmount: { type: Number, default: 0, min: 0 },
    refundAmount: { type: Number, default: 0, min: 0 },
    refundMethod: { type: String, enum: PAYMENT_METHODS, default: 'cash' },
    resolutionNote: { type: String, default: '' },
    cancelledAt: { type: Date, default: null },
    cancelledByName: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    createdByName: { type: String, default: '' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    resolvedByName: { type: String, default: '' },
  },
  { timestamps: true }
)

returnCaseSchema.index(
  { device: 1 },
  { unique: true, partialFilterExpression: { status: 'open' } }
)

export default mongoose.model('ReturnCase', returnCaseSchema)
