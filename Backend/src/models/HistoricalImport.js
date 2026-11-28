import mongoose from 'mongoose'

export const HISTORICAL_IMPORT_STATUSES = ['failed', 'committed', 'rolled_back']

// One document per historical import attempt. Written before any data is inserted so a
// failed or interrupted import still leaves a trace, and flipped to 'committed' only
// once the whole batch is saved.
const historicalImportSchema = new mongoose.Schema(
  {
    batch: { type: String, required: true, unique: true, index: true },
    fileName: { type: String, default: '' },
    fileHash: { type: String, default: '' },
    sheetName: { type: String, default: '' },
    columnMap: { type: mongoose.Schema.Types.Mixed, default: null },
    options: { type: mongoose.Schema.Types.Mixed, default: null },
    status: {
      type: String,
      enum: HISTORICAL_IMPORT_STATUSES,
      default: 'failed',
      index: true,
    },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    performedByName: { type: String, default: '' },
    // Counts required by the import log: processed, sold, inStock, pendingCustomers,
    // matchedCustomers, duplicates, rejected, errors.
    summary: { type: mongoose.Schema.Types.Mixed, default: {} },
    errors: [
      {
        _id: false,
        row: { type: Number, default: null },
        imei: { type: String, default: '' },
        reason: { type: String, default: '' },
      },
    ],
    failureReason: { type: String, default: '' },
    rollback: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
)

export default mongoose.model('HistoricalImport', historicalImportSchema)
