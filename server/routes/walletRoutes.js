import express from 'express'
import {
  createWalletEntry,
  getWalletByClient,
  updateWalletEntry,
  deleteWalletEntry,
} from '../controllers/walletController.js'

const router = express.Router()

router.get('/by-client/:clientName', getWalletByClient)
router.post('/',                     createWalletEntry)
router.patch('/:id',                 updateWalletEntry)
router.delete('/:id',                deleteWalletEntry)

export default router
