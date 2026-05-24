import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: Number,
      required: true,
      unique: true
    },

    prefix: {
      type: String,
      required: true        // e.g. "ABC" — appears in the barcode
    },

    productName: {
      type: String,
      required: true
    },

    subProductName: {
      type: String,
      default: ''
    },

    purity: {
      type: Number,
      default: 92.5
    },

    // Bulk / length-based goods (silver rope etc.) — not tagged per piece
    isBulk: {
      type: Boolean,
      default: false
    },

    unit: {
      type: String,
      default: 'pcs'        // "pcs" | "m" | "ft" | "inch" | "g"
    }
  },
  {
    timestamps: true
  }
)

productSchema.index({ productName: 'text', subProductName: 'text', prefix: 'text' })

export default mongoose.model('Product', productSchema)
