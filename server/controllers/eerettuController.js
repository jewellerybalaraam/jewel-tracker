import Eerettu from '../models/Eerettu.js'
import Inventory from '../models/Inventory.js'

export const createEerettu = async (req, res) => {
  try {
    const { items = [] } = req.body || {}

    // normalize + validate payload early
    const normalizedItems = items.map(it => ({
      ...it,
      barcode: typeof it?.barcode === 'string'
        ? it.barcode.replace(/-/g, '').trim()
        : String(it?.barcode || '').trim(),
    }))

    // duplicates inside same request are rejected
    const seen = new Set()
    const dupes = []
    for (const it of normalizedItems) {
      if (!it.barcode) continue
      if (seen.has(it.barcode)) dupes.push(it.barcode)
      seen.add(it.barcode)
    }
    if (dupes.length) {
      return res.status(400).json({ message: `Duplicate barcode(s) in request: ${[...new Set(dupes)].join(', ')}` })
    }

    // IMPORTANT: per requirement, if barcode is PENDING or SOLD it can’t be added to Eerettu.
    // Current system uses Eerettu.items.status to track this.
    // So we check existing eerettus for any of the requested barcodes that are not PENDING/RETURNED? (only PENDING/SOLD are blocked)
    const blocked = await Eerettu.find({
      'items.barcode': { $in: normalizedItems.map(i => i.barcode).filter(Boolean) },
      'items.status': { $in: ['PENDING', 'SOLD'] },
    }).select({ 'items.$': 1, clientName: 1 })

    if (blocked?.length) {
      // collect unique barcodes already in PENDING/SOLD across any existing Eerettu items
      const barcodes = new Set()
      for (const e of blocked) {
        for (const it of e.items || []) {
          if (it?.barcode) barcodes.add(it.barcode)
        }
      }
      return res.status(400).json({
        message: `Some barcodes are already reserved/used (PENDING or SOLD): ${Array.from(barcodes).join(', ')}`,
      })
    }

    const eerettu = await Eerettu.create({
      ...req.body,
      items: normalizedItems,
    })

    res.json(eerettu)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}


export const getEerettus = async (req, res) => {
  try {
    const { from, to, client } = req.query
    const query = {}

    if (from && to) {
      query.date = {
        $gte: new Date(from),
        $lte: new Date(new Date(to).setHours(23, 59, 59, 999)),
      }
    }

    if (client) {
      query.clientName = { $regex: client, $options: 'i' }
    }

    const eerettus = await Eerettu.find(query).sort({ date: -1 })
    res.json(eerettus)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

export const getTodayEerettus = async (req, res) => {
  try {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)

    const eerettus = await Eerettu.find({
      date: { $gte: start, $lte: end },
    }).sort({ createdAt: -1 })

    res.json(eerettus)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

export const updateDate = async (req, res) => {
  try {
    const { id } = req.params
    const { date } = req.body

    const eerettu = await Eerettu.findByIdAndUpdate(
      id,
      { $set: { date: new Date(date) } },
      { new: true }
    )

    if (!eerettu) return res.status(404).json({ message: 'Not Found' })
    res.json(eerettu)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

// ─────────────────────────────────────────────────────────
// UPDATE BARCODE ITEM STATUS / FIELDS
// body may include: status, billBookNo, billPageNo, purity,
//                   pureDue, cashDue, soldAt, returnedAt
// Only provided fields are updated.
// ─────────────────────────────────────────────────────────
export const updateItemStatus = async (req, res) => {
  try {
    const { id } = req.params
    const {
      barcode, status, billBookNo, billPageNo,
      purity, pureDue, cashDue, soldAt, returnedAt,
    } = req.body

    const eerettu = await Eerettu.findById(id)
    if (!eerettu) return res.status(404).json({ message: 'Eerettu Not Found' })

    const item = eerettu.items.find(i => i.barcode === barcode)
    if (!item) return res.status(404).json({ message: 'Item Not Found' })

    if (status !== undefined) {
      item.status = status
      if (status === 'SOLD') {
        item.soldAt = soldAt ? new Date(soldAt) : (item.soldAt || new Date())
        item.billBookNo = billBookNo ?? item.billBookNo ?? ''
        item.billPageNo = billPageNo ?? item.billPageNo ?? ''
      } else if (status === 'RETURNED') {
        item.returnedAt = returnedAt ? new Date(returnedAt) : (item.returnedAt || new Date())
        item.soldAt    = null
        item.billBookNo = ''
        item.billPageNo = ''
      } else {
        // PENDING — clear sale/return metadata
        item.soldAt     = null
        item.returnedAt = null
        item.billBookNo = ''
        item.billPageNo = ''
      }
    } else {
      if (billBookNo !== undefined) item.billBookNo = billBookNo
      if (billPageNo !== undefined) item.billPageNo = billPageNo
      if (soldAt     !== undefined) item.soldAt     = soldAt     ? new Date(soldAt)     : null
      if (returnedAt !== undefined) item.returnedAt = returnedAt ? new Date(returnedAt) : null
    }

    if (purity  !== undefined) item.purity  = purity
    if (pureDue !== undefined) item.pureDue = parseFloat(pureDue) || 0
    if (cashDue !== undefined) item.cashDue = parseFloat(cashDue) || 0

    await eerettu.save()
    res.json(eerettu)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

// ─────────────────────────────────────────────────────────
// UPDATE WT MODE STATUS / FIELDS
// body may include: status, billBookNo, billPageNo, returnedPcs,
//                   returnedWt, purity, pureDue, cashDue, soldAt, returnedAt
// ─────────────────────────────────────────────────────────
export const updateWtStatus = async (req, res) => {
  try {
    const { id } = req.params
    const {
      status, billBookNo, billPageNo, returnedPcs, returnedWt,
      purity, pureDue, cashDue, soldAt, returnedAt,
    } = req.body

    const eerettu = await Eerettu.findById(id)
    if (!eerettu) return res.status(404).json({ message: 'Not Found' })

    const wt = eerettu.wtMode

    if (status !== undefined) {
      wt.status = status

      if (status === 'SOLD') {
        const retPcs = parseFloat(returnedPcs) || 0
        const retWt  = parseFloat(returnedWt)  || 0
        wt.returnedPcs = retPcs
        wt.returnedWt  = retWt
        wt.soldPcs = (wt.totalPcs || 0) - retPcs
        wt.soldWt  = parseFloat(((wt.totalWt || 0) - retWt).toFixed(3))
        wt.billBookNo = billBookNo ?? wt.billBookNo ?? ''
        wt.billPageNo = billPageNo ?? wt.billPageNo ?? ''
        wt.soldAt = soldAt ? new Date(soldAt) : (wt.soldAt || new Date())
      } else if (status === 'RETURNED') {
        // honor partial returnedPcs/Wt if provided, else default to total
        const retPcs = (returnedPcs !== undefined && returnedPcs !== '')
          ? parseFloat(returnedPcs) || 0 : (wt.totalPcs || 0)
        const retWt  = (returnedWt !== undefined && returnedWt !== '')
          ? parseFloat(returnedWt)  || 0 : (wt.totalWt  || 0)
        wt.returnedPcs = retPcs
        wt.returnedWt  = retWt
        wt.soldPcs     = 0
        wt.soldWt      = 0
        wt.billBookNo  = ''
        wt.billPageNo  = ''
        wt.soldAt      = null
        wt.returnedAt  = returnedAt ? new Date(returnedAt) : (wt.returnedAt || new Date())
      } else {
        // PENDING — clear sale/return metadata
        wt.returnedPcs = 0
        wt.returnedWt  = 0
        wt.soldPcs     = 0
        wt.soldWt      = 0
        wt.billBookNo  = ''
        wt.billPageNo  = ''
        wt.soldAt      = null
        wt.returnedAt  = null
      }
    } else {
      if (billBookNo !== undefined) wt.billBookNo = billBookNo
      if (billPageNo !== undefined) wt.billPageNo = billPageNo
      if (soldAt     !== undefined) wt.soldAt     = soldAt     ? new Date(soldAt)     : null
      if (returnedAt !== undefined) wt.returnedAt = returnedAt ? new Date(returnedAt) : null
      if (returnedPcs !== undefined) wt.returnedPcs = parseFloat(returnedPcs) || 0
      if (returnedWt  !== undefined) wt.returnedWt  = parseFloat(returnedWt)  || 0
    }

    if (purity  !== undefined) wt.purity  = purity
    if (pureDue !== undefined) wt.pureDue = parseFloat(pureDue) || 0
    if (cashDue !== undefined) wt.cashDue = parseFloat(cashDue) || 0

    await eerettu.save()
    res.json(eerettu)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

// ─────────────────────────────────────────────────────────
// BULK STATUS UPDATE — used by Quick-Scan / Mark-All
// body: {
//   updates: [
//     { kind: 'barcode'|'wt', eerettuId, barcode?, status:'RETURNED'|'SOLD',
//       soldAt?, returnedAt?, pureDue?, cashDue?, billBookNo?, billPageNo?,
//       returnedPcs?, returnedWt? }
//   ]
// }
// ─────────────────────────────────────────────────────────
export const bulkUpdateStatus = async (req, res) => {
  try {
    const { updates = [] } = req.body
    const results = { updated: 0, skipped: 0, errors: [] }
    // group by eerettuId so we only load & save each doc once
    const byId = new Map()
    updates.forEach(u => {
      if (!u.eerettuId) { results.skipped++; return }
      if (!byId.has(u.eerettuId)) byId.set(u.eerettuId, [])
      byId.get(u.eerettuId).push(u)
    })
    for (const [id, list] of byId.entries()) {
      const e = await Eerettu.findById(id)
      if (!e) { results.skipped += list.length; results.errors.push(`Eerettu ${id} not found`); continue }
      for (const u of list) {
        const status = u.status
        if (u.kind === 'barcode') {
          const item = e.items.find(i => i.barcode === u.barcode)
          if (!item) { results.skipped++; continue }
          if (item.billId) { results.skipped++; continue }   // locked
          item.status = status
          if (status === 'SOLD') {
            item.soldAt     = u.soldAt ? new Date(u.soldAt) : new Date()
            item.returnedAt = null
            if (u.pureDue   !== undefined) item.pureDue   = parseFloat(u.pureDue)||0
            if (u.cashDue   !== undefined) item.cashDue   = parseFloat(u.cashDue)||0
            if (u.billBookNo!== undefined) item.billBookNo= u.billBookNo
            if (u.billPageNo!== undefined) item.billPageNo= u.billPageNo
          } else if (status === 'RETURNED') {
            item.returnedAt = u.returnedAt ? new Date(u.returnedAt) : new Date()
            item.soldAt     = null
            item.billBookNo = ''
            item.billPageNo = ''
          }
          results.updated++
        } else if (u.kind === 'wt') {
          const wt = e.wtMode
          if (!wt) { results.skipped++; continue }
          if (wt.billId) { results.skipped++; continue }
          wt.status = status
          if (status === 'SOLD') {
            const retPcs = (u.returnedPcs!==undefined && u.returnedPcs!=='') ? parseFloat(u.returnedPcs)||0 : 0
            const retWt  = (u.returnedWt !==undefined && u.returnedWt !=='') ? parseFloat(u.returnedWt) ||0 : 0
            wt.returnedPcs = retPcs
            wt.returnedWt  = retWt
            wt.soldPcs     = (wt.totalPcs||0) - retPcs
            wt.soldWt      = parseFloat(((wt.totalWt||0) - retWt).toFixed(3))
            wt.soldAt      = u.soldAt ? new Date(u.soldAt) : new Date()
            wt.returnedAt  = null
            if (u.pureDue   !== undefined) wt.pureDue   = parseFloat(u.pureDue)||0
            if (u.cashDue   !== undefined) wt.cashDue   = parseFloat(u.cashDue)||0
          } else if (status === 'RETURNED') {
            wt.returnedPcs = wt.totalPcs || 0
            wt.returnedWt  = wt.totalWt  || 0
            wt.soldPcs     = 0
            wt.soldWt      = 0
            wt.returnedAt  = u.returnedAt ? new Date(u.returnedAt) : new Date()
            wt.soldAt      = null
            wt.billBookNo  = ''
            wt.billPageNo  = ''
          }
          results.updated++
        } else {
          results.skipped++
        }
      }
      await e.save()
    }
    res.json(results)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

// ─────────────────────────────────────────────────────────
// AGGREGATE: list of clients with pending counts
// ─────────────────────────────────────────────────────────
export const getPendingClientsList = async (_req, res) => {
  try {
    const eerettus = await Eerettu.find({})
    const map = {}
    eerettus.forEach(e => {
      let count = 0
      if (e.mode === 'barcode') {
        count = (e.items || []).filter(i => i.status === 'PENDING').length
      } else if (e.mode === 'wt' && e.wtMode?.status === 'PENDING') {
        count = e.wtMode.totalPcs || 0
      }
      if (count > 0) {
        map[e.clientName] = (map[e.clientName] || 0) + count
      }
    })
    const list = Object.entries(map)
      .map(([clientName, pendingCount]) => ({ clientName, pendingCount }))
      .sort((a, b) => b.pendingCount - a.pendingCount)
    res.json(list)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

// ─────────────────────────────────────────────────────────
// AGGREGATE: list of clients with sold counts
// ─────────────────────────────────────────────────────────
export const getSoldClientsList = async (_req, res) => {
  try {
    const eerettus = await Eerettu.find({})
    const map = {}
    eerettus.forEach(e => {
      let count = 0
      if (e.mode === 'barcode') {
        count = (e.items || []).filter(i => i.status === 'SOLD').length
      } else if (e.mode === 'wt' && e.wtMode?.status === 'SOLD') {
        count = e.wtMode.soldPcs || 0
      }
      if (count > 0) {
        map[e.clientName] = (map[e.clientName] || 0) + count
      }
    })
    const list = Object.entries(map)
      .map(([clientName, soldCount]) => ({ clientName, soldCount }))
      .sort((a, b) => b.soldCount - a.soldCount)
    res.json(list)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

// ─────────────────────────────────────────────────────────
// AGGREGATE: by-client eerettus (used by Client Page)
// ─────────────────────────────────────────────────────────
export const getByClient = async (req, res) => {
  try {
    const { clientName } = req.params
    const eerettus = await Eerettu.find({
      clientName: { $regex: `^${clientName}$`, $options: 'i' },
    }).sort({ date: -1 })
    res.json(eerettus)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}
// =====================================
// ADD INVENTORY ITEM DIRECTLY TO SOLD
// =====================================
export const addDirectSale = async (req, res) => {
  try {
    const {
      clientName,
      barcode,
      pureDue    = 0,
      cashDue    = 0,
      billBookNo = '',
      billPageNo = '',
      soldAt,
    } = req.body

    if (!clientName || !barcode) {
      return res.status(400).json({ message: 'clientName and barcode are required' })
    }

    // Find inventory item
    const invItem = await Inventory.findOne({ barcode })
    if (!invItem) {
      return res.status(404).json({ message: `Inventory item not found: ${barcode}` })
    }

    // Check if this barcode is SOLD in any eerettu
    const existing = await Eerettu.findOne({
      'items.barcode': barcode,
      'items.status':  'SOLD',
    })

    if (existing) {
      if (existing.clientName !== clientName) {
        return res.status(400).json({
          message: `This item is already sold to "${existing.clientName}" — it cannot be added to another client.`,
        })
      }
      // Already in this client's sold section → idempotent success
      return res.json({ success: true, alreadyExists: true })
    }

    // Create a new eerettu entry with the item pre-marked SOLD
    const eerettu = await Eerettu.create({
      clientName,
      roughProductName: invItem.productName || barcode,
      date:  new Date(),
      mode:  'barcode',
      items: [{
        barcode:        invItem.barcode,
        wt:             invItem.netWt    || 0,
        size:           invItem.size     || '',
        productName:    invItem.productName    || '',
        subProductName: invItem.subProductName || '',
        purity:         invItem.purity   || '',
        status:         'SOLD',
        pureDue:        parseFloat(pureDue)  || 0,
        cashDue:        parseFloat(cashDue)  || 0,
        billBookNo,
        billPageNo,
        soldAt:         soldAt ? new Date(soldAt) : new Date(),
      }],
    })

    // Mark inventory item as SOLD
    invItem.status = 'SOLD'
    await invItem.save()

    res.json({ success: true, eerettu })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}