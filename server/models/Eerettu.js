import mongoose from 'mongoose'

const barcodeItemSchema = new mongoose.Schema({
  barcode:    { type: String, required: true },
  wt:         { type: Number, default: 0 },
  size:       { type: String, default: '' },
  status:     { type: String, enum: ['PENDING', 'RETURNED', 'SOLD'], default: 'PENDING' },
  billBookNo: { type: String, default: '' },
  billPageNo: { type: String, default: '' },
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
      soldPcs:     { type: Number, default: 0 },   // auto-calculated
      soldWt:      { type: Number, default: 0 },   // auto-calculated
      status:      { type: String, enum: ['PENDING', 'RETURNED', 'SOLD'], default: 'PENDING' },
      billBookNo:  { type: String, default: '' },
      billPageNo:  { type: String, default: '' },
    },
  },
  { timestamps: true }
)

export default mongoose.model('Eerettu', eerettuSchema)