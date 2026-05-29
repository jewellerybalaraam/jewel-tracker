import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema(
  {
    clientName: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['katcha bar','london bar','bhoondhi','cash','OldJewel'],
      required: true,
    },
    weight:  { type: Number, default: 0 },
    purity:  { type: String, default: '' },
    comment: { type: String, default: '' },
    date:    { type: Date,   default: Date.now },
    billId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Bill', default: null },
  },
  { timestamps: true }
);

walletSchema.index({ clientName: 1, date: -1 });
walletSchema.index({ billId: 1 });

export default mongoose.model('Wallet', walletSchema);