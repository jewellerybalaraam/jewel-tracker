import mongoose from 'mongoose';

const billItemSchema = new mongoose.Schema({
  refType: {
    type: String,
    enum: ['sold_barcode','sold_wt','wallet','inventory_sale','manual_sale','payment_inline'],
    required: true,
  },
  eerettuId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Eerettu',  default: null },
  barcode:     { type: String, default: '' },
  walletId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet',   default: null },
  inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory',default: null },
  label:       { type: String, default: '' },
  wt:          { type: Number, default: 0 },
  purityPct:   { type: Number, default: 0 },
  wastePct:    { type: Number, default: 0 },
  wasteSign:   { type: String, enum: ['+', '-'], default: '+' },
  mc:          { type: Number, default: 0 },
  isCash:      { type: Boolean, default: false },
  cashAmt:     { type: Number, default: 0 },
  payType:     { type: String, default: '' },
  effectivePurityPct: { type: Number, default: 0 },
  pureContrib: { type: Number, default: 0 },
  mcContrib:   { type: Number, default: 0 },
});

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  note:   { type: String, default: '' },
  date:   { type: Date,   default: Date.now },
});

const taxRowSchema = new mongoose.Schema({
  name: { type: String, required: true },
  pct:  { type: Number, required: true },
});

const billSchema = new mongoose.Schema(
  {
    billNumber:    { type: String, unique: true, index: true },
    billType:      { type: String, enum: ['sale','purchase','client'], default: 'client' },
    clientName:    { type: String, required: true, index: true },
    customerMobile:{ type: String, default: '' },
    silverRate:    { type: Number, default: 0 },
    items:         [billItemSchema],
    discountPure:  { type: Number, default: 0 },
    discountCash:  { type: Number, default: 0 },
    taxMode:       { type: Boolean, default: false },
    taxes:         [taxRowSchema],
    totals: {
      A:                    { type: Number, default: 0 },
      B:                    { type: Number, default: 0 },
      C:                    { type: Number, default: 0 },
      cashFromWallet:       { type: Number, default: 0 },
      netPure:              { type: Number, default: 0 },
      netCashBeforeDiscount:{ type: Number, default: 0 },
      netCashAfterDiscount: { type: Number, default: 0 },
      taxAmt:               { type: Number, default: 0 },
      finalCash:            { type: Number, default: 0 },
      extraToWallet:        { type: Number, default: 0 },
      extraCashOut:         { type: Number, default: 0 },
    },
    payments:   [paymentSchema],
    paidAt:     { type: Date, default: null },
    status:     { type: String, enum: ['unpaid','paid'], default: 'unpaid' },
    note:       { type: String, default: '' },
    settlement: {
      mode:       { type: String, enum: ['cash','item'], default: 'cash' },
      type:       { type: String, default: '' },
      purity:     { type: Number, default: 0 },
      itemWeight: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

billSchema.index({ clientName: 1, createdAt: -1 });
billSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Bill', billSchema);