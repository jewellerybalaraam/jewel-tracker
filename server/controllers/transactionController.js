const Transaction = require("../models/Transaction");
const Customer = require("../models/Customer");

exports.createTransaction = async (req, res) => {

  try {

    const {
      customerName,
      productName,
      mode,
      items,
      pcsTracking,
    } = req.body;

    let customer = await Customer.findOne({
      name: customerName,
    });

    if (!customer) {

      customer = await Customer.create({
        name: customerName,
      });
    }

    const transaction = await Transaction.create({
      customerId: customer._id,

      productName,

      mode,

      items: mode === "barcode" ? items : [],

      pcsTracking:
        mode === "pcs"
          ? pcsTracking
          : {},
    });

    res.status(201).json(transaction);

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getAllTransactions = async (req, res) => {

  try {

    const transactions = await Transaction.find()
      .populate("customerId")
      .sort({ createdAt: -1 });

    const formatted = transactions.map((t) => ({

      _id: t._id,

      customerName: t.customerId?.name,

      productName: t.productName,

      mode: t.mode,

      items: t.items,

      pcsTracking: t.pcsTracking,

      createdAt: t.createdAt,
    }));

    res.json(formatted);

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });
  }
};

exports.updateItemStatus = async (req, res) => {

  try {

    const { transactionId, itemIndex, status } = req.body;

    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    transaction.items[itemIndex].status = status;

    await transaction.save();

    res.json({
      message: "Status updated",
      transaction,
    });

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });
  }
};

exports.searchBarcode = async (req, res) => {

  try {

    const { barcode } = req.params;

    const transactions = await Transaction.find({
      "items.barcode": barcode,
    }).populate("customerId");

    const results = [];

    transactions.forEach((transaction) => {

      transaction.items.forEach((item) => {

        if (item.barcode === barcode) {

          results.push({
            customerName: transaction.customerId?.name,

            productName: transaction.productName,

            barcode: item.barcode,

            weight: item.weight,

            status: item.status,

            date: transaction.createdAt,
          });
        }
      });
    });

    res.json(results);

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });
  }
};

exports.customerHistory = async (req, res) => {

  try {

    const { customerName } = req.params;

    const { from, to } = req.query;

    const Customer = require("../models/Customer");

    const customer = await Customer.findOne({
      name: {
        $regex: customerName,
        $options: "i",
      },
    });

    if (!customer) {
      return res.json([]);
    }

    let filter = {
      customerId: customer._id,
    };

    if (from && to) {

      filter.createdAt = {
        $gte: new Date(from),
        $lte: new Date(to),
      };
    }

    const transactions = await Transaction.find(filter)
      .populate("customerId")
      .sort({ createdAt: -1 });

    res.json(transactions);

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });
  }
};

exports.updatePCS = async (req, res) => {

  try {

    const {
      transactionId,
      pcsTracking,
    } = req.body;

    const transaction =
      await Transaction.findById(transactionId);

    if (!transaction) {

      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    transaction.pcsTracking = pcsTracking;

    await transaction.save();

    res.json({
      message: "PCS Updated",
    });

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });
  }
};