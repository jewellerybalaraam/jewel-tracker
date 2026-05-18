import { useEffect, useState } from "react";
import axios from "axios";

import BarcodeScanner from "../components/BarcodeScanner";

function NewTransaction() {

  const [clients, setClients] =
    useState([]);

  const [filteredClients, setFilteredClients] =
    useState([]);

  const [selectedClient, setSelectedClient] =
    useState(null);

  const [customerName, setCustomerName] =
    useState("");

  const [productName, setProductName] =
    useState("");

  const [mode, setMode] =
    useState("barcode");

  const [barcodeInput, setBarcodeInput] =
    useState("");

  const [items, setItems] =
    useState([]);

  const [pcsTracking, setPcsTracking] =
    useState({
      totalPieces: "",
      totalWeight: "",
      returnedPieces: "",
      returnedWeight: "",
    });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {

    try {

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/clients`
      );

      setClients(res.data);

    } catch (error) {

      console.log(error);
    }
  };

  const handleAddBarcode = () => {

    if (!barcodeInput) {
      return;
    }

    setItems([
      ...items,
      {
        barcode: barcodeInput,
        weight: 0,
        status: "PENDING",
      },
    ]);

    setBarcodeInput("");
  };

  const handleSubmit = async () => {

    try {

      const payload = {
        clientId:
          selectedClient?._id,

        customerName,

        productName,

        mode,

        items,

        pcsTracking,
      };

      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/transactions`,
        payload
      );

      alert(
        "Transaction Added"
      );

      setCustomerName("");
      setProductName("");
      setItems([]);

      setPcsTracking({
        totalPieces: "",
        totalWeight: "",
        returnedPieces: "",
        returnedWeight: "",
      });

    } catch (error) {

      console.log(error);
    }
  };

  return (

    <div className="p-6">

      <div className="bg-white/5 p-6 rounded-3xl border border-white/10">

        <h1 className="text-3xl font-bold text-pink-400 mb-6">
          New Transaction
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* CLIENT SEARCH */}

          <div className="relative">

            <input
              type="text"
              placeholder="Search Client"
              value={customerName}
              onChange={(e) => {

                setCustomerName(
                  e.target.value
                );

                const filtered =
                  clients.filter((client) =>
                    client.name
                      .toLowerCase()
                      .includes(
                        e.target.value.toLowerCase()
                      )
                  );

                setFilteredClients(
                  filtered
                );
              }}
              className="p-4 rounded-2xl bg-black/20 w-full"
            />

            {filteredClients.length > 0 && (

              <div className="absolute z-50 w-full bg-black border border-white/10 rounded-2xl mt-2 max-h-60 overflow-y-auto">

                {filteredClients.map((client) => (

                  <div
                    key={client._id}
                    onClick={() => {

                      setCustomerName(
                        client.name
                      );

                      setSelectedClient(
                        client
                      );

                      setFilteredClients([]);
                    }}
                    className="p-4 hover:bg-white/10 cursor-pointer"
                  >

                    <p className="font-bold">
                      {client.name}
                    </p>

                    <p className="text-sm text-gray-400">
                      {client.storeName}
                    </p>

                  </div>

                ))}

              </div>

            )}

          </div>

          {/* PRODUCT */}

          <input
            type="text"
            placeholder="Product Name"
            value={productName}
            onChange={(e) =>
              setProductName(
                e.target.value
              )
            }
            className="p-4 rounded-2xl bg-black/20"
          />

        </div>

        {/* MODE */}

        <div className="flex gap-4 mt-6">

          <button
            onClick={() =>
              setMode("barcode")
            }
            className={`px-5 py-3 rounded-2xl font-bold
            ${
              mode === "barcode"
                ? "bg-pink-500"
                : "bg-black/20"
            }`}
          >
            Barcode Mode
          </button>

          <button
            onClick={() =>
              setMode("pcs")
            }
            className={`px-5 py-3 rounded-2xl font-bold
            ${
              mode === "pcs"
                ? "bg-pink-500"
                : "bg-black/20"
            }`}
          >
            PCS Mode
          </button>

        </div>

        {/* BARCODE MODE */}

        {mode === "barcode" && (

          <div className="mt-8 space-y-4">

            <BarcodeScanner
              onScan={(value) =>
                setBarcodeInput(value)
              }
            />

            <div className="flex flex-col md:flex-row gap-4">

              <input
                type="text"
                placeholder="Scan Barcode"
                value={barcodeInput}
                onChange={(e) =>
                  setBarcodeInput(
                    e.target.value
                  )
                }
                className="flex-1 p-4 rounded-2xl bg-black/20"
              />

              <button
                onClick={
                  handleAddBarcode
                }
                className="bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 rounded-2xl font-bold"
              >
                Add Barcode
              </button>

            </div>

            <div className="space-y-3">

              {items.map(
                (item, index) => (

                  <div
                    key={index}
                    className="bg-black/20 p-4 rounded-2xl flex justify-between"
                  >

                    <div>

                      <p className="font-bold">
                        {item.barcode}
                      </p>

                      <p className="text-sm text-gray-400">
                        {item.status}
                      </p>

                    </div>

                  </div>

                )
              )}

            </div>

          </div>

        )}

        {/* PCS MODE */}

        {mode === "pcs" && (

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">

            <input
              type="number"
              placeholder="Total Pieces"
              value={
                pcsTracking.totalPieces
              }
              onChange={(e) =>
                setPcsTracking({
                  ...pcsTracking,
                  totalPieces:
                    e.target.value,
                })
              }
              className="p-4 rounded-2xl bg-black/20"
            />

            <input
              type="number"
              placeholder="Total Weight"
              value={
                pcsTracking.totalWeight
              }
              onChange={(e) =>
                setPcsTracking({
                  ...pcsTracking,
                  totalWeight:
                    e.target.value,
                })
              }
              className="p-4 rounded-2xl bg-black/20"
            />

            <input
              type="number"
              placeholder="Returned Pieces"
              value={
                pcsTracking.returnedPieces
              }
              onChange={(e) =>
                setPcsTracking({
                  ...pcsTracking,
                  returnedPieces:
                    e.target.value,
                })
              }
              className="p-4 rounded-2xl bg-black/20"
            />

            <input
              type="number"
              placeholder="Returned Weight"
              value={
                pcsTracking.returnedWeight
              }
              onChange={(e) =>
                setPcsTracking({
                  ...pcsTracking,
                  returnedWeight:
                    e.target.value,
                })
              }
              className="p-4 rounded-2xl bg-black/20"
            />

          </div>

        )}

        {/* SUBMIT */}

        <button
          onClick={handleSubmit}
          className="mt-8 bg-gradient-to-r from-pink-500 to-purple-500 px-8 py-4 rounded-2xl font-bold"
        >
          Save Transaction
        </button>

      </div>

    </div>
  );
}

export default NewTransaction;