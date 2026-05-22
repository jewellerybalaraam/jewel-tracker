import Wallet from '../models/Wallet.js'

export const createWalletEntry = async (req, res) => {
  try {
    const entry = await Wallet.create(req.body)
    res.json(entry)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

export const getWalletByClient = async (req, res) => {
  try {
    const { clientName } = req.params
    const entries = await Wallet.find({
      clientName: { $regex: `^${clientName}$`, $options: 'i' },
    }).sort({ date: -1 })
    res.json(entries)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

export const updateWalletEntry = async (req, res) => {
  try {
    const { id } = req.params
    const update = { ...req.body }
    if (update.date) update.date = new Date(update.date)
    const entry = await Wallet.findByIdAndUpdate(id, { $set: update }, { new: true })
    if (!entry) return res.status(404).json({ message: 'Not Found' })
    res.json(entry)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}

export const deleteWalletEntry = async (req, res) => {
  try {
    const { id } = req.params
    const entry = await Wallet.findByIdAndDelete(id)
    if (!entry) return res.status(404).json({ message: 'Not Found' })
    res.json({ success: true })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}
