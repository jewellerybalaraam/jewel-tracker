const Client = require("../models/Client");

const createClient = async (
  req,
  res
) => {
  try {
    const client = await Client.create(
      req.body
    );

    res.json(client);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Failed to Create Client",
    });
  }
};

const getClients = async (
  req,
  res
) => {
  try {
    const clients = await Client.find().sort({
      createdAt: -1,
    });

    res.json(clients);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Failed to Fetch Clients",
    });
  }
};

module.exports = {
  createClient,
  getClients,
};