import { useEffect, useState } from "react";
import axios from "axios";

function Dashboard() {

  const [stats, setStats] = useState({
    customers: 0,
    transactions: 0,
    sold: 0,
    returned: 0,
    pending: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {

    try {

      const res = await axios.get(
        "http://localhost:5000/api/transactions"
      );

      const data = res.data;

      const customerSet = new Set();

      let sold = 0;
      let returned = 0;
      let pending = 0;

      data.forEach((t) => {

        customerSet.add(t.customerName);

        if (t.mode === "barcode") {

          t.items.forEach((item) => {

            if (item.status === "SOLD")
              sold++;

            else if (
              item.status === "RETURNED"
            )
              returned++;

            else
              pending++;
          });
        }

        if (t.mode === "pcs") {

          sold +=
            t.pcsTracking?.soldPieces || 0;

          returned +=
            t.pcsTracking?.returnedPieces || 0;

          pending +=
            (t.pcsTracking?.totalPieces || 0)
            -
            (
              t.pcsTracking?.soldPieces || 0
            )
            -
            (
              t.pcsTracking?.returnedPieces || 0
            );
        }
      });

      setStats({
        customers: customerSet.size,
        transactions: data.length,
        sold,
        returned,
        pending,
      });

    } catch (error) {
      console.log(error);
    }
  };

  const cards = [
    {
      title: "Customers",
      value: stats.customers,
      color:
        "from-pink-500 to-orange-500",
    },

    {
      title: "Transactions",
      value: stats.transactions,
      color:
        "from-blue-500 to-cyan-500",
    },

    {
      title: "Sold",
      value: stats.sold,
      color:
        "from-red-500 to-pink-500",
    },

    {
      title: "Returned",
      value: stats.returned,
      color:
        "from-green-500 to-emerald-500",
    },

    {
      title: "Pending",
      value: stats.pending,
      color:
        "from-yellow-500 to-orange-500",
    },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8">

      <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent mb-8">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">

        {cards.map((card, index) => (

          <div
            key={index}
            className={`bg-gradient-to-br ${card.color} rounded-3xl p-6 shadow-2xl`}
          >

            <p className="text-white/80 text-sm mb-2">
              {card.title}
            </p>

            <h2 className="text-4xl font-black">
              {card.value}
            </h2>

          </div>
        ))}

      </div>

    </div>
  );
}

export default Dashboard;