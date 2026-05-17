import { useEffect, useState } from "react";
import axios from "axios";

function Transactions() {

  const [transactions, setTransactions] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {

    try {

      const res = await axios.get(
        "${import.meta.env.VITE_API_URL}/api/transactions"
      );

      setTransactions(res.data);

    } catch (error) {
      console.log(error);
    }
  };

  const filteredTransactions =
    transactions.filter((t) => {

      const searchLower =
        search.toLowerCase();

      const matchesSearch =

        t.customerName
          ?.toLowerCase()
          .includes(searchLower)

        ||

        t.productName
          ?.toLowerCase()
          .includes(searchLower)

        ||

        t.items?.some((item) =>
          item.barcode
            ?.toLowerCase()
            .includes(searchLower)
        );

      let matchesStatus = true;

      if (statusFilter !== "ALL") {

        matchesStatus =
          t.items?.some(
            (item) =>
              item.status === statusFilter
          );
      }

      return (
        matchesSearch &&
        matchesStatus
      );
    });

  return (
    <div className="p-4 sm:p-6 md:p-8">

      <div className="flex flex-col lg:flex-row gap-4 mb-8">

        <input
          type="text"
          placeholder="Search customer, product, barcode..."
          className="flex-1 p-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/10"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <select
          className="p-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/10"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value
            )
          }
        >

          <option value="ALL">
            All Status
          </option>

          <option value="PENDING">
            Pending
          </option>

          <option value="SOLD">
            Sold
          </option>

          <option value="RETURNED">
            Returned
          </option>

        </select>

      </div>

      <div className="space-y-5">

        {filteredTransactions.map((t) => (

          <div
            key={t._id}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5"
          >

            <div className="flex justify-between mb-4">

              <div>

                <h2 className="text-2xl font-bold text-pink-300">
                  {t.customerName}
                </h2>

                <p className="text-gray-300">
                  {t.productName}
                </p>

              </div>

              <div className="text-sm text-gray-400">

                {new Date(
                  t.createdAt
                ).toLocaleDateString()}

              </div>

            </div>

            {t.mode === "barcode" && (

              <div className="space-y-3">

                {t.items.map((item, index) => (

                  <div
                    key={index}
                    className="bg-black/30 p-4 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >

                    <div>
                      <p className="font-bold break-all">
                        {item.barcode}
                      </p>

                      <p className="text-sm text-gray-400">
                        {item.weight} g
                      </p>

                    </div>

                    <span
                      className={`px-4 py-2 rounded-xl font-bold w-fit
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
                ))}

              </div>
            )}

          </div>
        ))}

      </div>

    </div>
  );
}

export default Transactions;
