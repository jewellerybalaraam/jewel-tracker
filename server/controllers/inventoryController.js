const Inventory = require("../models/Inventory");
const XLSX = require("xlsx");

const uploadInventory = async (
  req,
  res
) => {

  try {

    const workbook = XLSX.read(
      req.file.buffer,
      {
        type: "buffer",
      }
    );

    const sheetName =
      workbook.SheetNames[0];

    const data = XLSX.utils.sheet_to_json(
      workbook.Sheets[sheetName]
    );

    let inserted = 0;

    for (const item of data) {

      const exists =
        await Inventory.findOne({
          barcode: item.barcode || "",
        });

      if (!exists) {

        await Inventory.create({
          barcode: item.barcode,
          productName:
            item.productName,

          weight: Number(item.weight) || 0,
pcs: Number(item.pcs) || 0,

          purity: item.purity,

          category: item.category,
        });

        inserted++;
      }
    }

    res.json({
      success: true,
      inserted,
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: "Upload Failed",
    });
  }
};

const getInventoryByBarcode = async (
  req,
  res
) => {

  try {

    const item =
      await Inventory.findOne({
        barcode: req.params.barcode,
      });

    if (!item) {

      return res.status(404).json({
        message: "Item not found",
      });
    }

    res.json(item);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: "Fetch Failed",
    });
  }
};

module.exports = {
  uploadInventory,
  getInventoryByBarcode,
};