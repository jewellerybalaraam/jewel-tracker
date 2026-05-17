const express = require("express");
const multer = require("multer");

const {
  uploadInventory,
  getInventoryByBarcode,
} = require(
  "../controllers/inventoryController"
);

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage,
});

router.post(
  "/upload",
  upload.single("file"),
  uploadInventory
);

router.get(
  "/:barcode",
  getInventoryByBarcode
);

module.exports = router;