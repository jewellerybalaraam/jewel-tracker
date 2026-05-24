import mongoose from 'mongoose'

const billItemSchema = new mongoose.Schema({
  // refType identifies what the line represents:
  //   sold_barcode    — barcode item from an existing eerettu  (we give)
  //   sold_wt         — wt-mode lot from eerettu                (we give)
  //   wallet          — wallet entry from client wallet (they give: old silver/london bar/cash/etc.)
  //   inventory_sale  — direct sale of a tagged inventory item (we give, scanned in Direct Billing)
  //   manual_sale     — untagged item entered manually          (we give, Direct Billing)
  //   payment_inline  — bar/old gold/cash supplied at bill time (they give, Direct Billing)
  refType: {
    type: String,
    enum: ['sold_barcode','sold_wt','wallet','inventory_sale','manual_sale','payment_inline'],
    required: true,
  },
  // refs
  eerettuId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Eerettu',  default: null },
  barcode:     { type: String, default: '' },
  walletId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet',   default: null },
  inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory',default: null },
  // snapshotted display
  label:      { type: String, default: '' },
  wt:         { type: Number, default: 0 },
  // billing params (user-set at bill time)
  purityPct:  { type: Number, default: 0 },
  wastePct:   { type: Number, default: 0 },
  wasteSign:  { type: String, enum: ['+', '-'], default: '+' },
  mc:         { type: Number, default: 0 },     // ₹/g, only for sold items
  isCash:     { type: Boolean, default: false },
  cashAmt:    { type: Number, default: 0 },
  // for payment_inline lines — the user-friendly type (london bar, OldJewel, etc.)
  payType:    { type: String, default: '' },
  // calculated
  effectivePurityPct: { type: Number, default: 0 },
  pureContrib:        { type: Number, default: 0 },
  mcContrib:          { type: Number, default: 0 },
})

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  note:   { type: String, default: '' },
  date:   { type: Date,   default: Date.now },
})

const taxRowSchema = new mongoose.Schema({
  name: { type: String, required: true },
  pct:  { type: Number, required: true },
})

const billSchema = new mongoose.Schema(
  {
    // ── identity ─────────────────────────────────────────────
    billNumber:    { type: String, unique: true, index: true },     // auto-generated e.g. BILL-000123
    billType:      { type: String, enum: ['sale','purchase','client'], default: 'client' },
    //  client   — original ClientPage flow (existing client, eerettu items)
    //  sale     — Direct Billing: we sell to a (new/existing) customer
    //  purchase — Direct Billing: we buy from the customer

    // ── party info (always recorded) ─────────────────────────
    clientName:    { type: String, required: true, index: true },
    customerMobile:{ type: String, default: '' },

    silverRate:    { type: Number, default: 0 },
    items:         [billItemSchema],
    discountPure:  { type: Number, default: 0 },
    discountCash:  { type: Number, default: 0 },
    taxMode:       { type: Boolean, default: false },
    taxes:         [taxRowSchema],

    // ── totals (snapshotted at bill time) ────────────────────
    totals: {
      A:                    { type: Number, default: 0 }, // pure we give
      B:                    { type: Number, default: 0 }, // MC
      C:                    { type: Number, default: 0 }, // pure they give (via wallet+payment_inline)
      cashFromWallet:       { type: Number, default: 0 }, // cash they give
      netPure:              { type: Number, default: 0 },
      netCashBeforeDiscount:{ type: Number, default: 0 },
      netCashAfterDiscount: { type: Number, default: 0 },
      taxAmt:               { type: Number, default: 0 },
      finalCash:            { type: Number, default: 0 }, // >0 they owe us cash; <0 we owe them cash
      extraToWallet:        { type: Number, default: 0 }, // pure-gram surplus parked in client wallet
      extraCashOut:         { type: Number, default: 0 }, // cash we paid customer for surplus
    },

    payments:   [paymentSchema],
    paidAt:     { type: Date, default: null },
    status:     { type: String, enum: ['unpaid','paid'], default: 'unpaid' },

    // ── optional note & settlement mode ─────────────────────
    note: { type: String, default: '' },
    settlement: {
      mode:       { type: String, enum: ['cash','item'], default: 'cash' },
      type:       { type: String, default: '' },     // e.g. 'london bar'
      purity:     { type: Number, default: 0 },      // purity % used
      itemWeight: { type: Number, default: 0 },      // pre-calc grams
    },
  },
  { timestamps: true }
)

export default mongoose.model('Bill', billSchema)
