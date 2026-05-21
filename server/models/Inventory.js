import mongoose from 'mongoose'

const inventorySchema = new mongoose.Schema(
  {
    // ── Tagging metadata ──────────────────────────────────────
    recordDate: {
      type:    Date,
      default: null          // RECDATE — date the item was tagged
    },

    recordTime: {
      type:    String,
      default: ''            // TIME — e.g. "4:20AM"
    },

    // ── Item identity ─────────────────────────────────────────
    barcode: {
      type:     String,
      required: true,
      unique:   true,
      index:    true         // ITEMTAG — the physical tag barcode
    },

    productId: {
      type:     Number,
      required: true         // PROID — numeric product category code
    },

    productName: {
      type:    String,
      default: ''            // PRODUCTNAME
    },

    subProductName: {
      type:    String,
      default: ''            // SUBPRODUCTNAME
    },

    // ── Weight & size ─────────────────────────────────────────
    netWt: {
      type:    Number,
      default: 0             // NETWT — net weight in grams
    },

    size: {
      type:    String,
      default: ''            // SIZE — optional (ring size etc.)
    },

    // ── Pricing ───────────────────────────────────────────────
    makingCharge: {
      type:    Number,
      default: 0             // MC — making charge per gram
    },

    pureRate: {
      type:    Number,
      default: 0             // PURERATE
    },

    purity: {
      type:    String,
      default: ''            // TAGTYPE — e.g. "SLM", "95", "92.5", "65", "99"
    },

    // ── Stock status ──────────────────────────────────────────
    status: {
      type:    String,
      enum:    ['AVAILABLE', 'SOLD'],
      default: 'AVAILABLE'
    }
  },
  { timestamps: true }
)

export default mongoose.model('Inventory', inventorySchema)