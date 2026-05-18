const Transaction = require(
  "../models/Transaction"
);

const createTransaction =
  async (req, res) => {

    try {

      const transaction =
        await Transaction.create(
          req.body
        );

      res.json(transaction);

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message:
          "Failed to Create Transaction",
      });
    }
  };

const getTransactions =
  async (req, res) => {

    try {

      const transactions =
        await Transaction.find()

          .populate("clientId")

          .sort({
            createdAt: -1,
          });

      res.json(transactions);

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message:
          "Failed to Fetch Transactions",
      });
    }
  };

const updateItemStatus =
  async (req, res) => {

    try {

      const {
        transactionId,
        barcode,
        status,
        billBookNo,
        billPageNo,
      } = req.body;

      const transaction =
        await Transaction.findById(
          transactionId
        );

      if (!transaction) {

        return res.status(404).json({
          message:
            "Transaction Not Found",
        });
      }

      const item =
        transaction.items.find(
          (i) =>
            i.barcode === barcode
        );

      if (!item) {

        return res.status(404).json({
          message:
            "Item Not Found",
        });
      }

      item.status = status;

      if (status === "SOLD") {

        item.billBookNo =
          billBookNo || "";

        item.billPageNo =
          billPageNo || "";
      }

      await transaction.save();

      res.json({
        success: true,
        message:
          "Item Status Updated",
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message:
          "Failed to Update Status",
      });
    }
  };

module.exports = {
  createTransaction,
  getTransactions,
  updateItemStatus,
};