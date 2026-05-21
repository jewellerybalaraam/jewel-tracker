import Client from '../models/Client.js'


export const createClient = async (req, res) => {
  try {
    const { clientName, mobiles } = req.body

    const existing = await Client.findOne({ clientName })
    if (existing) {
      return res.status(400).json({ message: 'Client already exists' })
    }

    const client = await Client.create({
      clientName,
      mobiles: mobiles || [],
    })

    res.json(client)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}


export const getClients = async (req, res) => {
  try {
    const { q } = req.query

    const query = q
      ? { clientName: { $regex: q, $options: 'i' } }
      : {}

    const clients = await Client.find(query).sort({ clientName: 1 })
    res.json(clients)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}


// Add a mobile number to existing client
export const addMobile = async (req, res) => {
  try {
    const { clientName } = req.params
    const { mobile } = req.body

    const client = await Client.findOneAndUpdate(
      { clientName },
      { $addToSet: { mobiles: mobile } },
      { new: true }
    )

    if (!client) return res.status(404).json({ message: 'Client Not Found' })

    res.json(client)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}


// Remove a mobile number
export const removeMobile = async (req, res) => {
  try {
    const { clientName } = req.params
    const { mobile } = req.body

    const client = await Client.findOneAndUpdate(
      { clientName },
      { $pull: { mobiles: mobile } },
      { new: true }
    )

    if (!client) return res.status(404).json({ message: 'Client Not Found' })

    res.json(client)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}


// Update client name
export const updateClient = async (req, res) => {
  try {
    const { clientName } = req.params
    const { newClientName } = req.body

    const client = await Client.findOneAndUpdate(
      { clientName },
      { $set: { clientName: newClientName } },
      { new: true }
    )

    if (!client) return res.status(404).json({ message: 'Client Not Found' })

    res.json(client)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message })
  }
}