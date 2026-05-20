import mongoose from 'mongoose'

const clientSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true },
    mobile:    { type: String, default: '' },      // was required: true
    whatsapp:  { type: String, default: '' },
    storeName: { type: String, default: '' },
    address:   { type: String, default: '' },
    gstNo:     { type: String, default: '' },
    notes:     { type: String, default: '' },
  },
  { timestamps: true }
)

export default mongoose.model('Client', clientSchema)