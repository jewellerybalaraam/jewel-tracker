import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'

import authRoutes      from './routes/authRoutes.js'
import clientRoutes    from './routes/clientRoutes.js'
import inventoryRoutes from './routes/inventoryRoutes.js'
import eerettuRoutes   from './routes/eerettuRoutes.js'
import walletRoutes    from './routes/walletRoutes.js'
import billRoutes      from './routes/billRoutes.js'

import lotRoutes       from './routes/lotRoutes.js'
import supplierRoutes  from './routes/supplierRoutes.js'
import productRoutes   from './routes/productRoutes.js'
import bulkStockRoutes from './routes/bulkStockRoutes.js'
import draftRoutes     from './routes/draftRoutes.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

app.use('/api/auth',       authRoutes)
app.use('/api/clients',    clientRoutes)
app.use('/api/inventory',  inventoryRoutes)
app.use('/api/eerettu',    eerettuRoutes)
app.use('/api/wallet',     walletRoutes)
app.use('/api/bills',      billRoutes)

// ── Inventory Entry feature ──────────────────────────────
app.use('/api/lots',         lotRoutes)
app.use('/api/suppliers',    supplierRoutes)
app.use('/api/products',     productRoutes)
app.use('/api/bulk-stock',   bulkStockRoutes)
app.use('/api/drafts',       draftRoutes)

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err))

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
