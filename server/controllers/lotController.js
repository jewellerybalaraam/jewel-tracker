import mongoose from 'mongoose'
import Lot from '../models/Lot.js'
import Inventory from '../models/Inventory.js'
import Product from '../models/Product.js'
import Supplier from '../models/Supplier.js'
import BulkStock from '../models/BulkStock.js'

// ─── helpers ────────────────────────────────────────────────────────────────

/*
  Generate a LOT number that is guaranteed not to exist.
  Strategy: look at both the Lot collection AND legacy barcodes
  in Inventory (whose leading digits encode the lot number), then
  take max + 1.
*/
const generateNextLotNumber = async () => {
  // 1) max from Lot collection
  const latestLot = await Lot.findOne({}).sort({ lotNumber: -1 })
  const fromLot   = latestLot?.lotNumber || 0

  // 2) max from legacy barcodes — barcode pattern: <digits><LETTERS><digits>
  //    leading digits = lot number
  let fromInv = 0
  const sample = await Inventory.find({}, { barcode: 1, lotNumber: 1 }).limit(5000)
  for (const it of sample) {
    if (it.lotNumber && it.lotNumber > fromInv) fromInv = it.lotNumber
    if (it.barcode) {
      const m = String(it.barcode).match(/^(\d+)/)
      if (m) {
        const n = parseInt(m[1], 10)
        if (!Number.isNaN(n) && n > fromInv) fromInv = n
      }
    }
  }

  let next = Math.max(fromLot, fromInv) + 1
  // safety re-check
  while (await Lot.findOne({ lotNumber: next })) next++
  return next
}

/*
  Given a LOT number and a product prefix, compute the next
  serial number (the trailing digits after the letters).
  This is critical: items added later must keep counting up.
*/
const nextSerialFor = async (lotNumber, prefix) => {
  const PFX = (prefix || '').toUpperCase()
  // look in inventory for existing items in this LOT+prefix
  const regex = new RegExp(`^${lotNumber}${PFX}(\\d+)$`)
  const items = await Inventory.find({ barcode: regex }, { barcode: 1 })
  let max = 0
  for (const it of items) {
    const m = it.barcode.match(regex)
    if (m) {
      const n = parseInt(m[1], 10)
      if (n > max) max = n
    }
  }
  return max + 1
}

// ─── routes ────────────────────────────────────────────────────────────────

// GET /api/lots/next-number
export const getNextLotNumber = async (_req, res) => {
  try {
    const n = await generateNextLotNumber()
    res.json({ success: true, lotNumber: n })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/lots
export const listLots = async (_req, res) => {
  try {
    const lots = await Lot.find({}).sort({ lotNumber: -1 })
    res.json({ success: true, data: lots })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/lots/:lotNumber
export const getLot = async (req, res) => {
  try {
    const lotNumber = Number(req.params.lotNumber)
    const lot = await Lot.findOne({ lotNumber })
    if (!lot) return res.status(404).json({ success: false, message: 'Lot not found' })

    // fetch items for each product line
    const items = await Inventory.find({ lotNumber })
    res.json({ success: true, data: lot, items })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// POST /api/lots  — create a new LOT (Step 1)
// body: { lotNumber?, receivedDate?, notes?, products:[{...}], createdBy? }
export const createLot = async (req, res) => {
  try {
    const { receivedDate, notes, products, createdBy } = req.body
    let lotNumber = Number(req.body.lotNumber)

    if (!lotNumber || isNaN(lotNumber)) lotNumber = await generateNextLotNumber()

    // guard against duplicate (race)
    const existing = await Lot.findOne({ lotNumber })
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `LOT ${lotNumber} already exists`,
      })
    }

    // normalise products + assign productKey
    const products_ = (Array.isArray(products) ? products : []).map((p, idx) => ({
      productKey:     p.productKey || `${Date.now()}-${idx}`,
      supplierName:   p.supplierName || '',
      supplierId:     p.supplierId   || undefined,
      productId:      Number(p.productId)   || 0,
      prefix:         (p.prefix || '').toUpperCase(),
      productName:    p.productName    || '',
      subProductName: p.subProductName || '',
      quantity:       Number(p.quantity)    || 0,
      totalWeight:    Number(p.totalWeight) || 0,
      purity:         p.purity || '',
      isBulk:         !!p.isBulk,
      bulkLength:     Number(p.bulkLength)  || 0,
      bulkUnit:       p.bulkUnit || 'm',
    }))

    // Auto-sync product catalog so autocomplete always has data
    for (const p of products_) {
      if (!p.productName || !p.prefix) continue
      const exists = await Product.findOne({
        productName:    p.productName.trim(),
        subProductName: (p.subProductName || '').trim(),
      })
      if (!exists) {
        const last = await Product.findOne({}).sort({ productId: -1 })
        await Product.create({
          productId:      (last?.productId || 100) + 1,
          prefix:         p.prefix.trim().toUpperCase(),
          productName:    p.productName.trim(),
          subProductName: (p.subProductName || '').trim(),
          purity:         Number(p.purity) || 92.5,
          isBulk:         !!p.isBulk,
          unit:           p.isBulk ? (p.bulkUnit || 'm') : 'pcs',
        })
      }
    }

    const lot = await Lot.create({
      lotNumber,
      receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
      notes:        notes || '',
      products:     products_,
      createdBy:    createdBy || '',
      status:       'open',
    })

    // also push IN-transactions for any bulk products
    for (const p of products_) {
      if (p.isBulk && p.bulkLength > 0) {
        await upsertBulkIn({
          productName:    p.productName,
          subProductName: p.subProductName,
          purity:         p.purity,
          unit:           p.bulkUnit,
          quantity:       p.bulkLength,
          lotNumber,
          supplierName:   p.supplierName,
        })
      }
    }

    res.json({ success: true, data: lot })
  } catch (err) {
    console.log(err)
    res.status(500).json({ success: false, message: err.message })
  }
}

// PUT /api/lots/:lotNumber  — edit a LOT (Step 1 edit)
export const updateLot = async (req, res) => {
  try {
    const lotNumber = Number(req.params.lotNumber)
    const lot = await Lot.findOne({ lotNumber })
    if (!lot) return res.status(404).json({ success: false, message: 'Lot not found' })

    const { receivedDate, notes, products, status } = req.body

    if (receivedDate) lot.receivedDate = new Date(receivedDate)
    if (notes !== undefined) lot.notes = notes
    if (status) lot.status = status

    // diff & reconcile bulk stock when products change
    const oldBulk = new Map()
    for (const p of lot.products) {
      if (p.isBulk) oldBulk.set(p.productKey, p.bulkLength || 0)
    }

    if (Array.isArray(products)) {
      lot.products = products.map((p, idx) => ({
        productKey:     p.productKey || `${Date.now()}-${idx}`,
        supplierName:   p.supplierName || '',
        supplierId:     p.supplierId   || undefined,
        productId:      Number(p.productId)   || 0,
        prefix:         (p.prefix || '').toUpperCase(),
        productName:    p.productName    || '',
        subProductName: p.subProductName || '',
        quantity:       Number(p.quantity)    || 0,
        totalWeight:    Number(p.totalWeight) || 0,
        purity:         p.purity || '',
        isBulk:         !!p.isBulk,
        bulkLength:     Number(p.bulkLength)  || 0,
        bulkUnit:       p.bulkUnit || 'm',
        itemsAddedCount:  p.itemsAddedCount  || 0,
        itemsAddedWeight: p.itemsAddedWeight || 0,
        completed:        !!p.completed,
      }))
    }

    await lot.save()

    // reconcile bulk IN transactions
    for (const p of lot.products) {
      if (!p.isBulk) continue
      const oldVal = oldBulk.get(p.productKey) || 0
      const delta  = (p.bulkLength || 0) - oldVal
      if (delta !== 0) {
        await applyBulkAdjustment({
          productName:    p.productName,
          subProductName: p.subProductName,
          purity:         p.purity,
          unit:           p.bulkUnit,
          quantity:       delta,
          lotNumber,
          supplierName:   p.supplierName,
          note:           'LOT edit',
        })
      }
    }

    res.json({ success: true, data: lot })
  } catch (err) {
    console.log(err)
    res.status(500).json({ success: false, message: err.message })
  }
}

// DELETE /api/lots/:lotNumber  — delete LOT + all its items (reversible step 1)
export const deleteLot = async (req, res) => {
  try {
    const lotNumber = Number(req.params.lotNumber)
    const lot = await Lot.findOne({ lotNumber })
    if (!lot) return res.status(404).json({ success: false, message: 'Lot not found' })

    // reverse bulk transactions linked to this LOT
    await BulkStock.updateMany(
      { 'transactions.lotNumber': lotNumber },
      { $pull: { transactions: { lotNumber } } }
    )
    // recompute bulk totals after pulling
    const stocks = await BulkStock.find({})
    for (const s of stocks) {
      let tIn = 0, tOut = 0
      for (const t of s.transactions) {
        if (t.type === 'IN') tIn += t.quantity
        else if (t.type === 'OUT') tOut += t.quantity
        else if (t.type === 'ADJUST') tIn += t.quantity // positive/negative
      }
      s.totalIn  = tIn
      s.totalOut = tOut
      s.balance  = tIn - tOut
      await s.save()
    }

    await Inventory.deleteMany({ lotNumber })
    await Lot.deleteOne({ lotNumber })

    res.json({ success: true, message: `Lot ${lotNumber} and all items deleted` })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// POST /api/lots/:lotNumber/products/:productKey/items
// body: { size?, netWt, purity?, makingCharge?, pureRate? }
export const addItemToLotProduct = async (req, res) => {
  try {
    const lotNumber  = Number(req.params.lotNumber)
    const productKey = req.params.productKey

    const lot = await Lot.findOne({ lotNumber })
    if (!lot) return res.status(404).json({ success: false, message: 'Lot not found' })

    const lp = lot.products.find(p => p.productKey === productKey)
    if (!lp) return res.status(404).json({ success: false, message: 'Product line not found in lot' })

    if (lp.isBulk) {
      return res.status(400).json({
        success: false,
        message: 'This is a bulk product — items cannot be tagged individually',
      })
    }

    const { size, netWt, makingCharge, pureRate, purity } = req.body

    if (!lp.prefix) {
      return res.status(400).json({
        success: false,
        message: 'Product line is missing prefix (abbreviation) — required for barcode',
      })
    }

    const serial = await nextSerialFor(lotNumber, lp.prefix)
    const barcode = `${lotNumber}${lp.prefix}${serial}`

    const item = await Inventory.create({
      recordDate:     new Date(),
      recordTime:     new Date().toLocaleTimeString('en-US'),
      barcode,
      productId:      lp.productId || 0,
      productName:    lp.productName,
      subProductName: lp.subProductName,
      netWt:          Number(netWt) || 0,
      size:           size || '',
      makingCharge:   Number(makingCharge) || 0,
      pureRate:       Number(pureRate) || 0,
      purity:         purity || lp.purity || '',
      status:         'AVAILABLE',
      lotNumber,
      productKey,
      prefix:         lp.prefix,
      serialNo:       serial,
      supplierName:   lp.supplierName || '',
    })

    // update lot product counters
    lp.itemsAddedCount  = (lp.itemsAddedCount  || 0) + 1
    lp.itemsAddedWeight = (lp.itemsAddedWeight || 0) + (Number(netWt) || 0)
    await lot.save()

    res.json({
      success: true,
      data: item,
      barcodeDisplay: `${lotNumber}-${lp.prefix}${serial}`,
      progress: {
        addedCount:    lp.itemsAddedCount,
        addedWeight:   lp.itemsAddedWeight,
        expectedCount: lp.quantity,
        expectedWeight:lp.totalWeight,
      }
    })
  } catch (err) {
    console.log(err)
    res.status(500).json({ success: false, message: err.message })
  }
}

// PUT /api/inventory/:id  → handled in inventoryController (we'll add it)
// DELETE /api/inventory/:id → handled in inventoryController (we'll add it)

// GET /api/lots/:lotNumber/summary  → wt difference per product
export const getLotSummary = async (req, res) => {
  try {
    const lotNumber = Number(req.params.lotNumber)
    const lot = await Lot.findOne({ lotNumber })
    if (!lot) return res.status(404).json({ success: false, message: 'Lot not found' })

    const items = await Inventory.find({ lotNumber })

    const summary = lot.products.map(p => {
      const productItems = items.filter(i => i.productKey === p.productKey)
      const addedCount = productItems.length
      const addedWt    = productItems.reduce((s, i) => s + (i.netWt || 0), 0)
      return {
        productKey:    p.productKey,
        productName:   p.productName,
        subProductName:p.subProductName,
        prefix:        p.prefix,
        isBulk:        p.isBulk,
        expectedCount: p.quantity,
        addedCount,
        expectedWeight: p.totalWeight,
        addedWeight:    Number(addedWt.toFixed(3)),
        weightDiff:     Number((addedWt - (p.totalWeight || 0)).toFixed(3)),
        completed:      p.completed,
      }
    })

    res.json({ success: true, lotNumber, summary })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// POST /api/lots/:lotNumber/products/:productKey/complete
export const markProductCompleted = async (req, res) => {
  try {
    const lotNumber  = Number(req.params.lotNumber)
    const productKey = req.params.productKey
    const lot = await Lot.findOne({ lotNumber })
    if (!lot) return res.status(404).json({ success: false, message: 'Lot not found' })
    const lp = lot.products.find(p => p.productKey === productKey)
    if (!lp) return res.status(404).json({ success: false, message: 'Product line not found' })
    lp.completed = !!req.body.completed
    await lot.save()
    res.json({ success: true, data: lot })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// POST /api/lots/:lotNumber/finalize
export const finalizeLot = async (req, res) => {
  try {
    const lotNumber = Number(req.params.lotNumber)
    const lot = await Lot.findOne({ lotNumber })
    if (!lot) return res.status(404).json({ success: false, message: 'Lot not found' })
    lot.status = 'finalized'
    await lot.save()
    res.json({ success: true, data: lot })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── internal helpers for bulk stock ───────────────────────────────────────

async function upsertBulkIn({ productName, subProductName, purity, unit, quantity, lotNumber, supplierName }) {
  let s = await BulkStock.findOne({ productName, subProductName: subProductName || '', purity: purity || '' })
  if (!s) {
    s = await BulkStock.create({
      productName, subProductName: subProductName || '', purity: purity || '',
      unit: unit || 'm',
    })
  }
  s.transactions.push({
    type:'IN', quantity, unit: unit || 'm', lotNumber, supplierName: supplierName || '', note: 'LOT receipt'
  })
  s.totalIn += quantity
  s.balance = s.totalIn - s.totalOut
  await s.save()
}

async function applyBulkAdjustment({ productName, subProductName, purity, unit, quantity, lotNumber, supplierName, note }) {
  let s = await BulkStock.findOne({ productName, subProductName: subProductName || '', purity: purity || '' })
  if (!s) {
    s = await BulkStock.create({
      productName, subProductName: subProductName || '', purity: purity || '',
      unit: unit || 'm',
    })
  }
  s.transactions.push({
    type:'ADJUST', quantity, unit: unit || 'm', lotNumber, supplierName: supplierName || '', note: note || 'adjust'
  })
  if (quantity > 0) s.totalIn  += quantity
  else              s.totalOut += -quantity
  s.balance = s.totalIn - s.totalOut
  await s.save()
}