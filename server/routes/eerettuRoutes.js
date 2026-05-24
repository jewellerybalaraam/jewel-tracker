import express from 'express'
import {
  createEerettu,
  getEerettus,
  getTodayEerettus,
  updateDate,
  updateItemStatus,
  updateWtStatus,
  bulkUpdateStatus,
  getPendingClientsList,
  getSoldClientsList,
  getByClient,
} from '../controllers/eerettuController.js'

const router = express.Router()

router.get('/',                      getEerettus)
router.get('/today',                 getTodayEerettus)
router.get('/pending-clients',       getPendingClientsList)
router.get('/sold-clients',          getSoldClientsList)
router.get('/by-client/:clientName', getByClient)
router.post('/',                     createEerettu)
router.post('/bulk-status',          bulkUpdateStatus)
router.patch('/:id/date',            updateDate)
router.patch('/:id/item',            updateItemStatus)
router.patch('/:id/wt',              updateWtStatus)

export default router
