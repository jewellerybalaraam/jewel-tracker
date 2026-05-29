// server/routes/inventoryRoutes.js

import express from 'express'

import upload from '../middleware/upload.js'

import {
  uploadInventory,
  getInventoryByBarcode,
  listInventoryByLot,
  updateInventoryItem,
  deleteInventoryItem,
  searchInventory,
} from '../controllers/inventoryController.js'

const router = express.Router()

// search
router.get('/search', searchInventory)

// upload excel
router.post('/upload', upload.single('file'), uploadInventory)

// get by barcode
router.get('/barcode/:barcode', getInventoryByBarcode)

// list by LOT
router.get('/by-lot/:lotNumber', listInventoryByLot)

// edit / delete single item (reversible)
router.put('/:id',    updateInventoryItem)
router.delete('/:id', deleteInventoryItem)

export default router