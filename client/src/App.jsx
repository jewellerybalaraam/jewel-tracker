import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import MainLayout from "./layout/MainLayout";

import Dashboard from "./pages/Dashboard";
import NewTransaction from "./pages/NewTransaction";
import Transactions from "./pages/Transactions";
import BarcodeSearch from "./pages/BarcodeSearch";
import CustomerHistory from "./pages/CustomerHistory";
import UploadInventory from "./pages/UploadInventory";

function App() {

  return (
    <BrowserRouter>

      <Routes>

        <Route path="/" element={<MainLayout />}>

          <Route
            index
            element={<Dashboard />}
          />
          <Route
  path="/upload-inventory"
  element={<UploadInventory />}
/>
          <Route
            path="new"
            element={<NewTransaction />}
          />

          <Route
            path="transactions"
            element={<Transactions />}
          />

          <Route
            path="barcode-search"
            element={<BarcodeSearch />}
          />

          <Route
            path="customer-history"
            element={<CustomerHistory />}
          />

        </Route>

      </Routes>

    </BrowserRouter>
  );
}

export default App;