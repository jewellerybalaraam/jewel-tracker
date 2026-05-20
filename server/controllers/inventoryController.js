import XLSX from 'xlsx'
import fs from 'fs'
import Inventory from '../models/Inventory.js'
import Product from '../models/Product.js'


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

    const workbook = XLSX.readFile(req.file.path)

    const sheetName = workbook.SheetNames[0]

    // range: 2 → skip rows 1 & 2 (empty), use row 3 as headers
    const rows = XLSX.utils.sheet_to_json(
      workbook.Sheets[sheetName],
      { range: 2, defval: '' }
    )

    let insertedCount = 0

    for (const row of rows) {

      const lotNo    = row['Lot No']
      const tagNo    = row['Tag No']
      const proCode  = row['Product Code']
      const prodName = row['Product Name']
      const subProd  = row['Sub Product']
      const desName  = row['Des Name']
      const grsWt    = row['Grs Wt']
      const netWt    = row['Net Wt']
      const boardRate = row['Board Rate']
      const mcGr     = row['Mc Gr']
      const mcAmnt   = row['Mc Amnt']
      const selPrice = row['Sel Price']

      // Skip rows without a tag number or product code (category header rows)
      if (!tagNo || !proCode) continue

      // Derive prefix from Tag No — strip trailing digits
      // e.g. 'KILI1' → 'KILI', 'STUD12' → 'STUD', 'LDK6' → 'LDK'
      const prefix = String(tagNo).replace(/\d+$/, '') || 'PRD'

      // Barcode = LotNo + TagNo  e.g. '0KILI1', '10STUD3'
      const barcode = `${lotNo}${tagNo}`

      // Skip duplicates
      const existing = await Inventory.findOne({ barcode })
      if (existing) continue

      // Find or create Product
      let product = await Product.findOne({ productId: proCode })

      if (!product) {
        product = await Product.create({
          productId:      proCode,
          prefix,
          productName:    prodName  || '',
          subProductName: subProd   || '',
          purity:         92.5
        })
      }

      // Create Inventory item
      await Inventory.create({
        barcode,
        lotNo:      Number(lotNo)    || 0,
        tagNo:      String(tagNo)    || '',
        productId:  product._id,
        supplier:   desName          || '',
        grossWeight: Number(grsWt)   || 0,
        netWeight:   Number(netWt)   || 0,
        boardRate:   Number(boardRate) || 0,
        mcPerGram:   Number(mcGr)    || 0,
        mcAmount:    Number(mcAmnt)  || 0,
        salePrice:   Number(selPrice) || 0,
        size:        '',
        status:      'AVAILABLE'
      })

      insertedCount++
    }

    try { fs.unlinkSync(req.file.path) } catch (_) {}

    res.status(200).json({
      success: true,
      insertedCount,
      message: 'Inventory uploaded successfully'
    })

  } catch (error) {
    console.log(error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}


// =====================================
// GET INVENTORY BY BARCODE
// =====================================

export const getInventoryByBarcode = async (req, res) => {

  try {

    const { barcode } = req.params

    const item = await Inventory.findOne({
      barcode,
      status: 'AVAILABLE'
    }).populate('productId')

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      })
    }

    res.status(200).json({
      success: true,
      data: {
        _id:            item._id,
        barcode:        item.barcode,
        productName:    item.productId.productName,
        subProductName: item.productId.subProductName,
        grossWeight:    item.grossWeight,
        netWeight:      item.netWeight,
        size:           item.size,
        salePrice:      item.salePrice,
        boardRate:      item.boardRate
      }
    })

  } catch (error) {
    console.log(error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}