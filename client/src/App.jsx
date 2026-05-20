import {
  BrowserRouter,
  Routes,
  Route,
  Link
} from 'react-router-dom'

import NewTransaction from './pages/NewTransaction'
import UploadInventory from './pages/UploadInventory'

function Home() {

  return (

    <div style={{ padding: '20px' }}>

      <h1>Jewellery ERP</h1>

      <br />

      <Link to="/upload">
        Upload Inventory
      </Link>

      <br /><br />

      <Link to="/transaction">
        New Transaction
      </Link>

    </div>
  )
}

function App() {

  return (

    <BrowserRouter>

      <Routes>

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/upload"
          element={<UploadInventory />}
        />

        <Route
          path="/transaction"
          element={<NewTransaction />}
        />

      </Routes>

    </BrowserRouter>
  )
}

export default App