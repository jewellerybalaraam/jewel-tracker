import express from 'express'
import {
  createTransaction,
  getTransactions,
  updateItemStatus,
  getTransactionsByBarcode,
  getTransactionsByCustomer,
} from '../controllers/transactionController.js'

const router = express.Router()

router.get('/', getTransactions)
router.get('/barcode/:barcode', getTransactionsByBarcode)
router.get('/customer/:customerName', getTransactionsByCustomer)
router.post('/', createTransaction)
router.put('/:transactionId', updateItemStatus)

export default router