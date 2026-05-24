import mongoose from 'mongoose'

/*
  BulkStock tracks length / weight-based goods that are NOT
  tagged with a per-piece barcode (e.g. silver rope sold by length).
  Every event (purchase / sale / transfer / adjustment) is appended
  here so the running balance is always derivable.
*/

const bulkTxnSchema = new mongoose.Schema(
  {
    type:        { type: String, enum: ['IN', 'OUT', 'ADJUST'], required: true },
    quantity:    { type: Number, required: true },           // positive number
    unit:        { type: String, default: 'm' },             // m / ft / inch / g
    lotNumber:   { type: Number, default: null },            // source LOT (for IN)
    supplierName:{ type: String, default: '' },
    clientName:  { type: String, default: '' },              // for OUT
    note:        { type: String, default: '' },
    txnDate:     { type: Date,   default: () => new Date() },
  },
  { timestamps: true }
)

const bulkStockSchema = new mongoose.Schema(
  {
    productName:    { type: String, required: true, index: true },
    subProductName: { type: String, default: '' },
    purity:         { type: String, default: '' },
    unit:           { type: String, default: 'm' },

    totalIn:        { type: Number, default: 0 },
    totalOut:       { type: Number, default: 0 },
    balance:        { type: Number, default: 0 },

    transactions:   [bulkTxnSchema],
  },
  { timestamps: true }
)

bulkStockSchema.index(
  { productName: 1, subProductName: 1, purity: 1 },
  { unique: true }
)

export default mongoose.model('BulkStock', bulkStockSchema)
