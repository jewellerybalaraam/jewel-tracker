import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  useEffect,
  useState,
} from "react";

import axios from "axios";

function Dashboard() {

  const [transactions, setTransactions] =
    useState([]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions =
    async () => {

      try {

        const res =
          await axios.get(
            `${import.meta.env.VITE_API_URL}/api/transactions`
          );

        setTransactions(
          res.data
        );

      } catch (error) {

        console.log(error);
      }
    };

  const totalTransactions =
    transactions.length;

  let pendingCount = 0;
  let soldCount = 0;
  let returnedCount = 0;

  transactions.forEach((t) => {

    t.items?.forEach((item) => {

      if (
        item.status === "PENDING"
      ) {
        pendingCount++;
      }

      if (
        item.status === "SOLD"
      ) {
        soldCount++;
      }

      if (
        item.status === "RETURNED"
      ) {
        returnedCount++;
      }
    });
  });

  const chartData = [
    {
      name: "Pending",
      value: pendingCount,
    },
    {
      name: "Sold",
      value: soldCount,
    },
    {
      name: "Returned",
      value: returnedCount,
    },
  ];

  return (

    <div className="p-6 space-y-8">

      {/* SUMMARY CARDS */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">

        <div className="bg-white/5 p-6 rounded-3xl border border-white/10">

          <h2 className="text-gray-400">
            Total Transactions
          </h2>

          <p className="text-4xl font-bold text-pink-400 mt-3">
            {totalTransactions}
          </p>

        </div>

        <div className="bg-yellow-500/20 p-6 rounded-3xl border border-white/10">

          <h2 className="text-yellow-300">
            Pending
          </h2>

          <p className="text-4xl font-bold mt-3">
            {pendingCount}
          </p>

        </div>

        <div className="bg-red-500/20 p-6 rounded-3xl border border-white/10">

          <h2 className="text-red-300">
            Sold
          </h2>

          <p className="text-4xl font-bold mt-3">
            {soldCount}
          </p>

        </div>

        <div className="bg-green-500/20 p-6 rounded-3xl border border-white/10">

          <h2 className="text-green-300">
            Returned
          </h2>

          <p className="text-4xl font-bold mt-3">
            {returnedCount}
          </p>

        </div>

      </div>

      {/* CHARTS */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* BAR CHART */}

        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 h-[400px]">

          <h2 className="text-2xl font-bold text-pink-400 mb-6">
            Transaction Analytics
          </h2>

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <BarChart
              data={chartData}
            >

              <XAxis dataKey="name" />

              <YAxis />

              <Tooltip />

              <Bar
                dataKey="value"
                radius={[10, 10, 0, 0]}
              />

            </BarChart>

          </ResponsiveContainer>

        </div>

        {/* PIE CHART */}

        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 h-[400px]">

          <h2 className="text-2xl font-bold text-pink-400 mb-6">
            Status Distribution
          </h2>

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <PieChart>

              <Pie
                data={chartData}
                dataKey="value"
                outerRadius={120}
                label
              >

                {chartData.map(
                  (entry, index) => (

                    <Cell
                      key={index}
                    />

                  )
                )}

              </Pie>

              <Tooltip />

            </PieChart>

          </ResponsiveContainer>

        </div>

      </div>

    </div>
  );
}

export default Dashboard;