import { useState, useRef, useEffect } from 'react'

const DAYS = ['L','M','X','J','V','S','D']
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// Convert YYYY-MM-DD string to Date object (local, not UTC)
function parseLocal(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Format Date to YYYY-MM-DD
function formatISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Get day of week where Monday=0, Sunday=6
function dayOfWeek(date) {
  return (date.getDay() + 6) % 7
}

export default function DatePicker({ value, onChange, style }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const selected = parseLocal(value)
  const today = new Date()

  const [viewYear, setViewYear] = useState(selected?.getFullYear() || today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth())

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const firstDay = new Date(viewYear, viewMonth, 1)
  const startOffset = dayOfWeek(firstDay) // how many blank cells before day 1
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  // Pad to complete last week
  while (cells.length % 7 !== 0) cells.push(null)

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const selectDay = (d) => {
    const date = new Date(viewYear, viewMonth, d)
    onChange(formatISO(date))
    setOpen(false)
  }

  const isSelected = (d) => {
    if (!selected || !d) return false
    return selected.getFullYear() === viewYear && selected.getMonth() === viewMonth && selected.getDate() === d
  }
  const isToday = (d) => {
    if (!d) return false
    return today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d
  }

  const displayValue = selected
    ? selected.toLocaleDateString('es-ES', { weekday:'short', day:'2-digit', month:'2-digit', year:'2-digit' })
    : 'Seleccionar fecha'

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${open ? 'var(--accent)' : 'var(--border)'}`, background: 'var(--bg3)', color: selected ? 'var(--text)' : 'var(--text3)', fontSize: 13, fontFamily: 'var(--font-b)', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{displayValue}</span>
        <span style={{ color: 'var(--text3)', fontSize: 16 }}>📅</span>
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 500, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, boxShadow: '0 8px 24px rgba(0,0,0,.3)', minWidth: 260 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <button type="button" onClick={prevMonth}
              style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 18, padding: '2px 8px', borderRadius: 6 }}>‹</button>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth}
              style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 18, padding: '2px 8px', borderRadius: 6 }}>›</button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, color: d === 'S' || d === 'D' ? 'var(--accent)' : 'var(--text3)', fontWeight: 600, padding: '3px 0' }}>{d}</div>
            ))}
          </div>

          {/* Cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((d, i) => {
              const col = i % 7 // 0=Mon, 5=Sat, 6=Sun
              const isWeekend = col === 5 || col === 6
              return (
                <button key={i} type="button" onClick={() => d && selectDay(d)} disabled={!d}
                  style={{
                    padding: '6px 0', borderRadius: 6, border: 'none', fontSize: 13, cursor: d ? 'pointer' : 'default',
                    background: isSelected(d) ? 'var(--accent)' : isToday(d) ? 'rgba(245,166,35,.15)' : 'transparent',
                    color: !d ? 'transparent' : isSelected(d) ? '#000' : isWeekend ? 'var(--accent)' : 'var(--text)',
                    fontWeight: isSelected(d) ? 700 : isToday(d) ? 600 : 400,
                  }}>
                  {d || ''}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
