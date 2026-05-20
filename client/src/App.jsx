import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

import MainLayout from './layout/MainLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NewTransaction from './pages/NewTransaction'
import Transactions from './pages/Transactions'
import BarcodeSearch from './pages/BarcodeSearch'
import CustomerHistory from './pages/CustomerHistory'
import UploadInventory from './pages/UploadInventory'
import Clients from './pages/Clients'
import PendingClients from './pages/PendingClients'
import UserManagement from './pages/UserManagement'

function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth()
  return isLoggedIn ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="new" element={<NewTransaction />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="barcode-search" element={<BarcodeSearch />} />
          <Route path="customer-history" element={<CustomerHistory />} />
          <Route path="upload-inventory" element={<UploadInventory />} />
          <Route path="clients" element={<Clients />} />
          <Route path="pending-clients" element={<PendingClients />} />
          <Route path="users" element={<UserManagement />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App