import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'

import inventoryRoutes from './routes/inventoryRoutes.js'

dotenv.config()

const app = express()


// ===============================
// MIDDLEWARE
// ===============================

app.use(cors())

app.use(express.json({
  limit: '50mb'
}))

app.use(express.urlencoded({
  extended: true,
  limit: '50mb'
}))


// ===============================
// ROUTES
// ===============================

app.use(
  '/api/inventory',
  inventoryRoutes
)


// ===============================
// MONGODB
// ===============================

mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log('MongoDB Connected')
})
.catch((err) => {
  console.log(err)
})


// ===============================
// SERVER
// ===============================

const PORT =
  process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  )
})