import XLSX from 'xlsx'
import fs   from 'fs'
import Inventory from '../models/Inventory.js'


// ── helpers ────────────────────────────────────────────────────────────────

// SIZE cells are sometimes stored as Excel date serials by accident.
// Return an empty string for those; otherwise stringify the value.
const parseSize = (raw) => {
  if (raw === undefined || raw === null || raw === '') return ''
  if (raw instanceof Date) return ''
  const s = String(raw).trim()
  // xlsx serial dates land here as numbers when cellDates:false — skip them
  // if the value looks like a large integer (Excel date serial > 40000)
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

    // range: 2 → row index 2 is the header row
    // (rows 0–1 are blank; row 2 = RECDATE TIME ITEMTAG PROID …)
    const rows = XLSX.utils.sheet_to_json(
      workbook.Sheets[sheetName],
      { range: 2, defval: '' }
    )

    let insertedCount = 0
    let skippedCount  = 0

    for (const row of rows) {

      const barcode = String(row['ITEMTAG'] || '').trim()

      // Skip header-echo rows or empty rows
      if (!barcode || barcode === 'ITEMTAG') { skippedCount++; continue }

      // Skip duplicates
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
        status:         item.status
      }
    })

  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: error.message })
  }
}