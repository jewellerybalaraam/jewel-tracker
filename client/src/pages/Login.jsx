import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter username and password')
      return
    }

    try {
      setLoading(true)
      setError('')

      const deviceId =
        localStorage.getItem('deviceId') ||
        (() => {
          const id = crypto.randomUUID()
          localStorage.setItem('deviceId', id)
          return id
        })()

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/login`,
        { username, password, deviceId }
      )

      login(res.data.user, res.data.token)
      navigate('/')

    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-8">

        <h1 className="text-5xl font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent mb-10 text-center">
          Jewel ERP
        </h1>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full p-4 rounded-2xl bg-white/10 border border-white/10 outline-none focus:border-pink-400"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full p-4 rounded-2xl bg-white/10 border border-white/10 outline-none focus:border-pink-400"
          />
        </div>

        {error && (
          <p className="mt-4 text-red-400 text-sm text-center">{error}</p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full mt-6 py-4 rounded-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

      </div>
    </div>
  )
}

export default Login