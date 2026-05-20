import express from 'express'
import { createClient, getClients, updateClient } from '../controllers/clientController.js'

const router = express.Router()

router.get('/',             getClients)
router.post('/',            createClient)
router.patch('/:clientId',  updateClient)

export default router