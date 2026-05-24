import express from 'express'
import {
  searchProducts, listProducts, createProduct,
  updateProduct, deleteProduct,
} from '../controllers/productController.js'

const router = express.Router()

router.get('/search',  searchProducts)    // ?q=...&field=productName
router.get('/',        listProducts)
router.post('/',       createProduct)
router.put('/:id',     updateProduct)
router.delete('/:id',  deleteProduct)

export default router
