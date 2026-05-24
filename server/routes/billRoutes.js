import express from 'express'
import {
  createBill, getBillsByClient, getAllBills,
  addPayment, deletePayment, deleteBill,
} from '../controllers/billController.js'

const router = express.Router()
router.get('/',                           getAllBills)
router.get('/by-client/:clientName',      getBillsByClient)
router.post('/',                          createBill)
router.post('/:id/payments',              addPayment)
router.delete('/:id/payments/:paymentId', deletePayment)
router.delete('/:id',                     deleteBill)
export default router
