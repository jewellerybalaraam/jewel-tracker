const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  barcode: String,

  weight: Number,

  status: {
    type: String,
    enum: [
      "PENDING",
      "SOLD",
      "RETURNED",
    ],
    default: "PENDING",
  },

  billBookNo: String,

  billPageNo: String,
});

const transactionSchema =
  new mongoose.Schema(
    {
      clientId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Client",
      },

      customerName: String,

      productName: String,

      mode: String,

      items: [itemSchema],

      pcsTracking: {
        totalPieces: Number,
        totalWeight: Number,
        returnedPieces: {
          type: Number,
          default: 0,
        },
        returnedWeight: {
          type: Number,
          default: 0,
        },
      },
    },
    {
      timestamps: true,
    }
  );

module.exports = mongoose.model(
  "Transaction",
  transactionSchema
);