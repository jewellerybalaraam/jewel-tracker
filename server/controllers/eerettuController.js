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

export const updateItemStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { barcode, status, billBookNo, billPageNo } = req.body

    const eerettu = await Eerettu.findById(id)
    if (!eerettu) return res.status(404).json({ message: 'Eerettu Not Found' })

    const item = eerettu.items.find(i => i.barcode === barcode)
    if (!item) return res.status(404).json({ message: 'Item Not Found' })

    item.status = status

    if (status === 'SOLD') {
      item.billBookNo = billBookNo || ''
      item.billPageNo = billPageNo || ''
    } else {
      item.billBookNo = ''
      item.billPageNo = ''
    }

    await eerettu.save()
    res.json(eerettu)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

// ─────────────────────────────────────────────────────────
// UPDATE WT MODE STATUS
// body: { status, billBookNo, billPageNo, returnedPcs, returnedWt }
// soldPcs and soldWt are auto-calculated server-side
// ─────────────────────────────────────────────────────────

export const updateWtStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status, billBookNo, billPageNo, returnedPcs, returnedWt } = req.body

    const eerettu = await Eerettu.findById(id)
    if (!eerettu) return res.status(404).json({ message: 'Not Found' })

    const wt = eerettu.wtMode

    wt.status = status

    if (status === 'SOLD') {
      const retPcs = parseFloat(returnedPcs) || 0
      const retWt  = parseFloat(returnedWt)  || 0

      wt.returnedPcs = retPcs
      wt.returnedWt  = retWt

      // auto-calculate sold
      wt.soldPcs = (wt.totalPcs || 0) - retPcs
      wt.soldWt  = parseFloat(((wt.totalWt || 0) - retWt).toFixed(3))

      wt.billBookNo = billBookNo || ''
      wt.billPageNo = billPageNo || ''

    } else if (status === 'RETURNED') {
      // full return — clear sold fields
      wt.returnedPcs = wt.totalPcs
      wt.returnedWt  = wt.totalWt
      wt.soldPcs     = 0
      wt.soldWt      = 0
      wt.billBookNo  = ''
      wt.billPageNo  = ''

    } else {
      // PENDING — reset everything
      wt.returnedPcs = 0
      wt.returnedWt  = 0
      wt.soldPcs     = 0
      wt.soldWt      = 0
      wt.billBookNo  = ''
      wt.billPageNo  = ''
    }

    await eerettu.save()
    res.json(eerettu)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}