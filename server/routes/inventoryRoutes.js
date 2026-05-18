const express = require("express");

const multer = require("multer");

const router = express.Router();

const {
  uploadInventory,
  getInventory,
} = require(
  "../controllers/inventoryController"
);

const storage =
  multer.memoryStorage();

const upload = multer({
  storage,
});

router.post(
  "/upload",
  upload.single("file"),
  uploadInventory
);

router.get(
  "/",
  getInventory
);

module.exports = router;