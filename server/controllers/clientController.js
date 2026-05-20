import Client from '../models/Client.js'

export const createClient = async (req, res) => {
  try {
    const client = await Client.create(req.body)
    res.json(client)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Failed to Create Client' })
  }
}

export const getClients = async (req, res) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 })
    res.json(clients)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Failed to Fetch Clients' })
  }
}

export const updateClient = async (req, res) => {
  try {
    const { clientId } = req.params
    const client = await Client.findByIdAndUpdate(
      clientId,
      { $set: req.body },
      { new: true }
    )
    if (!client) {
      return res.status(404).json({ message: 'Client Not Found' })
    }
    res.json(client)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Failed to Update Client' })
  }
}