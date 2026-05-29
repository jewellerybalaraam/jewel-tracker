import XLSX from 'xlsx'
import fs   from 'fs'
import Inventory from '../models/Inventory.js'
import Lot from '../models/Lot.js'
import Eerettu from '../models/Eerettu.js'


// ── helpers ────────────────────────────────────────────────────────────────

// SIZE cells are sometimes stored as Excel date serials by accident.
// Return an empty string for those; otherwise stringify the value.
const parseSize = (raw) => {
  if (raw === undefined || raw === null || raw === '') return ''
  if (raw instanceof Date) return ''
  const s = String(raw).trim()
  if (/^\d{5,}$/.test(s)) return ''
  return s
}

// RECDATE comes in as a JS Date (cellDates: true).  Normalise to midnight UTC.
const parseDate = (raw) => {
  if (!raw) return null
  if (raw instanceof Date && !isNaN(raw)) return raw
  const d = new Date(raw)
  return isNaN(d) ? null : d
}

const recomputeLotProgress = async (lotNumber) => {
  if (!lotNumber) return
  const lot = await Lot.findOne({ lotNumber })
  if (!lot) return
  const items = await Inventory.find({ lotNumber })
  for (const p of lot.products) {
    const matched = items.filter(i => i.productKey === p.productKey)
    p.itemsAddedCount  = matched.length
    p.itemsAddedWeight = Number(matched.reduce((s, i) => s + (i.netWt || 0), 0).toFixed(3))
  }
  await lot.save()
}


// =====================================
// UPLOAD INVENTORY EXCEL
// =====================================

export const uploadInventory = async (req, res) => {

  try {

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is required'
      })
    }

    const workbook = XLSX.readFile(req.file.path, { cellDates: true })

    const sheetName = workbook.SheetNames[0]

    const rows = XLSX.utils.sheet_to_json(
      workbook.Sheets[sheetName],
      { range: 2, defval: '' }
    )

    let insertedCount = 0
    let skippedCount  = 0

    for (const row of rows) {

      const barcode = String(row['ITEMTAG'] || '').trim()

      if (!barcode || barcode === 'ITEMTAG') { skippedCount++; continue }

      const exists = await Inventory.findOne({ barcode })
      if (exists) { skippedCount++; continue }

      await Inventory.create({
        recordDate:     parseDate(row['RECDATE']),
        recordTime:     String(row['TIME']          || '').trim(),
        barcode,
        productId:      Number(row['PROID'])         || 0,
        productName:    String(row['PRODUCTNAME']    || '').trim(),
        subProductName: String(row['SUBPRODUCTNAME'] || '').trim(),
        netWt:          parseFloat(row['NETWT'])     || 0,
        size:           parseSize(row['SIZE']),
        makingCharge:   parseFloat(row['MC'])        || 0,
        pureRate:       parseFloat(row['PURE RATE']) || 0,
        purity:         String(row['TAG TYPE']       || '').trim(),
        status:         'AVAILABLE'
      })

      insertedCount++
    }

    try { fs.unlinkSync(req.file.path) } catch (_) {}

    res.status(200).json({
      success: true,
      insertedCount,
      skippedCount,
      message: 'Inventory uploaded successfully'
    })

  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: error.message })
  }
}


// =====================================
// GET INVENTORY BY BARCODE
// =====================================

export const getInventoryByBarcode = async (req, res) => {

  try {

    const { barcode } = req.params

    const item = await Inventory.findOne({ barcode, status: 'AVAILABLE' })

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' })
    }

    res.status(200).json({
      success: true,
      data: {
        _id:            item._id,
        barcode:        item.barcode,
        recordDate:     item.recordDate,
        recordTime:     item.recordTime,
        productId:      item.productId,
        productName:    item.productName,
        subProductName: item.subProductName,
        netWt:          item.netWt,
        size:           item.size,
        makingCharge:   item.makingCharge,
        pureRate:       item.pureRate,
        purity:         item.purity,
        status:         item.status,
        lotNumber:      item.lotNumber,
        prefix:         item.prefix,
        serialNo:       item.serialNo,
        supplierName:   item.supplierName,
      }
    })

  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// =====================================
// LIST INVENTORY by LOT
// =====================================

export const listInventoryByLot = async (req, res) => {
  try {
    const lotNumber = Number(req.params.lotNumber)
    const items = await Inventory.find({ lotNumber }).sort({ prefix: 1, serialNo: 1 })
    res.json({ success: true, data: items })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// =====================================
// UPDATE one inventory item (reversible edit)
// =====================================

export const updateInventoryItem = async (req, res) => {
  try {
    const id = req.params.id
    const allowed = ['netWt','size','purity','makingCharge','pureRate','productName','subProductName','status']
    const updates = {}
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k]
    }
    const before = await Inventory.findById(id)
    if (!before) return res.status(404).json({ success: false, message: 'Item not found' })

    const updated = await Inventory.findByIdAndUpdate(id, updates, { new: true })
    await recomputeLotProgress(updated.lotNumber)

    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// =====================================
// DELETE one inventory item (reversible)
// =====================================

export const deleteInventoryItem = async (req, res) => {
  try {
    const id = req.params.id
    const item = await Inventory.findById(id)
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' })
    const lotNumber = item.lotNumber
    await Inventory.findByIdAndDelete(id)
    await recomputeLotProgress(lotNumber)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// =====================================
// SEARCH INVENTORY — returns AVAILABLE + SOLD with client info
// =====================================
export const searchInventory = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    if (!q) return res.json({ success: true, data: [] })

    const items = await Inventory.find({
      $or: [
        { barcode:        { $regex: q, $options: 'i' } },
        { productName:    { $regex: q, $options: 'i' } },
        { subProductName: { $regex: q, $options: 'i' } },
      ],
    }).limit(40).lean()

    // For SOLD items, find which client (if any) they're recorded under in eerettu
    const soldBarcodes = items.filter(i => i.status === 'SOLD').map(i => i.barcode)
    const eerettusWithSold = soldBarcodes.length
      ? await Eerettu.find(
          { 'items.barcode': { $in: soldBarcodes }, 'items.status': 'SOLD' }
        ).select('clientName items').lean()
      : []

    const clientMap = {}
    for (const e of eerettusWithSold) {
      for (const it of e.items || []) {
        if (it.status === 'SOLD' && soldBarcodes.includes(it.barcode)) {
          clientMap[it.barcode] = e.clientName
        }
      }
    }

    const data = items.map(i => ({
      _id:            i._id,
      barcode:        i.barcode,
      productName:    i.productName,
      subProductName: i.subProductName,
      netWt:          i.netWt,
      size:           i.size,
      purity:         i.purity,
      makingCharge:   i.makingCharge,
      status:         i.status,
      soldToClient:   clientMap[i.barcode] || null,
    }))

    res.json({ success: true, data })
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: error.message })
  }
}