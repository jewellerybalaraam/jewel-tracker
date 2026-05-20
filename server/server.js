import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'

import authRoutes from './routes/authRoutes.js'
import clientRoutes from './routes/clientRoutes.js'
import inventoryRoutes from './routes/inventoryRoutes.js'
import transactionRoutes from './routes/transactionRoutes.js'

dotenv.config()

const app = express()

app.use(cors())

app.use(express.json({ limit: '50mb' }))

app.use(express.urlencoded({ extended: true, limit: '50mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/clients', clientRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/transactions', transactionRoutes)

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.log(err))

const PORT = process.env.PORT || 5000

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))