const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    mobile: {
      type: String,
      required: true,
    },

    whatsapp: {
      type: String,
    },

    storeName: {
      type: String,
    },

    address: {
      type: String,
    },

    gstNo: {
      type: String,
    },

    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Client",
  clientSchema
);