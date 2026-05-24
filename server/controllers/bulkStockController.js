import BulkStock from '../models/BulkStock.js'

// GET /api/bulk-stock
export const listBulkStock = async (_req, res) => {
  try {
    const list = await BulkStock.find({}).sort({ productName: 1 })
    res.json({ success: true, data: list })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/bulk-stock/:id
export const getBulkStock = async (req, res) => {
  try {
    const s = await BulkStock.findById(req.params.id)
    if (!s) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, data: s })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// POST /api/bulk-stock  — create or upsert a bulk product entry
export const upsertBulkStock = async (req, res) => {
  try {
    const { productName, subProductName, purity, unit } = req.body
    if (!productName) return res.status(400).json({ success:false, message:'productName required' })
    const found = await BulkStock.findOneAndUpdate(
      { productName, subProductName: subProductName || '', purity: purity || '' },
      { $setOnInsert: { productName, subProductName: subProductName || '', purity: purity || '', unit: unit || 'm' } },
      { new: true, upsert: true }
    )
    res.json({ success:true, data: found })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// POST /api/bulk-stock/:id/transactions  — record IN/OUT/ADJUST
// body: { type, quantity, unit?, lotNumber?, supplierName?, clientName?, note? }
export const addBulkTransaction = async (req, res) => {
  try {
    const s = await BulkStock.findById(req.params.id)
    if (!s) return res.status(404).json({ success: false, message: 'Not found' })

    const { type, quantity, unit, lotNumber, supplierName, clientName, note } = req.body
    if (!['IN','OUT','ADJUST'].includes(type)) {
      return res.status(400).json({ success:false, message:'type must be IN/OUT/ADJUST' })
    }
    const qty = Number(quantity)
    if (isNaN(qty) || qty === 0) {
      return res.status(400).json({ success:false, message:'quantity must be non-zero number' })
    }

    s.transactions.push({
      type,
      quantity: type === 'ADJUST' ? qty : Math.abs(qty),
      unit:     unit || s.unit,
      lotNumber: lotNumber || null,
      supplierName: supplierName || '',
      clientName:   clientName   || '',
      note:         note         || '',
    })

    if (type === 'IN')  s.totalIn  += Math.abs(qty)
    if (type === 'OUT') s.totalOut += Math.abs(qty)
    if (type === 'ADJUST') {
      if (qty > 0) s.totalIn  += qty
      else         s.totalOut += -qty
    }
    s.balance = s.totalIn - s.totalOut
    await s.save()
    res.json({ success: true, data: s })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// DELETE /api/bulk-stock/:id/transactions/:txnId  — reverse a transaction
export const deleteBulkTransaction = async (req, res) => {
  try {
    const s = await BulkStock.findById(req.params.id)
    if (!s) return res.status(404).json({ success: false, message: 'Not found' })

    const txn = s.transactions.id(req.params.txnId)
    if (!txn) return res.status(404).json({ success: false, message: 'Transaction not found' })

    if (txn.type === 'IN')  s.totalIn  -= txn.quantity
    if (txn.type === 'OUT') s.totalOut -= txn.quantity
    if (txn.type === 'ADJUST') {
      if (txn.quantity > 0) s.totalIn  -= txn.quantity
      else                  s.totalOut -= -txn.quantity
    }
    txn.deleteOne()
    s.balance = s.totalIn - s.totalOut
    await s.save()
    res.json({ success: true, data: s })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// DELETE /api/bulk-stock/:id
export const deleteBulkStock = async (req, res) => {
  try {
    await BulkStock.findByIdAndDelete(req.params.id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
