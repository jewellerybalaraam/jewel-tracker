// server/controllers/inventoryController.js

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

    const rows = XLSX.utils.sheet_to_json(
      workbook.Sheets[sheetName]
    )

    let insertedCount = 0

    for (const row of rows) {

      // SKIP INVALID ROWS
      if (!row.PROID) continue

      // PRODUCT PREFIX
      const prefix =
        row.PREFIX ||
        row.PREFIXNAME ||
        'PRD'

      // FIND PRODUCT
      let product = await Product.findOne({
        productId: row.PROID
      })

      // CREATE PRODUCT IF NOT EXISTS
      if (!product) {

        product = await Product.create({
          productId: row.PROID,

          prefix,

          productName: row.PRODUCTNAME || '',

          subProductName:
            row.SUBPRODUCTNAME || '',

          purity: 92.5
        })
      }

      // BARCODE
      const barcode =
        `${row.LOTNO}${prefix}${row.TAGNO}`

      // CHECK DUPLICATE
      const existing = await Inventory.findOne({
        barcode
      })

      if (existing) {
        continue
      }

      // CREATE INVENTORY
      await Inventory.create({

        barcode,

        lotNo: row.LOTNO || 0,

        tagNo: row.TAGNO || 0,

        productId: product._id,

        supplier: row.DESNAME || '',

        grossWeight: row.GRSWT || 0,

        netWeight: row.NETWT || 0,

        boardRate: row.BOARDRATE || 0,

        mcPerGram: row.MCGR || 0,

        mcAmount: row.MCAMNT || 0,

        salePrice: row.SELPRICE || 0,

        size: row.SIZE || '',

        status: 'AVAILABLE'
      })

      insertedCount++
    }
    fs.unlinkSync(req.file.path)

    res.status(200).json({
      success: true,

      insertedCount,

      message:
        'Inventory uploaded successfully'
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
// GET INVENTORY USING BARCODE
// =====================================

export const getInventoryByBarcode =
  async (req, res) => {

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

          _id: item._id,

          barcode: item.barcode,

          productName:
            item.productId.productName,

          subProductName:
            item.productId.subProductName,

          grossWeight:
            item.grossWeight,

          netWeight:
            item.netWeight,

          size:
            item.size,

          salePrice:
            item.salePrice,

          boardRate:
            item.boardRate
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