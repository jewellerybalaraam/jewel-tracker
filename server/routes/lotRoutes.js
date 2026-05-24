import express from 'express'
import {
  getNextLotNumber, listLots, getLot, createLot,
  updateLot, deleteLot, addItemToLotProduct,
  getLotSummary, markProductCompleted, finalizeLot,
} from '../controllers/lotController.js'

const router = express.Router()

router.get('/next-number',                 getNextLotNumber)
router.get('/',                            listLots)
router.get('/:lotNumber',                  getLot)
router.get('/:lotNumber/summary',          getLotSummary)
router.post('/',                           createLot)
router.put('/:lotNumber',                  updateLot)
router.delete('/:lotNumber',               deleteLot)
router.post('/:lotNumber/finalize',        finalizeLot)
router.post('/:lotNumber/products/:productKey/items',     addItemToLotProduct)
router.post('/:lotNumber/products/:productKey/complete',  markProductCompleted)

export default router
