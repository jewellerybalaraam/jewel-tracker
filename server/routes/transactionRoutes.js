import express from 'express'
import {
  createTransaction,
  getTransactions,
  updateTransaction,
  updateItemStatus,
  getTransactionsByBarcode,
  getTransactionsByCustomer,
} from '../controllers/transactionController.js'

const router = express.Router()

router.get('/',                          getTransactions)
router.get('/barcode/:barcode',          getTransactionsByBarcode)
router.get('/customer/:customerName',    getTransactionsByCustomer)
router.post('/',                         createTransaction)
router.patch('/:transactionId',          updateTransaction)      // edit date/name
router.put('/:transactionId',            updateItemStatus)       // edit item status

export default router