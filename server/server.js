import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
// optional security packages – install if needed
// import helmet from 'helmet';
// import rateLimit from 'express-rate-limit';

import authRoutes      from './routes/authRoutes.js';
import clientRoutes    from './routes/clientRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import eerettuRoutes   from './routes/eerettuRoutes.js';
import walletRoutes    from './routes/walletRoutes.js';
import billRoutes      from './routes/billRoutes.js';
import lotRoutes       from './routes/lotRoutes.js';
import supplierRoutes  from './routes/supplierRoutes.js';
import productRoutes   from './routes/productRoutes.js';
import bulkStockRoutes from './routes/bulkStockRoutes.js';
import draftRoutes     from './routes/draftRoutes.js';

import { errorHandler, notFound } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

// optional security
// app.use(helmet());
// const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
// app.use('/api/auth/login', limiter);

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth',       authRoutes);
app.use('/api/clients',    clientRoutes);
app.use('/api/inventory',  inventoryRoutes);
app.use('/api/eerettu',    eerettuRoutes);
app.use('/api/wallet',     walletRoutes);
app.use('/api/bills',      billRoutes);
app.use('/api/lots',       lotRoutes);
app.use('/api/suppliers',  supplierRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/bulk-stock', bulkStockRoutes);
app.use('/api/drafts',     draftRoutes);

// ❌ transactionRoutes removed – no longer used

// 404 and error handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.log(err));