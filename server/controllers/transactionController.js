import Transaction from '../models/Transaction.js'

export const createTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.create(req.body)
    res.json(transaction)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Failed to Create Transaction' })
  }
}

export const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('clientId')
      .sort({ transactionDate: -1 })
    res.json(transactions)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Failed to Fetch Transactions' })
  }
}

// Update transaction date (and optionally customerName, productName)
export const updateTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params
    const { transactionDate, customerName, productName } = req.body

    const update = {}
    if (transactionDate) update.transactionDate = new Date(transactionDate)
    if (customerName)    update.customerName    = customerName
    if (productName)     update.productName     = productName

    const transaction = await Transaction.findByIdAndUpdate(
      transactionId,
      { $set: update },
      { new: true }
    )

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction Not Found' })
    }

    res.json({ success: true, transaction })

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Failed to Update Transaction' })
  }
}

export const updateItemStatus = async (req, res) => {
  try {
    const { transactionId } = req.params
    const { barcode, status, billBookNo, billPageNo } = req.body

    const transaction = await Transaction.findById(transactionId)

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction Not Found' })
    }

    const item = transaction.items.find((i) => i.barcode === barcode)

    if (!item) {
      return res.status(404).json({ message: 'Item Not Found' })
    }

    item.status = status

    if (status === 'SOLD') {
      item.billBookNo = billBookNo || ''
      item.billPageNo = billPageNo || ''
    }

    await transaction.save()

    res.json({ success: true, message: 'Item Status Updated' })

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Failed to Update Status' })
  }
}

export const getTransactionsByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params

    const transactions = await Transaction.find({
      'items.barcode': barcode,
    }).populate('clientId')

    const results = []

    transactions.forEach((t) => {
      t.items.forEach((item) => {
        if (item.barcode === barcode) {
          results.push({
            transactionId: t._id,
            customerName:  t.customerName,
            productName:   t.productName,
            barcode:       item.barcode,
            weight:        item.weight,
            status:        item.status,
            billBookNo:    item.billBookNo,
            billPageNo:    item.billPageNo,
            createdAt:     t.transactionDate || t.createdAt,
          })
        }
      })
    })

    res.json(results)

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Failed to Search by Barcode' })
  }
}

export const getTransactionsByCustomer = async (req, res) => {
  try {
    const { customerName } = req.params
    const { from, to } = req.query

    const query = {
      customerName: { $regex: customerName, $options: 'i' },
    }

    if (from && to) {
      query.transactionDate = {
        $gte: new Date(from),
        $lte: new Date(new Date(to).setHours(23, 59, 59, 999)),
      }
    }

    const transactions = await Transaction.find(query)
      .populate('clientId')
      .sort({ transactionDate: -1 })

    res.json(transactions)

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Failed to Fetch Customer History' })
  }
}