// client/src/App.jsx

import { BrowserRouter, Routes, Route } from 'react-router-dom'

import NewTransaction from './pages/NewTransaction'

import UploadInventory from './pages/UploadInventory'

function App() {

  return (

    <BrowserRouter>

      <Routes>

        <Route
          path="/transaction"
          element={<NewTransaction />}
        />

        <Route
  path="/upload"
  element={<UploadInventory />}
/>

      </Routes>

    </BrowserRouter>
  )
}

export default App