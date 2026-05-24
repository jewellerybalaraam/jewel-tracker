import Product from '../models/Product.js'

// GET /api/products?q=...&field=productName
export const searchProducts = async (req, res) => {
  try {
    const q     = (req.query.q     || '').trim()
    const field = (req.query.field || 'productName').trim()

    const allowedFields = ['productName', 'subProductName', 'prefix']
    const f = allowedFields.includes(field) ? field : 'productName'

    const filter = q ? { [f]: { $regex: q, $options: 'i' } } : {}
    const list = await Product.find(filter).limit(20).sort({ [f]: 1 })

    // de-dup on the chosen field so we don't show identical names
    const seen = new Set()
    const data = []
    for (const p of list) {
      const v = (p[f] || '').toLowerCase()
      if (seen.has(v)) continue
      seen.add(v)
      data.push(p)
    }

    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/products
export const listProducts = async (_req, res) => {
  try {
    const list = await Product.find({}).sort({ productName: 1 })
    res.json({ success: true, data: list })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// POST /api/products
export const createProduct = async (req, res) => {
  try {
    const { prefix, productName, subProductName, purity, isBulk, unit } = req.body

    if (!productName || !prefix) {
      return res.status(400).json({ success: false, message: 'productName & prefix required' })
    }

    // re-use product if name+sub already exists
    const existing = await Product.findOne({
      productName: productName.trim(),
      subProductName: (subProductName || '').trim(),
    })
    if (existing) return res.json({ success: true, data: existing, message: 'exists' })

    // auto productId = max + 1
    const last = await Product.findOne({}).sort({ productId: -1 })
    const nextId = (last?.productId || 100) + 1

    const created = await Product.create({
      productId:      nextId,
      prefix:         prefix.trim().toUpperCase(),
      productName:    productName.trim(),
      subProductName: (subProductName || '').trim(),
      purity:         Number(purity) || 92.5,
      isBulk:         !!isBulk,
      unit:           unit || (isBulk ? 'm' : 'pcs'),
    })

    res.json({ success: true, data: created })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// PUT /api/products/:id
export const updateProduct = async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true })
    res.json({ success: true, data: updated })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// DELETE /api/products/:id
export const deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
