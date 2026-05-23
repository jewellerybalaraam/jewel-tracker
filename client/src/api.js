import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL

// VITE_API_URL is expected to be like: https://your-host.com
// Server mounts routes under: /api/*
export const api = axios.create({
  baseURL: `${BASE}/api`,
})

// Helper for query-string safe requests when needed.
export const buildUrl = (path) => `${BASE}/api${path.startsWith('/') ? '' : '/'}${path}`

