import { useState } from "react";
import axios from "axios";
import { Scanner } from "@yudiel/react-qr-scanner";

function NewTransaction() {

  const [customerName, setCustomerName] = useState("");

  const [productName, setProductName] = useState("");

  const [mode, setMode] = useState("barcode");

  const [items, setItems] = useState([
    {
      barcode: "",
      weight: "",
    },
  ]);

  const [totalWeight, setTotalWeight] = useState("");

  const [totalPieces, setTotalPieces] = useState("");

  const [scannerIndex, setScannerIndex] = useState(null);

  const handleItemChange = (
    index,
    field,
    value
  ) => {

    const updated = [...items];

    updated[index][field] = value;

    setItems(updated);
  };

  const addRow = () => {

    setItems([
      ...items,
      {
        barcode: "",
        weight: "",
      },
    ]);
  };

  const removeRow = (index) => {

    const updated = [...items];

    updated.splice(index, 1);

    setItems(updated);
  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    try {

      const data = {
        customerName,

        productName,

        mode,

        items:
          mode === "barcode"
            ? items.map((item) => ({
                barcode: item.barcode,
                weight: Number(item.weight),
                status: "PENDING",
              }))
            : [],

        pcsTracking:
          mode === "pcs"
            ? {
                totalWeight:
                  Number(totalWeight),

                totalPieces:
                  Number(totalPieces),
              }
            : {},
      };

      await axios.post(
        "${import.meta.env.VITE_API_URL}/api/transactions/create",
        data
      );

      alert("Transaction Added");

      setCustomerName("");

      setProductName("");

      setMode("barcode");

      setItems([
        {
          barcode: "",
          weight: "",
        },
      ]);

      setTotalWeight("");

      setTotalPieces("");

    } catch (error) {

      console.log(error);
    }
  };

  return (
    <div className="bg-transparent text-white p-4 sm:p-6 md:p-8">

      <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent mb-8">
        New Transaction
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >

        <input
          type="text"
          placeholder="Customer Name"
          className="w-full p-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/10"
          value={customerName}
          onChange={(e) =>
            setCustomerName(e.target.value)
          }
        />

        <input
          type="text"
          placeholder="Product Name"
          className="w-full p-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/10"
          value={productName}
          onChange={(e) =>
            setProductName(e.target.value)
          }
        />

        <div className="flex flex-col sm:flex-row gap-5">

          <label className="flex items-center gap-3 bg-white/10 px-5 py-3 rounded-2xl">

            <input
              type="radio"
              value="barcode"
              checked={mode === "barcode"}
              onChange={(e) =>
                setMode(e.target.value)
              }
            />

            Barcode Mode

          </label>

          <label className="flex items-center gap-3 bg-white/10 px-5 py-3 rounded-2xl">

            <input
              type="radio"
              value="pcs"
              checked={mode === "pcs"}
              onChange={(e) =>
                setMode(e.target.value)
              }
            />

            PCS Mode

          </label>

        </div>

        {/* BARCODE MODE */}

        {mode === "barcode" && (

          <div className="space-y-5">

            {items.map((item, index) => (

              <div
                key={index}
                className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4"
              >

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <input
  type="text"
  value={barcode}
  onChange={(e) => setBarcode(e.target.value)}
  placeholder="Scan Barcode"
  autoFocus
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      handleBarcodeSearch();
    }
  }}
  className="w-full p-4 rounded-xl bg-white/10 border border-white/20 outline-none"
/>

                  <input
                    type="number"
                    placeholder="Weight"
                    className="p-4 rounded-2xl bg-black/30 backdrop-blur-lg border border-white/10"
                    value={item.weight}
                    onChange={(e) =>
                      handleItemChange(
                        index,
                        "weight",
                        e.target.value
                      )
                    }
                  />

                </div>

                <div className="flex flex-col sm:flex-row gap-3">

                  <button
                    type="button"
                    onClick={() =>
                      setScannerIndex(index)
                    }
                    className="bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-3 rounded-2xl font-bold"
                  >
                    Scan QR
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      removeRow(index)
                    }
                    className="bg-red-500 px-5 py-3 rounded-2xl font-bold"
                  >
                    Remove
                  </button>

                </div>

                {scannerIndex === index && (

                  <div className="overflow-hidden rounded-3xl border border-white/10">

                    <Scanner
                      onScan={(result) => {

                        if (
                          result?.[0]?.rawValue
                        ) {

                          const updated =
                            [...items];

                          updated[index].barcode =
                            result[0].rawValue;

                          setItems(updated);

                          setScannerIndex(null);
                        }
                      }}
                      onError={(err) =>
                        console.log(err)
                      }
                    />

                  </div>
                )}

              </div>
            ))}

            <button
              type="button"
              onClick={addRow}
              className="bg-blue-500 px-6 py-3 rounded-2xl font-bold"
            >
              Add Barcode
            </button>

          </div>
        )}

        {/* PCS MODE */}

        {mode === "pcs" && (

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <input
              type="number"
              placeholder="Total Weight"
              className="p-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/10"
              value={totalWeight}
              onChange={(e) =>
                setTotalWeight(e.target.value)
              }
            />

            <input
              type="number"
              placeholder="Total Pieces"
              className="p-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/10"
              value={totalPieces}
              onChange={(e) =>
                setTotalPieces(e.target.value)
              }
            />

          </div>
        )}

        <button
          type="submit"
          className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-orange-500 to-purple-500 px-8 py-4 rounded-2xl font-black text-white shadow-2xl"
        >
          Save Transaction
        </button>

      </form>

    </div>
  );
}

export default NewTransaction;
