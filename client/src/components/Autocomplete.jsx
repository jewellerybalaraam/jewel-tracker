import { useEffect, useRef, useState } from 'react'

/*
  A keyword-driven autocomplete input.

  Props:
    value, onChange (controlled string)
    fetcher(query) => Promise<Array<option>>
    getLabel(option) => string
    onPick(option) — called when user picks a suggestion
    onAddNew(query) — optional, shown as last row "+ Add new <query>"
    placeholder
    disabled
*/
export default function Autocomplete({
  value,
  onChange,
  fetcher,
  getLabel = (o) => o.name || o.productName || String(o),
  onPick,
  onAddNew,
  placeholder = '',
  disabled = false,
  inputClassName = '',
}) {
  const [open, setOpen]         = useState(false)
  const [options, setOptions]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const wrapRef = useRef(null)
  const debRef  = useRef(null)

  // close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [])

  // fetch suggestions on value change (debounced)
  useEffect(() => {
    if (!open) return
    if (typeof fetcher !== 'function') {
      setOptions([])
      return
    }
    if (debRef.current) clearTimeout(debRef.current)
    debRef.current = setTimeout(async () => {
      try {
        setLoading(true)
        const res = await fetcher(value || '')
        setOptions(Array.isArray(res) ? res.slice(0, 15) : [])
      } catch (_) {
        setOptions([])
      } finally {
        setLoading(false)
      }
    }, 180)
    return () => debRef.current && clearTimeout(debRef.current)
  }, [value, open, fetcher])


  const pick = (opt) => {
    onPick && onPick(opt)
    setOpen(false)
    setActiveIdx(-1)
  }

  const handleKey = (e) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && options[activeIdx]) {
        e.preventDefault()
        pick(options[activeIdx])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={value || ''}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onKeyDown={handleKey}
        className={
          'w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 ' +
          'text-white placeholder-gray-500 focus:outline-none focus:border-pink-400 ' +
          inputClassName
        }
      />

      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#1a1a22] shadow-2xl">
          {loading && (
            <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>
          )}

          {!loading && options.length === 0 && !onAddNew && (
            <div className="px-3 py-2 text-xs text-gray-500">No matches</div>
          )}

          {options.map((opt, i) => (
            <button
              key={opt._id || i}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(opt) }}
              onMouseEnter={() => setActiveIdx(i)}
              className={
                'w-full text-left px-3 py-2 text-sm transition-colors ' +
                (activeIdx === i ? 'bg-pink-500/20 text-white' : 'text-gray-200 hover:bg-white/10')
              }
            >
              {getLabel(opt)}
              {opt.subProductName && (
                <span className="text-gray-500"> &nbsp;·&nbsp; {opt.subProductName}</span>
              )}
              {opt.prefix && (
                <span className="text-pink-400 ml-2 text-xs">[{opt.prefix}]</span>
              )}
            </button>
          ))}

          {onAddNew && value && value.trim() && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onAddNew(value.trim()); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm border-t border-white/10 bg-gradient-to-r from-pink-500/15 to-purple-500/15 hover:from-pink-500/25 hover:to-purple-500/25 text-pink-200"
            >
              + Add new “{value.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  )
}
