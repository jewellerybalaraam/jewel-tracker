const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema({
  barcode: {
    type: String,
    required: true,
    unique: true,
  },

  productName: {
    type: String,
    default: "",
  },

  weight: {
    type: Number,
    default: 0,
  },

  pcs: {
    type: Number,
    default: 0,
  },

  purity: {
    type: String,
    default: "",
  },

  category: {
    type: String,
    default: "",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model(
  "Inventory",
  inventorySchema
);