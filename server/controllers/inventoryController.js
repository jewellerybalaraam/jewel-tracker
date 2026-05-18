const XLSX = require("xlsx");

const Inventory = require(
  "../models/Inventory"
);

const uploadInventory =
  async (req, res) => {

    try {

      const workbook =
        XLSX.read(
          req.file.buffer,
          {
            type: "buffer",
          }
        );

      const sheetName =
        workbook.SheetNames[0];

      const sheet =
        workbook.Sheets[sheetName];

      const data =
        XLSX.utils.sheet_to_json(
          sheet,
          {
            defval: "",
            range: 2,
          }
        );

      const formattedData =
        data.map((row) => ({

          lotNo:
            row["LOT NO"] || "",

          productName:
            row["PRODUCTNAME"] || "",

          pcs:
            Number(
              row["LOT PCS"]
            ) || 0,

          weight:
            Number(
              row["LOT NET WT"]
            ) || 0,

          balancePcs:
            Number(
              row["BAL PCS"]
            ) || 0,

          balanceWeight:
            Number(
              row["BAL NET WT"]
            ) || 0,

          designerName:
            row["DESIGNER NAME"] || "",

          lotDate:
            row["LOTDATE"] || "",
        }));

      await Inventory.deleteMany();

      await Inventory.insertMany(
        formattedData
      );

      res.json({
        success: true,
        count:
          formattedData.length,
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        success: false,
      });
    }
  };

const getInventory =
  async (req, res) => {

    try {

      const inventory =
        await Inventory.find();

      res.json(inventory);

    } catch (error) {

      console.log(error);

      res.status(500).json({
        success: false,
      });
    }
  };

module.exports = {
  uploadInventory,
  getInventory,
};