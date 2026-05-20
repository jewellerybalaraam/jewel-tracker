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
      required: true
    },

    productName: {
      type: String,
      required: true
    },

    subProductName: {
      type: String
    },

    purity: {
      type: Number,
      default: 92.5
    }
  },
  {
    timestamps: true
  }
)

export default mongoose.model('Product', productSchema)