import { useState } from "react";
import axios from "axios";
import OCRScanner from "../components/OCRScanner";

function NewTransaction() {

  const [customerName, setCustomerName] =
    useState("");

  const [productName, setProductName] =
    useState("");

  const [mode, setMode] =
    useState("barcode");

  const [items, setItems] =
    useState([
      {
        barcode: "",
        weight: "",
        status: "PENDING",
      },
    ]);

  const [totalPieces, setTotalPieces] =
    useState(0);

  const [totalWeight, setTotalWeight] =
    useState(0);

  const [loading, setLoading] =
    useState(false);

  const addItem = () => {

    setItems([
      ...items,

      {
        barcode: "",
        weight: "",
        status: "PENDING",
      },
    ]);
  };

  const removeItem = (index) => {

    const updated = [...items];

    updated.splice(index, 1);

    setItems(updated);
  };

  const handleItemChange = (
    index,
    field,
    value
  ) => {

    const updated = [...items];

    updated[index][field] = value;

    setItems(updated);
  };

  const fetchInventoryData = async (
    barcode,
    index
  ) => {

    try {

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/inventory/${barcode}`
      );

      const data = res.data;

      setProductName(
        data.productName
      );

      const updated = [...items];

      updated[index] = {
        ...updated[index],
        barcode: data.barcode,
        weight: data.weight,
      };

      setItems(updated);

      setTotalPieces(
        data.pcs || 0
      );

      setTotalWeight(
        data.weight || 0
      );

    } catch (error) {

      console.log(error);
    }
  };

  const handleSubmit = async () => {

    try {

      setLoading(true);

      const data = {
        customerName,
        productName,
        mode,
        items,

        totalPieces,

        totalWeight,
      };

      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/transactions/create`,
        data
      );

      console.log(
        "Transaction Added Successfully"
      );

      setCustomerName("");
      setProductName("");

      setItems([
        {
          barcode: "",
          weight: "",
          status: "PENDING",
        },
      ]);

      setTotalPieces(0);
      setTotalWeight(0);

    } catch (error) {

      console.log(error);

      console.log(
        "Failed To Add Transaction"
      );

    } finally {

      setLoading(false);
    }
  };

  return (

    <div className="p-4 sm:p-6 md:p-8">

      <div className="max-w-5xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-8">

        <h1 className="text-3xl font-bold text-pink-400 mb-8">
          New Transaction
        </h1>

        {/* CUSTOMER */}

        <div className="mb-5">

          <label className="block mb-2 font-semibold">
            Customer Name
          </label>

          <input
            type="text"
            value={customerName}
            onChange={(e) =>
              setCustomerName(
                e.target.value
              )
            }
            className="w-full p-4 rounded-2xl bg-white/10 border border-white/10 outline-none"
            placeholder="Enter Customer Name"
          />

        </div>

        {/* PRODUCT */}

        <div className="mb-5">

          <label className="block mb-2 font-semibold">
            Product Name
          </label>

          <input
            type="text"
            value={productName}
            onChange={(e) =>
              setProductName(
                e.target.value
              )
            }
            className="w-full p-4 rounded-2xl bg-white/10 border border-white/10 outline-none"
            placeholder="Enter Product Name"
          />

        </div>

        {/* MODE */}

        <div className="mb-8">

          <label className="block mb-2 font-semibold">
            Transaction Mode
          </label>

          <select
            value={mode}
            onChange={(e) =>
              setMode(e.target.value)
            }
            className="w-full p-4 rounded-2xl bg-white/10 border border-white/10 outline-none"
          >

            <option value="barcode">
              Barcode Mode
            </option>

            <option value="pcs">
              PCS Mode
            </option>

          </select>

        </div>

        {/* BARCODE MODE */}

        {mode === "barcode" && (

          <div className="space-y-6 mb-8">

            {items.map((item, index) => (

              <div
                key={index}
                className="bg-black/30 p-5 rounded-3xl space-y-4"
              >

                <div>

                  <label className="block mb-2 font-semibold">
                    Barcode
                  </label>

                  <input
                    type="text"
                    value={item.barcode}

                    onChange={(e) =>
                      handleItemChange(
                        index,
                        "barcode",
                        e.target.value
                      )
                    }

                    className="w-full p-4 rounded-2xl bg-white/10 border border-white/10 outline-none"

                    placeholder="Scan / Enter Barcode"
                  />

                </div>

                {/* OCR SCANNER */}

                <OCRScanner
                  onDetected={(barcode) => {

                    const updated = [...items];

                    updated[index].barcode =
                      barcode;

                    setItems(updated);

                    fetchInventoryData(
                      barcode,
                      index
                    );
                  }}
                />

                <div>

                  <label className="block mb-2 font-semibold">
                    Weight
                  </label>

                  <input
                    type="number"
                    value={item.weight}

                    onChange={(e) =>
                      handleItemChange(
                        index,
                        "weight",
                        e.target.value
                      )
                    }

                    className="w-full p-4 rounded-2xl bg-white/10 border border-white/10 outline-none"

                    placeholder="Weight"
                  />

                </div>

                <button
                  onClick={() =>
                    removeItem(index)
                  }
                  className="bg-red-500 px-5 py-3 rounded-2xl font-bold"
                >
                  Remove
                </button>

              </div>

            ))}

            <button
              onClick={addItem}
              className="bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-4 rounded-2xl font-bold"
            >
              Add Barcode
            </button>

          </div>

        )}

        {/* PCS MODE */}

        {mode === "pcs" && (

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">

            <div>

              <label className="block mb-2 font-semibold">
                Total PCS
              </label>

              <input
                type="number"
                value={totalPieces}
                onChange={(e) =>
                  setTotalPieces(
                    e.target.value
                  )
                }
                className="w-full p-4 rounded-2xl bg-white/10 border border-white/10 outline-none"
              />

            </div>

            <div>

              <label className="block mb-2 font-semibold">
                Total Weight
              </label>

              <input
                type="number"
                value={totalWeight}
                onChange={(e) =>
                  setTotalWeight(
                    e.target.value
                  )
                }
                className="w-full p-4 rounded-2xl bg-white/10 border border-white/10 outline-none"
              />

            </div>

          </div>

        )}

        {/* SUBMIT */}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-gradient-to-r from-pink-500 via-orange-500 to-purple-500 py-4 rounded-2xl font-bold text-lg"
        >

          {loading
            ? "Saving..."
            : "Create Transaction"}

        </button>

      </div>

    </div>
  );
}

export default NewTransaction;