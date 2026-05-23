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
router.get('/clients', async (req, res) => {
  try {
    const clients = await Transaction.distinct('clientName')

    const formatted = clients.map((name, index) => ({
      _id: index,
      clientName: name,
      phone: ''
    }))

    res.json(formatted)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
router.patch('/:clientName/add-mobile',   addMobile)
router.patch('/:clientName/remove-mobile', removeMobile)
router.patch('/:clientName',              updateClient)

export default router