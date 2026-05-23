import express from 'express'
import {
  createBill, getBillsByClient,
  addPayment, deletePayment, deleteBill,
} from '../controllers/billController.js'

const router = express.Router()
router.get('/by-client/:clientName', getBillsByClient)
router.post('/',                     createBill)
router.post('/:id/payments',         addPayment)
router.delete('/:id/payments/:paymentId', deletePayment)
router.delete('/:id',                deleteBill)
export default router
