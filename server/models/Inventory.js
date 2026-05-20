import mongoose from 'mongoose'

const inventorySchema = new mongoose.Schema(
  {
    barcode: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    lotNo: {
      type: Number,
      required: true
    },

    tagNo: {
      type: Number,
      required: true
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },

    supplier: {
      type: String
    },

    grossWeight: {
      type: Number,
      required: true
    },

    netWeight: {
      type: Number,
      required: true
    },

    boardRate: {
      type: Number,
      default: 0
    },

    mcPerGram: {
      type: Number,
      default: 0
    },

    mcAmount: {
      type: Number,
      default: 0
    },

    salePrice: {
      type: Number,
      default: 0
    },

    size: {
      type: String,
      default: ''
    },

    status: {
      type: String,
      enum: ['AVAILABLE', 'SOLD'],
      default: 'AVAILABLE'
    }
  },
  {
    timestamps: true
  }
)

export default mongoose.model('Inventory', inventorySchema)