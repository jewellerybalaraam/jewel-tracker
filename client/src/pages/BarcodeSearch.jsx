import { useState } from "react";
import axios from "axios";
import { Scanner } from "@yudiel/react-qr-scanner";

function BarcodeSearch() {

  const [barcode, setBarcode] =
    useState("");

  const [results, setResults] =
    useState([]);

  const [showScanner, setShowScanner] =
    useState(false);

  const searchBarcode = async (
    customBarcode
  ) => {

    try {

      const code =
        customBarcode || barcode;

      const res = await axios.get(
        `http://localhost:5000/api/transactions/barcode/${code}`
      );

      setResults(res.data);

    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">

      <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent mb-8">
        Barcode Search
      </h1>

      <div className="flex flex-col md:flex-row gap-4 mb-6">

        <input
          type="text"
          placeholder="Enter Barcode"
          className="flex-1 p-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/10"
          value={barcode}
          onChange={(e) =>
            setBarcode(e.target.value)
          }
        />

        <button
          onClick={() =>
            searchBarcode()
          }
          className="bg-blue-500 px-6 py-4 rounded-2xl font-bold"
        >
          Search
        </button>

        <button
          onClick={() =>
            setShowScanner(
              !showScanner
            )
          }
          className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 rounded-2xl font-bold"
        >
          Scan QR
        </button>

      </div>

      {showScanner && (

        <div className="mb-8 overflow-hidden rounded-3xl border border-white/10">

          <Scanner
            onScan={(result) => {

              if (
                result?.[0]?.rawValue
              ) {

                const code =
                  result[0].rawValue;

                setBarcode(code);

                searchBarcode(code);

                setShowScanner(false);
              }
            }}
            onError={(err) =>
              console.log(err)
            }
          />

        </div>
      )}

      <div className="space-y-4">

        {results.map((item, index) => (

          <div
            key={index}
            className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl"
          >

            <p>
              <span className="font-bold text-pink-300">
                Customer:
              </span>{" "}
              {item.customerName}
            </p>

            <p>
              <span className="font-bold text-pink-300">
                Product:
              </span>{" "}
              {item.productName}
            </p>

            <p>
              <span className="font-bold text-pink-300">
                Barcode:
              </span>{" "}
              {item.barcode}
            </p>

            <p>
              <span className="font-bold text-pink-300">
                Weight:
              </span>{" "}
              {item.weight} g
            </p>

            <p>
              <span className="font-bold text-pink-300">
                Status:
              </span>{" "}

              <span
                className={`px-3 py-1 rounded-xl text-sm
                ${
                  item.status === "SOLD"
                    ? "bg-red-500"
                    : item.status === "RETURNED"
                    ? "bg-green-500"
                    : "bg-yellow-500 text-black"
                }`}
              >
                {item.status}
              </span>

            </p>

          </div>
        ))}

      </div>

    </div>
  );
}

export default BarcodeSearch;