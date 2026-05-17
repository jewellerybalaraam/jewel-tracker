import { useState } from "react";
import axios from "axios";

function CustomerHistory() {

  const [customerName, setCustomerName] = useState("");

  const [fromDate, setFromDate] = useState("");

  const [toDate, setToDate] = useState("");

  const [transactions, setTransactions] = useState([]);

  const searchCustomer = async () => {

    try {

      let url =
        `${import.meta.env.VITE_API_URL}/api/transactions/customer/${customerName}`;

      if (fromDate && toDate) {

        url += `?from=${fromDate}&to=${toDate}`;
      }

      const res = await axios.get(url);

      setTransactions(res.data);

    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="p-10">

      <h1 className="text-3xl font-bold text-yellow-400 mb-6">
        Customer History
      </h1>

      <div className="grid grid-cols-4 gap-4 mb-8">

        <input
          type="text"
          placeholder="Customer Name"
          className="p-3 rounded bg-gray-800"
          value={customerName}
          onChange={(e) =>
            setCustomerName(e.target.value)
          }
        />

        <input
          type="date"
          className="p-3 rounded bg-gray-800"
          value={fromDate}
          onChange={(e) =>
            setFromDate(e.target.value)
          }
        />

        <input
          type="date"
          className="p-3 rounded bg-gray-800"
          value={toDate}
          onChange={(e) =>
            setToDate(e.target.value)
          }
        />

        <button
          onClick={searchCustomer}
          className="bg-blue-500 rounded"
        >
          Search
        </button>

      </div>

      <div className="space-y-6">

        {transactions.map((transaction) => (

          <div
            key={transaction._id}
            className="bg-gray-800 p-5 rounded"
          >

            <h2 className="text-xl font-bold text-yellow-400 mb-3">
              {transaction.productName}
            </h2>

            <p className="mb-4">
              Date:
              {" "}
              {new Date(transaction.createdAt)
                .toLocaleDateString()}
            </p>

            <div className="space-y-2">

              {transaction.items.map((item, index) => (

                <div
                  key={index}
                  className="flex justify-between bg-gray-700 p-3 rounded"
                >

                  <div>
                    {item.barcode}
                    {" "}
                    ({item.weight} g)
                  </div>

                  <div>

                    <span
                      className={`px-3 py-1 rounded text-sm
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

                  </div>

                </div>
              ))}

            </div>

          </div>
        ))}

      </div>
    </div>
  );
}

export default CustomerHistory;
