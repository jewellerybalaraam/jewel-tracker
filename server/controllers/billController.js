import Bill    from '../models/Bill.js'
import Eerettu from '../models/Eerettu.js'
import Wallet  from '../models/Wallet.js'
import Client  from '../models/Client.js'
import Counter from '../models/Counter.js'

// ── helper: compute totals from items + params ────────────────
function computeTotals(items, silverRate, discountPure, discountCash, taxMode, taxes) {
  let A = 0, B = 0, C = 0, cashFromWallet = 0

  items.forEach(it => {
    const effPct = (it.purityPct || 0) + (it.wasteSign === '+' ? (it.wastePct||0) : -(it.wastePct||0))
    it.effectivePurityPct = parseFloat(effPct.toFixed(6))

    if (it.isCash) {
      cashFromWallet += (it.cashAmt||0)
      it.pureContrib = 0
      it.mcContrib   = 0
    } else if (it.refType === 'wallet' || it.refType === 'payment_inline') {
      const contrib = parseFloat((((it.wt||0) * effPct) / 100).toFixed(6))
      it.pureContrib = contrib
      it.mcContrib   = 0
      C += contrib
    } else {
      // sold item / inventory_sale / manual_sale  (we give)
      const contrib = parseFloat((((it.wt||0) * effPct) / 100).toFixed(6))
      it.pureContrib = contrib
      it.mcContrib   = parseFloat(((it.mc||0) * (it.wt||0)).toFixed(2))
      A += contrib
      B += it.mcContrib
    }
  })

  const netPure = parseFloat((A - C).toFixed(6))
  const netCashBeforeDiscount = parseFloat(((netPure * silverRate) + B - cashFromWallet).toFixed(2))
  const netCashAfterDiscount  = parseFloat((netCashBeforeDiscount - (discountCash||0) - ((discountPure||0) * silverRate)).toFixed(2))

  const totalTaxPct = (taxes||[]).reduce((s, t) => s + (t.pct || 0), 0)
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

// ── helper: mint next bill number ────────────────────────────
async function nextBillNumber() {
  const n = await Counter.next('bill')
  return `BILL-${String(n).padStart(6, '0')}`
}

// ── helper: ensure client exists (so mobile is stored) ───────
async function upsertClient(clientName, mobile) {
  if (!clientName) return
  const update = mobile ? { $addToSet: { mobiles: mobile } } : {}
  await Client.findOneAndUpdate(
    { clientName },
    { ...update, $setOnInsert: { clientName } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
}

// ── CREATE BILL ──────────────────────────────────────────────
export const createBill = async (req, res) => {
  try {
    const {
      clientName, customerMobile = '', billType = 'client',
      silverRate = 0,
      items = [], discountPure = 0, discountCash = 0,
      taxMode = false, taxes = [],
      // extras supplied by Direct Billing payment-balancing flow:
      extraToWallet = 0,   // pure-g surplus to park into client wallet
      extraCashOut  = 0,   // cash given to customer for surplus
    } = req.body

    if (!clientName) return res.status(400).json({ message: 'clientName required' })

    // upsert client + mobile
    await upsertClient(clientName, customerMobile)

    // Compute per-item derived fields + totals
    const totals = computeTotals(items, silverRate, discountPure, discountCash, taxMode, taxes)
    totals.extraToWallet = parseFloat(extraToWallet) || 0
    totals.extraCashOut  = parseFloat(extraCashOut)  || 0

    const billNumber = await nextBillNumber()

    const bill = await Bill.create({
      billNumber, billType,
      clientName, customerMobile,
      silverRate, items,
      discountPure, discountCash, taxMode, taxes, totals,
    })

    // Lock referenced items with billId / create inline wallet entries
    for (const it of bill.items) {
      if (it.refType === 'sold_barcode' && it.eerettuId && it.barcode) {
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
      } else if (it.refType === 'payment_inline' && !it.isCash) {
        // record this incoming bar / old-gold into the client's wallet history
        const created = await Wallet.create({
          clientName,
          type: it.payType || 'OldJewel',
          weight: it.wt || 0,
          purity: String(it.purityPct || ''),
          comment: `Payment via bill ${billNumber}`,
          date: new Date(),
          billId: bill._id,
        })
        it.walletId = created._id
      }
    }

    // park surplus pure into client wallet (if requested)
    if (totals.extraToWallet > 0) {
      await Wallet.create({
        clientName,
        type: 'OldJewel',
        weight: totals.extraToWallet,
        purity: '100',
        comment: `Surplus from bill ${billNumber} (stored as 100% pure)`,
        date: new Date(),
        billId: bill._id,
      })
    }

    await bill.save()
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

// ── GET ALL BILLS (with filters) ─────────────────────────────
export const getAllBills = async (req, res) => {
  try {
    const { from, to, q, billType, status } = req.query
    const query = {}
    if (from && to) {
      query.createdAt = {
        $gte: new Date(from),
        $lte: new Date(new Date(to).setHours(23,59,59,999)),
      }
    }
    if (q) {
      query.$or = [
        { clientName:     { $regex: q, $options: 'i' } },
        { customerMobile: { $regex: q, $options: 'i' } },
        { billNumber:     { $regex: q, $options: 'i' } },
      ]
    }
    if (billType) query.billType = billType
    if (status)   query.status = status
    const bills = await Bill.find(query).sort({ createdAt: -1 }).limit(500)
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
      } else if (it.refType === 'payment_inline' && it.walletId) {
        // inline-created wallet entries are removed (they only existed because of this bill)
        await Wallet.deleteOne({ _id: it.walletId })
      }
    }
    // remove any surplus-wallet entry tied to this bill
    await Wallet.deleteMany({ billId: bill._id, type: 'OldJewel', comment: { $regex: `Surplus from bill ${bill.billNumber}` } })

    await Bill.findByIdAndDelete(id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
