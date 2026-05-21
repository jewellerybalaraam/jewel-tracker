import mongoose from 'mongoose'

const clientSchema = new mongoose.Schema(
  {
    clientName: { type: String, required: true, unique: true },
    mobiles:    [{ type: String }],   // optional, can have multiple
  },
  { timestamps: true }
)

export default mongoose.model('Client', clientSchema)