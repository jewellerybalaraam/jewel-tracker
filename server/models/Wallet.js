import mongoose from 'mongoose'

const walletSchema = new mongoose.Schema(
  {
    clientName: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['katcha bar', 'london bar', 'bhoondhi', 'cash', 'OldJewel'],
      required: true,
    },
    weight:  { type: Number, default: 0 },   // for `cash` type, this holds the cash amount
    purity:  { type: String, default: '' },
    comment: { type: String, default: '' },
    date:    { type: Date,   default: Date.now },
  },
  { timestamps: true }
)

export default mongoose.model('Wallet', walletSchema)
