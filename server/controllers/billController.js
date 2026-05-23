import Bill   from '../models/Bill.js'
import Eerettu from '../models/Eerettu.js'
import Wallet  from '../models/Wallet.js'

// helper: compute totals from items + params
function computeTotals(items, silverRate, discountPure, discountCash, taxMode, taxes) {
  let A = 0, B = 0, C = 0, cashFromWallet = 0

  items.forEach(it => {
    const effPct = it.purityPct + (it.wasteSign === '+' ? it.wastePct : -it.wastePct)
    it.effectivePurityPct = parseFloat(effPct.toFixed(6))

    if (it.isCash) {
      cashFromWallet += it.cashAmt
      it.pureContrib = 0
      it.mcContrib   = 0
    } else if (it.refType === 'wallet') {
      const contrib = parseFloat(((it.wt * effPct) / 100).toFixed(6))
      it.pureContrib = contrib
      it.mcContrib   = 0
      C += contrib
    } else {
      // sold item (we give)
      const contrib = parseFloat(((it.wt * effPct) / 100).toFixed(6))
      it.pureContrib = contrib
      it.mcContrib   = parseFloat((it.mc * it.wt).toFixed(2))
      A += contrib
      B += it.mcContrib
    }
  })

  const netPure = parseFloat((A - C).toFixed(6))
  const netCashBeforeDiscount = parseFloat(((netPure * silverRate) + B - cashFromWallet).toFixed(2))
  const netCashAfterDiscount  = parseFloat((netCashBeforeDiscount - discountCash - (discountPure * silverRate)).toFixed(2))

  const totalTaxPct = taxes.reduce((s, t) => s + (t.pct || 0), 0)
  const taxAmt = taxMode && netCashAfterDiscount > 0
    ? parseFloat((netCashAfterDiscount * totalTaxPct / 100).toFixed(2))
    : 0
  const finalCash = parseFloat((netCashAfterDiscount + taxAmt).toFixed(2))

  return {
    A: parseFloat(A.toFixed(6)),
    B: parseFloat(B.toFixed(2)),
    C: parseFloat(C.toFixed(6)),
    cashFromWallet: parseFloat(cashFromWallet.toFixed(2)),
    netPure,
    netCashBeforeDiscount,
    netCashAfterDiscount,
    taxAmt,
    finalCash,
  }
}

// ── CREATE BILL ──────────────────────────────────────────────
export const createBill = async (req, res) => {
  try {
    const {
      clientName, silverRate = 0,
      items = [], discountPure = 0, discountCash = 0,
      taxMode = false, taxes = [],
    } = req.body

    if (!clientName) return res.status(400).json({ message: 'clientName required' })

    // Compute per-item derived fields + totals
    const totals = computeTotals(items, silverRate, discountPure, discountCash, taxMode, taxes)

    const bill = await Bill.create({
      clientName, silverRate, items,
      discountPure, discountCash, taxMode, taxes, totals,
    })

    // Lock referenced items with billId
    for (const it of items) {
      if ((it.refType === 'sold_barcode') && it.eerettuId && it.barcode) {
        await Eerettu.updateOne(
          { _id: it.eerettuId, 'items.barcode': it.barcode },
          { $set: { 'items.$.billId': bill._id } }
        )
      } else if (it.refType === 'sold_wt' && it.eerettuId) {
        await Eerettu.updateOne(
          { _id: it.eerettuId },
          { $set: { 'wtMode.billId': bill._id } }
        )
      } else if (it.refType === 'wallet' && it.walletId) {
        await Wallet.updateOne({ _id: it.walletId }, { $set: { billId: bill._id } })
      }
    }

    res.json(bill)
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: err.message })
  }
}

// ── GET BILLS BY CLIENT ──────────────────────────────────────
export const getBillsByClient = async (req, res) => {
  try {
    const bills = await Bill.find({
      clientName: { $regex: `^${req.params.clientName}$`, $options: 'i' }
    }).sort({ createdAt: -1 })
    res.json(bills)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// ── ADD PAYMENT ──────────────────────────────────────────────
export const addPayment = async (req, res) => {
  try {
    const { id } = req.params
    const { amount, note = '', date } = req.body

    const bill = await Bill.findById(id)
    if (!bill) return res.status(404).json({ message: 'Bill not found' })

    bill.payments.push({ amount: parseFloat(amount), note, date: date ? new Date(date) : new Date() })

    const paid = bill.payments.reduce((s, p) => s + p.amount, 0)
    if (paid >= bill.totals.finalCash) {
      bill.status = 'paid'
      bill.paidAt = new Date()
    }

    await bill.save()
    res.json(bill)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// ── DELETE PAYMENT ───────────────────────────────────────────
export const deletePayment = async (req, res) => {
  try {
    const { id, paymentId } = req.params
    const bill = await Bill.findById(id)
    if (!bill) return res.status(404).json({ message: 'Bill not found' })

    bill.payments = bill.payments.filter(p => String(p._id) !== paymentId)

    const paid = bill.payments.reduce((s, p) => s + p.amount, 0)
    if (paid < bill.totals.finalCash) {
      bill.status = 'unpaid'
      bill.paidAt = null
    }

    await bill.save()
    res.json(bill)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// ── DELETE BILL (unlock items) ───────────────────────────────
export const deleteBill = async (req, res) => {
  try {
    const { id } = req.params
    const bill = await Bill.findById(id)
    if (!bill) return res.status(404).json({ message: 'Bill not found' })

    // Unlock all referenced items
    for (const it of bill.items) {
      if (it.refType === 'sold_barcode' && it.eerettuId && it.barcode) {
        await Eerettu.updateOne(
          { _id: it.eerettuId, 'items.barcode': it.barcode },
          { $set: { 'items.$.billId': null } }
        )
      } else if (it.refType === 'sold_wt' && it.eerettuId) {
        await Eerettu.updateOne(
          { _id: it.eerettuId },
          { $set: { 'wtMode.billId': null } }
        )
      } else if (it.refType === 'wallet' && it.walletId) {
        await Wallet.updateOne({ _id: it.walletId }, { $set: { billId: null } })
      }
    }

    await Bill.findByIdAndDelete(id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
