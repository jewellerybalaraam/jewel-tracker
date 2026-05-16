const express = require("express");

const router = express.Router();

const {
  createTransaction,
  getAllTransactions,
  updateItemStatus,
  searchBarcode,
  customerHistory,
  updatePCS,
} = require("../controllers/transactionController");

router.post("/create", createTransaction);

router.get("/", getAllTransactions);

router.put("/update-status", updateItemStatus);

router.get("/barcode/:barcode", searchBarcode);

router.get("/customer/:customerName", customerHistory);

router.put("/update-pcs", updatePCS);

module.exports = router;