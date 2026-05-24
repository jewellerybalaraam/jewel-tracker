import Supplier from '../models/Supplier.js'

// GET /api/suppliers?q=...
export const searchSuppliers = async (req, res) => {
  try {
    const q = (req.query.q || '').trim()
    const filter = q
      ? { name: { $regex: q, $options: 'i' } }
      : {}
    const list = await Supplier.find(filter).limit(20).sort({ name: 1 })
    res.json({ success: true, data: list })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/suppliers/all
export const listSuppliers = async (_req, res) => {
  try {
    const list = await Supplier.find({}).sort({ name: 1 })
    res.json({ success: true, data: list })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// POST /api/suppliers
export const createSupplier = async (req, res) => {
  try {
    const { name, phone, address, gst, notes } = req.body
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Supplier name required' })
    }
    const existing = await Supplier.findOne({ name: name.trim() })
    if (existing) return res.json({ success: true, data: existing, message: 'exists' })

    const sup = await Supplier.create({
      name: name.trim(),
      phone: phone || '',
      address: address || '',
      gst: gst || '',
      notes: notes || '',
    })
    res.json({ success: true, data: sup })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// PUT /api/suppliers/:id
export const updateSupplier = async (req, res) => {
  try {
    const updated = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true })
    res.json({ success: true, data: updated })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// DELETE /api/suppliers/:id
export const deleteSupplier = async (req, res) => {
  try {
    await Supplier.findByIdAndDelete(req.params.id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
