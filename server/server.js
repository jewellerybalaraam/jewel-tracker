const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const transactionRoutes =
  require("./routes/transactionRoutes");

const inventoryRoutes =
  require("./routes/inventoryRoutes");

const clientRoutes =
  require("./routes/clientRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use(
  "/api/transactions",
  transactionRoutes
);

app.use(
  "/api/inventory",
  inventoryRoutes
);

app.use(
  "/api/clients",
  clientRoutes
);

app.get("/", (req, res) => {
  res.send("Jewel ERP API Running");
});

const PORT =
  process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");

    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `Server running on port ${PORT}`
        );
      }
    );
  })
  .catch((err) => {
    console.error(err);
  });