import mongoose from 'mongoose'

/*
  A LOT is a batch of goods received from one or more suppliers.
  A LOT contains many "LotProducts" — each LotProduct is a bulk
  line (supplier + product + sub-product + qty + total wt + purity).

  Individual tagged items (with barcodes) live in the Inventory
  collection and link back here via `lotNumber` + `productKey`.
*/

const lotProductSchema = new mongoose.Schema(
  {
    // a stable identifier inside the lot — used by step 2 to attach items
    productKey:     { type: String, required: true },

    // supplier link
    supplierName:   { type: String, default: '' },
    supplierId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },

    // product master link
    productId:      { type: Number,  default: 0 },   // numeric code from Product master
    prefix:         { type: String,  default: '' },  // e.g. "ABC"
    productName:    { type: String,  required: true },
    subProductName: { type: String,  default: '' },

    // bulk metrics declared at LOT entry
    quantity:       { type: Number,  default: 0 },   // expected number of items
    totalWeight:    { type: Number,  default: 0 },   // expected total wt (grams)
    purity:         { type: String,  default: '' },  // e.g. "92.5", "SLM", "99"

    // non-tagged / length-based goods (silver rope etc.)
    isBulk:         { type: Boolean, default: false },
    bulkLength:     { type: Number,  default: 0 },   // length received (e.g. meters)
    bulkUnit:       { type: String,  default: 'm' }, // m / ft / inch / g

    // progress
    itemsAddedCount:  { type: Number, default: 0 },
    itemsAddedWeight: { type: Number, default: 0 },
    completed:        { type: Boolean, default: false },
  },
  { _id: false }
)

const lotSchema = new mongoose.Schema(
  {
    lotNumber: {
      type:     Number,
      required: true,
      unique:   true,
      index:    true,
    },

    status: {
      type:    String,
      enum:    ['draft', 'open', 'finalized'],
      default: 'open',
    },

    receivedDate: { type: Date, default: () => new Date() },

    notes: { type: String, default: '' },

    products: [lotProductSchema],

    createdBy: { type: String, default: '' },
  },
  { timestamps: true }
)

export default mongoose.model('Lot', lotSchema)
