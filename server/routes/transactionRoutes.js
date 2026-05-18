const express = require(
  "express"
);

const router =
  express.Router();

const {
  createTransaction,
  getTransactions,
  updateItemStatus,
} = require(
  "../controllers/transactionController"
);

router.post(
  "/",
  createTransaction
);

router.get(
  "/",
  getTransactions
);

router.put(
  "/:transactionId/:itemIndex",
  updateItemStatus
);

module.exports = router;