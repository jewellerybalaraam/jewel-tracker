import Eerettu from '../models/Eerettu.js'

export const createEerettu = async (req, res) => {
  try {
    const eerettu = await Eerettu.create(req.body)
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