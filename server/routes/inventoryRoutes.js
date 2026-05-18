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

router.get("/:barcode", async (req, res) => {

  try {

    const inventory =
      await Inventory.findOne({
        lotNo: req.params.barcode,
      });

    res.json(inventory);

  } catch (error) {

    res.status(500).json({
      message: "Inventory Search Failed",
    });
  }
});

module.exports = router;