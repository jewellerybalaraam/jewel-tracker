// server/routes/inventoryRoutes.js

import express from 'express'

import upload from '../middleware/upload.js'

import {
  uploadInventory,
  getInventoryByBarcode
} from '../controllers/inventoryController.js'

const router = express.Router()


// =====================================
// UPLOAD INVENTORY EXCEL
// =====================================

router.post(
  '/upload',
  upload.single('file'),
  uploadInventory
)


// =====================================
// GET INVENTORY USING BARCODE
// =====================================

router.get(
  '/barcode/:barcode',
  getInventoryByBarcode
)


export default router