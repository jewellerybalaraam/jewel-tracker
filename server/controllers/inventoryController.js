const XLSX = require("xlsx");

const Inventory = require(
  "../models/Inventory"
);

const cleanKey = (key) => {

  return key
    ?.toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
};

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

      const rawData =
        XLSX.utils.sheet_to_json(
          sheet,
          {
            defval: "",
          }
        );

      const formattedData =
        rawData.map((row) => {

          const cleanedRow = {};

          Object.keys(row).forEach(
            (key) => {

              cleanedRow[
                cleanKey(key)
              ] = row[key];
            }
          );

          return {

            lotNo:
              cleanedRow.lotno || "",

            productName:
              cleanedRow.productname || "",

            pcs:
              Number(
                cleanedRow.pcs
              ) || 0,

            weight:
              Number(
                cleanedRow.weight
              ) || 0,

            balancePcs:
              Number(
                cleanedRow.balancepcs
              ) || 0,

            balanceWeight:
              Number(
                cleanedRow.balanceweight
              ) || 0,

            designerName:
              cleanedRow.designername || "",

            lotDate:
              cleanedRow.lotdate || "",
          };
        });

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