import mongoose from 'mongoose'

const barcodeItemSchema = new mongoose.Schema({
  barcode:        { type: String, required: true },
  wt:             { type: Number, default: 0 },
  size:           { type: String, default: '' },
  productName:    { type: String, default: '' },
  subProductName: { type: String, default: '' },
  purity:         { type: String, default: '' },
  status:         { type: String, enum: ['PENDING', 'RETURNED', 'SOLD'], default: 'PENDING' },
  billBookNo:     { type: String, default: '' },
  billPageNo:     { type: String, default: '' },
  pureDue:        { type: Number, default: 0 },
  cashDue:        { type: Number, default: 0 },
  soldAt:         { type: Date,   default: null },
  returnedAt:     { type: Date,   default: null },
})

const eerettuSchema = new mongoose.Schema(
  {
    clientName:       { type: String, required: true },
    roughProductName: { type: String, required: true },
    date:             { type: Date, default: Date.now },
    mode:             { type: String, enum: ['barcode', 'wt'], required: true },

    items: [barcodeItemSchema],

    wtMode: {
      totalPcs:    { type: Number, default: 0 },
      totalWt:     { type: Number, default: 0 },
      returnedPcs: { type: Number, default: 0 },
      returnedWt:  { type: Number, default: 0 },
      soldPcs:     { type: Number, default: 0 },
      soldWt:      { type: Number, default: 0 },
      purity:      { type: String, default: '' },
      status:      { type: String, enum: ['PENDING', 'RETURNED', 'SOLD'], default: 'PENDING' },
      billBookNo:  { type: String, default: '' },
      billPageNo:  { type: String, default: '' },
      pureDue:     { type: Number, default: 0 },
      cashDue:     { type: Number, default: 0 },
      soldAt:      { type: Date,   default: null },
      returnedAt:  { type: Date,   default: null },
    },
  },
  { timestamps: true }
)

export default mongoose.model('Eerettu', eerettuSchema)