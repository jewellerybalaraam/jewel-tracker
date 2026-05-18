
import {
  useEffect,
  useRef,
  useState,
} from "react";

import axios from "axios";

import BarcodeScanner from "../components/BarcodeScanner";

function NewTransaction() {

  const [customerName, setCustomerName] =
    useState("");

  const [storeName, setStoreName] =
    useState("");

  const [whatsappNumber, setWhatsappNumber] =
    useState("");

  const [productName, setProductName] =
    useState("");

  const [mode, setMode] =
    useState("barcode");

  const [barcode, setBarcode] =
    useState("");

  const [weight, setWeight] =
    useState("");

  const [items, setItems] =
    useState([]);

  const [totalPcs, setTotalPcs] =
    useState("");

  const [totalWeight, setTotalWeight] =
    useState("");

  const barcodeInputRef =
    useRef(null);

  useEffect(() => {

    if (
      barcodeInputRef.current
    ) {

      barcodeInputRef.current.focus();
    }

  }, []);

  const addBarcode = () => {

    if (!barcode) {
      return;
    }

    const exists = items.some(
      (item) =>
        item.barcode === barcode
    );

    if (exists) {

      alert(
        "Barcode already added"
      );

      return;
    }

    setItems([
      ...items,
      {
        barcode,
        weight,
        status: "PENDING",
      },
    ]);

    setBarcode("");
    setWeight("");

    setTimeout(() => {

      barcodeInputRef.current?.focus();

    }, 100);
  };

  const handleSubmit = async () => {

    try {

      const payload = {

        customerName,

        storeName,

        whatsappNumber,

        productName,

        mode,

        items,

        totalPcs,

        totalWeight,

        returnedPcs: 0,

        returnedWeight: 0,
      };

      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/transactions`,
        payload
      );

      alert(
        "Transaction Added Successfully"
      );

      setCustomerName("");
      setStoreName("");
      setWhatsappNumber("");
      setProductName("");
      setBarcode("");
      setWeight("");
      setItems([]);
      setTotalPcs("");
      setTotalWeight("");

    } catch (error) {

      console.log(error);

      alert(
        "Failed to Add Transaction"
      );
    }
  };

  return (

    <div className="p-4 sm:p-6 md:p-8 min-h-screen text-white">

      <div className="max-w-6xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">

        <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent mb-8">

          New Transaction

        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

          <input
            type="text"
            placeholder="Customer Name"
            value={customerName}
            onChange={(e) =>
              setCustomerName(
                e.target.value
              )
            }
            className="p-4 rounded-2xl bg-white/10 border border-white/10 outline-none"
          />

          <input
            type="text"
            placeholder="Store Name"
            value={storeName}
            onChange={(e) =>
              setStoreName(
                e.target.value
              )
            }
            className="p-4 rounded-2xl bg-white/10 border border-white/10 outline-none"
          />

          <input
            type="text"
            placeholder="WhatsApp Number"
            value={whatsappNumber}
            onChange={(e) =>
              setWhatsappNumber(
                e.target.value
              )
            }
            className="p-4 rounded-2xl bg-white/10 border border-white/10 outline-none"
          />

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

          <input
            type="text"
            placeholder="Product Name"
            value={productName}
            onChange={(e) =>
              setProductName(
                e.target.value
              )
            }
            className="p-4 rounded-2xl bg-white/10 border border-white/10 outline-none"
          />

          <select
            value={mode}
            onChange={(e) =>
              setMode(e.target.value)
            }
            className="p-4 rounded-2xl bg-white/10 border border-white/10 outline-none"
          >

            <option value="barcode">
              Barcode Mode
            </option>

            <option value="pcs">
              PCS Mode
            </option>

          </select>

        </div>

        {mode === "barcode" && (

          <>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">

              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan Barcode"
                value={barcode}
                onChange={(e) =>
                  setBarcode(
                    e.target.value
                  )
                }
                onKeyDown={(e) => {

                  if (
                    e.key === "Enter"
                  ) {
                    addBarcode();
                  }
                }}
                className="p-4 rounded-2xl bg-white/10 border border-white/10 outline-none"
              />

              <input
                type="number"
                placeholder="Weight"
                value={weight}
                onChange={(e) =>
                  setWeight(
                    e.target.value
                  )
                }
                className="p-4 rounded-2xl bg-white/10 border border-white/10 outline-none"
              />

              <button
                onClick={addBarcode}
                className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl font-bold"
              >

                Add Barcode

              </button>

            </div>

            <div className="mb-6">

              <BarcodeScanner
                onScan={(value) => {
                  setBarcode(value);
                }}
              />

            </div>

            <div className="space-y-3 mb-6">

              {items.map(
                (item, index) => (

                  <div
                    key={index}
                    className="bg-black/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  >

                    <div>

                      <p className="font-bold break-all">
                        {item.barcode}
                      </p>

                      <p className="text-gray-400 text-sm">
                        {item.weight} g
                      </p>

                    </div>

                    <span className="bg-yellow-400 text-black px-4 py-2 rounded-xl font-bold w-fit">

                      {item.status}

                    </span>

                  </div>
                )
              )}

            </div>

          </>

        )}

        {mode === "pcs" && (

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

            <input
              type="number"
              placeholder="Total PCS"
              value={totalPcs}
              onChange={(e) =>
                setTotalPcs(
                  e.target.value
                )
              }
              className="p-4 rounded-2xl bg-white/10 border border-white/10 outline-none"
            />

            <input
              type="number"
              placeholder="Total Weight"
              value={totalWeight}
              onChange={(e) =>
                setTotalWeight(
                  e.target.value
                )
              }
              className="p-4 rounded-2xl bg-white/10 border border-white/10 outline-none"
            />

          </div>

        )}

        <button
          onClick={handleSubmit}
          className="w-full py-4 rounded-2xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 text-lg"
        >

          Save Transaction

        </button>

      </div>

    </div>
  );
}

export default NewTransaction;
