import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import MainLayout from "./layout/MainLayout";

import Dashboard from "./pages/Dashboard";
import NewTransaction from "./pages/NewTransaction";
import Transactions from "./pages/Transactions";
import BarcodeSearch from "./pages/BarcodeSearch";
import CustomerHistory from "./pages/CustomerHistory";
import UploadInventory from "./pages/UploadInventory";
import Clients from "./pages/Clients";
import PendingClients from "./pages/PendingClients";
import Login from "./pages/Login";
import UserManagement from "./pages/UserManagement";

function ProtectedRoute({
  children,
}) {

  const token =
    localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" />;
  }

  return children;
}

function App() {

  return (

    <BrowserRouter>

      <Routes>

        {/* LOGIN */}

        <Route
          path="/login"
          element={<Login />}
        />

        {/* PROTECTED */}

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >

          <Route
            index
            element={<Dashboard />}
          />

          <Route
            path="new"
            element={
              <NewTransaction />
            }
          />

          <Route
            path="transactions"
            element={
              <Transactions />
            }
          />

          <Route
            path="barcode-search"
            element={
              <BarcodeSearch />
            }
          />

          <Route
            path="customer-history"
            element={
              <CustomerHistory />
            }
          />

          <Route
            path="upload-inventory"
            element={
              <UploadInventory />
            }
          />

          <Route
            path="clients"
            element={<Clients />}
          />

          <Route
            path="pending-clients"
            element={
              <PendingClients />
            }
          />

          <Route
            path="users"
            element={
              <UserManagement />
            }
          />

        </Route>

      </Routes>

    </BrowserRouter>
  );
}

export default App;