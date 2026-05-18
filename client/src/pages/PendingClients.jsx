import { useEffect, useState } from "react";
import axios from "axios";

function PendingClients() {

  const [transactions, setTransactions] =
    useState([]);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {

    try {

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/transactions`
      );

      const pending =
        res.data.filter((t) =>
          t.items?.some(
            (item) =>
              item.status === "PENDING"
          )
        );

      setTransactions(pending);

    } catch (error) {

      console.log(error);
    }
  };

  const sendWhatsApp = (
    mobile,
    name
  ) => {

    const message =
      `Vanakkam ${name}, your pending jewelry items are awaiting update.`;

    window.open(
      `https://wa.me/91${mobile}?text=${encodeURIComponent(message)}`
    );
  };

  return (

    <div className="p-6 space-y-5">

      <h1 className="text-3xl font-bold text-pink-400">
        Pending Clients
      </h1>

      {transactions.length === 0 && (

        <div className="text-gray-400">
          No Pending Transactions
        </div>

      )}

      {transactions.map((t) => (

        <div
          key={t._id}
          className="bg-white/5 p-5 rounded-3xl border border-white/10"
        >

          <div className="flex flex-col md:flex-row md:justify-between gap-4">

            <div>

              <h2 className="text-2xl font-bold text-pink-300">
                {t.customerName}
              </h2>

              <p className="text-gray-300">
                {t.productName}
              </p>

            </div>

            <button
              onClick={() =>
                sendWhatsApp(
  t.clientId?.whatsapp ||
  t.clientId?.mobile,
  t.customerName
)
              }
              className="bg-green-500 px-5 py-3 rounded-2xl font-bold"
            >
              WhatsApp
            </button>

          </div>

        </div>

      ))}

    </div>
  );
}

export default PendingClients;