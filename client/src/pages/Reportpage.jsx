
import { useEffect, useMemo, useState } from "react"
import { Search, ChevronDown, X, FileDown } from "lucide-react"
import { api } from "../api"

// reports data
import { format } from "date-fns"

// client-side PDF printing via browser print
function printHtml(html) {
  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  w.print()
}

function toTableHtml(rows, columns, title) {
  const header = columns.map((c) => `<th style="border:1px solid #ddd;padding:6px;background:#f4f4f4;">${c.header}</th>`).join('')
  const body = rows
    .map((r) => {
      const tds = columns
        .map((c) => {
          const v = c.accessor(r)
          return `<td style="border:1px solid #ddd;padding:6px;">${v ?? ''}</td>`
        })
        .join('')
      return `<tr>${tds}</tr>`
    })
    .join('')

  return `
    <html><head><title>${title}</title></head>
    <body style="font-family:Arial;padding:16px;">
      <h2 style="margin-top:0;">${title}</h2>
      <table style="border-collapse:collapse;width:100%;">${header}${body}</table>
    </body></html>
  `.trim()
}

export default function ReportsPage() {
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientSearch, setClientSearch] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      setLoading(true)

      const response = await api.get('/clients')

      console.log("CLIENT API RESPONSE:", response.data)

      if (Array.isArray(response.data)) {
        setClients(response.data)
      } else {
        console.error("Clients API did not return array")
        setClients([])
      }
    } catch (error) {
      console.error("CLIENT FETCH ERROR:", error)
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase()

    if (!q) return clients

      return clients.filter((client) => {
        const name = client?.clientName || ""
        const phone =
          client?.phone ||
          client?.mobiles?.[0] ||
          ""

        return (
          name.toLowerCase().includes(q) ||
          String(phone).toLowerCase().includes(q)
        )
      })
  }, [clients, clientSearch])

  return (
    <div className="min-h-screen bg-[#0f1117] text-white p-6">
      <div className="max-w-6xl mx-auto rounded-3xl border border-white/10 bg-[#161922] p-8">
        <h1 className="text-5xl font-bold text-pink-400 mb-2">
          Client Reports
        </h1>

        <p className="text-gray-400 mb-10">
          Pending items · Sold items · Bills · Due summary · Full history
        </p>

        <div className="bg-[#20232d] rounded-3xl p-6 border border-white/10 relative">
          <label className="block text-sm text-gray-400 mb-4 tracking-wide">
            SELECT CLIENT
          </label>

          <div className="relative">
            <div className="flex items-center bg-[#2a2d37] border border-pink-500 rounded-2xl px-4 py-4">
              <Search className="w-5 h-5 text-gray-400 mr-3" />

              <input
                type="text"
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value)
                  setShowDropdown(true)
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search client name or phone"
                className="bg-transparent outline-none flex-1 text-white"
              />

              {clientSearch && (
                <button
                  onClick={() => {
                    setClientSearch("")
                    setSelectedClient(null)
                  }}
                  className="mr-2"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              )}

              <ChevronDown className="w-5 h-5 text-gray-400" />
            </div>

            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#2a2d37] border border-white/10 rounded-2xl overflow-hidden z-50 max-h-80 overflow-y-auto shadow-2xl">
                {loading ? (
                  <div className="p-4 text-gray-400">
                    Loading clients...
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="p-4 text-gray-400">
                    No clients found
                  </div>
                ) : (
                  filteredClients.map((client) => (
                    <button
                      key={client._id}
                      onClick={() => {
                        setSelectedClient(client)
                        setClientSearch(client.clientName || "")
                        setShowDropdown(false)
                      }}
                      className="w-full text-left px-4 py-4 hover:bg-[#3a3e4d] border-b border-white/5"
                    >
                      <div className="font-medium text-white">
                        {client.clientName || "Unnamed Client"}
                      </div>

                      <div className="text-sm text-gray-400 mt-1">
                        {client.phone || "No Phone"}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-center text-center text-gray-400">
          {selectedClient ? (
            <>
              <div className="text-3xl font-bold text-white mb-3">
                {selectedClient.clientName}
              </div>

              <div className="text-lg">
                Phone: {selectedClient.phone || "N/A"}
              </div>

              <div className="mt-6 text-pink-400">
                Client selected successfully
              </div>
            </>
          ) : (
            <>
              <div className="text-7xl mb-6">📊</div>

              <div className="text-3xl font-semibold text-white mb-4">
                Select a client to view reports
              </div>

              <div className="text-lg text-gray-500">
                Choose from pending items, sold items, unpaid bills,
                due summary & full history
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
