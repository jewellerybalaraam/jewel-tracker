import mongoose from 'mongoose'

// Generic atomic counter used to mint unique sequential numbers
// (e.g. bill numbers). Each counter is identified by a string `key`.
const counterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  seq: { type: Number, default: 0 },
})

counterSchema.statics.next = async function (key) {
  const doc = await this.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )
  return doc.seq
}

export default mongoose.model('Counter', counterSchema)
