import mongoose from 'mongoose'

const supplierSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true, unique: true, trim: true },
    phone:   { type: String, default: '' },
    address: { type: String, default: '' },
    gst:     { type: String, default: '' },
    notes:   { type: String, default: '' },
  },
  { timestamps: true }
)

supplierSchema.index({ name: 'text' })

export default mongoose.model('Supplier', supplierSchema)
