import InventoryDraft from '../models/InventoryDraft.js'

// GET /api/drafts/inventory-entry?ownerKey=...
export const getDraft = async (req, res) => {
  try {
    const ownerKey = (req.query.ownerKey || '').trim()
    if (!ownerKey) return res.status(400).json({ success: false, message: 'ownerKey required' })
    const draft = await InventoryDraft.findOne({ ownerKey })
    res.json({ success: true, data: draft || null })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// PUT /api/drafts/inventory-entry
// body: { ownerKey, step, lotNumber, formData, activeProductKey }
export const upsertDraft = async (req, res) => {
  try {
    const { ownerKey, step, lotNumber, formData, activeProductKey } = req.body
    if (!ownerKey) return res.status(400).json({ success: false, message: 'ownerKey required' })

    const draft = await InventoryDraft.findOneAndUpdate(
      { ownerKey },
      {
        ownerKey,
        step:             step       ?? 1,
        lotNumber:        lotNumber  ?? null,
        formData:         formData   ?? {},
        activeProductKey: activeProductKey ?? '',
      },
      { upsert: true, new: true }
    )
    res.json({ success: true, data: draft })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// DELETE /api/drafts/inventory-entry?ownerKey=...
export const clearDraft = async (req, res) => {
  try {
    const ownerKey = (req.query.ownerKey || '').trim()
    if (!ownerKey) return res.status(400).json({ success: false, message: 'ownerKey required' })
    await InventoryDraft.deleteOne({ ownerKey })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
