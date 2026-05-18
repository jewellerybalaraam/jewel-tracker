const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    lotNo: String,

    productName: String,

    pcs: Number,

    weight: Number,

    balancePcs: Number,

    balanceWeight: Number,

    designerName: String,

    lotDate: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Inventory",
  inventorySchema
);