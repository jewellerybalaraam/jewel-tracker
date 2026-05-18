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
          }
        );

      console.log(data[0]);

      const formattedData =
        data.map((row) => {

          const keys =
            Object.keys(row);

          return {

            lotNo:
              row[keys[0]] || "",

            productName:
              row[keys[1]] || "",

            pcs:
              Number(
                row[keys[2]]
              ) || 0,

            weight:
              Number(
                row[keys[3]]
              ) || 0,

            balancePcs:
              Number(
                row[keys[4]]
              ) || 0,

            balanceWeight:
              Number(
                row[keys[5]]
              ) || 0,

            designerName:
              row[keys[6]] || "",

            lotDate:
              row[keys[7]] || "",
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