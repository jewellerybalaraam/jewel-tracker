import express from 'express'
import {
  searchSuppliers, listSuppliers, createSupplier,
  updateSupplier, deleteSupplier,
} from '../controllers/supplierController.js'

const router = express.Router()

router.get('/',         searchSuppliers)   // ?q=...
router.get('/all',      listSuppliers)
router.post('/',        createSupplier)
router.put('/:id',      updateSupplier)
router.delete('/:id',   deleteSupplier)

export default router
