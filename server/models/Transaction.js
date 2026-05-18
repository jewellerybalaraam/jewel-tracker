const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  barcode: String,

  weight: Number,

  status: {
    type: String,
    enum: ["PENDING", "RETURNED", "SOLD"],
    default: "PENDING",
  },
});

const transactionSchema = new mongoose.Schema(
  {
    customerName: {
  type: String,
  required: true,
},

    productName: {
      type: String,
      required: true,
    },

    mode: {
      type: String,
      enum: ["barcode", "pcs"],
      required: true,
    },

    items: [itemSchema],

    pcsTracking: {

      totalWeight: Number,

      totalPieces: Number,

      returnedWeight: {
        type: Number,
        default: 0,
      },

      returnedPieces: {
        type: Number,
        default: 0,
      },

      soldWeight: {
        type: Number,
        default: 0,
      },

      soldPieces: {
        type: Number,
        default: 0,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "Transaction",
  transactionSchema
);