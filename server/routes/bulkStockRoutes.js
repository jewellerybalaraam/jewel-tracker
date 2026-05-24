import express from 'express'
import {
  listBulkStock, getBulkStock, upsertBulkStock,
  addBulkTransaction, deleteBulkTransaction, deleteBulkStock,
} from '../controllers/bulkStockController.js'

const router = express.Router()

router.get('/',                            listBulkStock)
router.get('/:id',                         getBulkStock)
router.post('/',                           upsertBulkStock)
router.post('/:id/transactions',           addBulkTransaction)
router.delete('/:id/transactions/:txnId',  deleteBulkTransaction)
router.delete('/:id',                      deleteBulkStock)

export default router
