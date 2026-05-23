import express from 'express'
import {
  createClient,
  getClients,
  addMobile,
  removeMobile,
  updateClient,
} from '../controllers/clientController.js'

const router = express.Router()

router.get('/',                           getClients)
router.post('/',                          createClient)
// NOTE: kept only the main GET '/' for clients.
// (A previous '/clients' route referenced Transaction without importing it and returned wrong fields.)

router.patch('/:clientName/add-mobile',   addMobile)
router.patch('/:clientName/remove-mobile', removeMobile)
router.patch('/:clientName',              updateClient)

export default router