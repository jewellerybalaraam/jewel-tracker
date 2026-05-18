import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import {
  useEffect,
  useState,
} from "react";

import Sidebar from "./components/Sidebar";

import SplashScreen from "./components/SplashScreen";

import Dashboard from "./pages/Dashboard";

import Transactions from "./pages/Transactions";

import NewTransaction from "./pages/NewTransaction";

import BarcodeSearch from "./pages/BarcodeSearch";

import CustomerHistory from "./pages/CustomerHistory";

import UploadInventory from "./pages/UploadInventory";

function App() {

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    const loadApp = async () => {

      const start =
        Date.now();

      try {

        await fetch(
          import.meta.env.VITE_API_URL
        );

      } catch (error) {

        console.log(error);
      }

      const elapsed =
        Date.now() - start;

      const remaining =
        Math.max(
          5000 - elapsed,
          0
        );

      setTimeout(() => {

        setLoading(false);

      }, remaining);
    };

    loadApp();

  }, []);

  if (loading) {

    return (
      <SplashScreen show={true} />
    );
  }

  return (

    <BrowserRouter>

      <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">

        <Sidebar />

        <div className="flex-1 p-4">

          <Routes>

            <Route
              path="/"
              element={<Dashboard />}
            />

            <Route
              path="/new"
              element={<NewTransaction />}
            />

            <Route
              path="/transactions"
              element={<Transactions />}
            />

            <Route
              path="/barcode-search"
              element={<BarcodeSearch />}
            />

            <Route
              path="/customer-history"
              element={<CustomerHistory />}
            />

            <Route
              path="/upload-inventory"
              element={<UploadInventory />}
            />

          </Routes>

        </div>

      </div>

    </BrowserRouter>
  );
}

export default App;