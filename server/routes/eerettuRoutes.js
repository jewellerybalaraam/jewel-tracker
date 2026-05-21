import express from 'express'
import {
  createEerettu,
  getEerettus,
  getTodayEerettus,
  updateDate,
  updateItemStatus,
  updateWtStatus,
} from '../controllers/eerettuController.js'

const router = express.Router()

router.get('/',         getEerettus)
router.get('/today',    getTodayEerettus)
router.post('/',        createEerettu)
router.patch('/:id/date', updateDate)
router.patch('/:id/item', updateItemStatus)
router.patch('/:id/wt',   updateWtStatus)

export default router