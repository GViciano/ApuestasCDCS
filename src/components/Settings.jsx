import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { LALIGA_TEAMS } from '../data.js'
import { invalidateLogoCache } from './Shield.jsx'

const btn = (color = 'var(--accent)') => ({
  padding: '8px 14px', borderRadius: 8, border: 'none', background: color, color: color === 'var(--accent)' ? '#000' : '#fff',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-b)',
})
const inp = {
  padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--bg3)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-b)',
}
const sel = {
  ...inp, width: '100%',
}

export default function Settings({ points, currentUser, jornadas, activeJornadaId, ligaId, onPointsSaved, onJornadaUpdated, onDisplayNameChanged, onLigaCreated }) {
  const [section, setSection] = useState('jornadas')
  const [teams, setTeams] = useState(LALIGA_TEAMS)

  useEffect(() => { loadTeams() }, [])

  const loadTeams = async () => {
    const { data } = await supabase.from('liga_teams').select('name').order('name')
    if (data && data.length > 0) setTeams(data.map(t => t.name))
  }

  const sections = [
    { id: 'ligas', label: '🏆 Ligas' },
    { id: 'jornadas', label: '📋 Jornadas y partidos' },
    { id: 'equipos', label: '🏟 Equipos' },
    { id: 'players', label: '👥 Jugadores' },
    { id: 'logos', label: '🛡 Escudos' },
    { id: 'usuarios', label: '👤 Usuarios' },
    { id: 'config', label: '⚙️ Config' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            style={{ padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font-b)', fontWeight: 500, fontSize: 13, border: `1px solid ${section === s.id ? 'var(--accent)' : 'var(--border)'}`, background: section === s.id ? 'rgba(245,166,35,.1)' : 'var(--bg2)', color: section === s.id ? 'var(--accent)' : 'var(--text2)' }}>
            {s.label}
          </button>
        ))}
      </div>

      {section === 'jornadas' && <JornadasSection activeJornadaId={activeJornadaId} onUpdated={onJornadaUpdated} teams={teams} ligaId={ligaId} />}
      {section === 'ligas' && <LigasSection currentLigaId={ligaId} onLigaCreated={onLigaCreated} />}
      {section === 'equipos' && <EquiposSection teams={teams} onUpdated={loadTeams} />}
      {section === 'players' && <PlayersSection teams={teams} />}
      {section === 'logos' && <LogosSection teams={teams} />}
      {section === 'usuarios' && <UsuariosSection ligaId={ligaId} />}
      {section === 'config' && <ConfigSection points={points} onPointsSaved={onPointsSaved} currentUser={currentUser} onDisplayNameChanged={onDisplayNameChanged} ligaId={ligaId} />}
    </div>
  )
}

// ── Ligas Section ─────────────────────────────────────────────────────────────
function LigasSection({ currentLigaId, onLigaCreated }) {
  const [ligas, setLigas] = useState([])
  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { loadLigas() }, [])

  const loadLigas = async () => {
    const { data } = await supabase.from('ligas').select('*').order('nombre')
    setLigas(data || [])
  }

  const createLiga = async () => {
    if (!nombre.trim() || !codigo.trim()) return
    setCreating(true); setMsg('')
    const { error } = await supabase.from('ligas').insert({
      nombre: nombre.trim(),
      codigo: codigo.trim().toUpperCase()
    })
    setCreating(false)
    if (error) { setMsg('Error: ' + (error.message.includes('unique') ? 'Ese código ya existe' : error.message)) }
    else {
      setMsg('✓ Liga creada'); setNombre(''); setCodigo('')
      loadLigas()
      // If admin had no liga, switch to the new one automatically
      if (!currentLigaId && onLigaCreated) {
        const { data: newLiga } = await supabase.from('ligas').select('*').eq('codigo', codigo.trim().toUpperCase()).single()
        if (newLiga) onLigaCreated(newLiga)
      }
    }
  }

  const deleteLiga = async (id) => {
    if (!confirm('¿Borrar esta liga y todos sus datos?')) return
    await supabase.from('ligas').delete().eq('id', id)
    loadLigas()
  }

  return (
    <div>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10, fontWeight: 600 }}>CREAR NUEVA LIGA</div>
        <input value={nombre} onChange={e => setNombre(e.target.value)}
          placeholder="Nombre de la liga" style={{ ...inp, marginBottom: 8 }} />
        <input value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())}
          placeholder="CÓDIGO (ej: AMIGOS26)" maxLength={12}
          style={{ ...inp, textTransform: 'uppercase', letterSpacing: 2, fontFamily: 'var(--font-d)', fontSize: 16, marginBottom: 8 }} />
        {msg && <div style={{ fontSize: 12, color: msg.startsWith('✓') ? 'var(--green)' : 'var(--red)', marginBottom: 8 }}>{msg}</div>}
        <button onClick={createLiga} disabled={creating || !nombre.trim() || !codigo.trim()} style={{ ...btn(), width: '100%' }}>
          {creating ? 'Creando…' : '+ Crear liga'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ligas.map(l => (
          <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: l.id === currentLigaId ? 'rgba(245,166,35,.08)' : 'var(--bg2)', border: `1px solid ${l.id === currentLigaId ? 'rgba(245,166,35,.3)' : 'var(--border)'}`, borderRadius: 8, padding: '10px 14px' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{l.nombre} {l.id === currentLigaId && <span style={{ fontSize: 10, color: 'var(--accent)' }}>★ ACTUAL</span>}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, letterSpacing: 2, fontFamily: 'var(--font-d)' }}>{l.codigo}</div>
            </div>
            {l.id !== currentLigaId && (
              <button onClick={() => deleteLiga(l.id)}
                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.08)', color: 'var(--red)', fontSize: 12, cursor: 'pointer' }}>
                🗑
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Equipos Section ───────────────────────────────────────────────────────────
function EquiposSection({ teams, onUpdated }) {
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  const addTeam = async () => {
    if (!newName.trim()) return
    setAdding(true)
    await supabase.from('liga_teams').insert({ name: newName.trim() })
    setNewName('')
    setAdding(false)
    onUpdated()
  }

  const deleteTeam = async (name) => {
    if (!confirm(`¿Eliminar ${name}? Se eliminarán también sus jugadores y escudo.`)) return
    await supabase.from('liga_teams').delete().eq('name', name)
    await supabase.from('liga_players').delete().eq('team', name)
    await supabase.from('liga_team_logos').delete().eq('team', name)
    onUpdated()
  }

  return (
    <div>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8, fontWeight: 600 }}>AÑADIR EQUIPO</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre del equipo"
            style={{ ...inp, flex: 1 }} onKeyDown={e => e.key === 'Enter' && addTeam()} />
          <button onClick={addTeam} disabled={adding || !newName.trim()} style={btn()}>
            {adding ? '…' : '+ Añadir'}
          </button>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>{teams.length} equipos</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {teams.map(t => (
          <div key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
            <span style={{ fontSize: 14 }}>{t}</span>
            <button onClick={() => deleteTeam(t)}
              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.08)', color: 'var(--red)', fontSize: 12, cursor: 'pointer' }}>
              🗑
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Jornadas Section ──────────────────────────────────────────────────────────
function JornadasSection({ activeJornadaId, onUpdated, teams, ligaId }) {
  const [myJornadas, setMyJornadas] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [addToJornadaId, setAddToJornadaId] = useState(null)
  const [partidos, setPartidos] = useState([])
  const [newHome, setNewHome] = useState('')
  const [newAway, setNewAway] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [adding, setAdding] = useState(false)
  const [newJLabel, setNewJLabel] = useState('')
  const [creatingJ, setCreatingJ] = useState(false)

  useEffect(() => { if (ligaId) loadJornadas() }, [ligaId])

  useEffect(() => {
    if (selectedId) loadPartidos()
  }, [selectedId])

  const loadJornadas = async () => {
    const { data } = await supabase.from('liga_jornadas').select('*').eq('liga_id', ligaId).order('numero')
    setMyJornadas(data || [])
    if (data?.length) {
      const active = data.find(j => j.active) || data[data.length - 1]
      setSelectedId(prev => prev || active.id)
      setAddToJornadaId(prev => prev || active.id)
    }
  }

  const loadPartidos = async () => {
    const { data } = await supabase.from('liga_partidos').select('*').eq('jornada_id', selectedId).order('match_date')
    setPartidos(data || [])
  }

  const createJornada = async () => {
    if (!newJLabel.trim()) return
    if (!ligaId) { alert('Error: ligaId es null. Valor: ' + ligaId); return }
    setCreatingJ(true)
    const { count } = await supabase.from('liga_jornadas').select('*', { count: 'exact', head: true }).eq('liga_id', ligaId)
    const num = (count || 0) + 1
    const { data, error } = await supabase.from('liga_jornadas').insert({ numero: num, label: newJLabel.trim(), active: false, liga_id: ligaId }).select().single()
    if (error) { alert('Error Supabase: ' + error.message); setCreatingJ(false); return }
    setCreatingJ(false)
    setNewJLabel('')
    // Reload jornadas and select the new one
    const { data: updated } = await supabase.from('liga_jornadas').select('*').eq('liga_id', ligaId).order('numero')
    setMyJornadas(updated || [])
    if (data) {
      setSelectedId(data.id)
      setAddToJornadaId(data.id)
    }
    onUpdated()
  }

  const setActive = async (id) => {
    await supabase.from('liga_jornadas').update({ active: false }).eq('liga_id', ligaId)
    await supabase.from('liga_jornadas').update({ active: true }).eq('id', id)
    onUpdated()
    loadJornadas()
  }

  const deleteJornada = async (id) => {
    if (!confirm('¿Borrar jornada y todos sus partidos y apuestas?')) return
    await supabase.from('liga_jornadas').delete().eq('id', id)
    onUpdated()
    await loadJornadas()
  }

  const parseDate = (date, time) => {
    const dp = date.trim().split('/'), tp = time.trim().split(':')
    if (dp.length !== 3 || tp.length !== 2) return null
    let [d, m, y] = dp.map(Number)
    if (y < 100) y += 2000
    const [h, min] = tp.map(Number)
    const off = (m >= 3 && m <= 10) ? 2 : 1
    return new Date(Date.UTC(y, m - 1, d, h - off, min)).toISOString()
  }

  const addPartido = async () => {
    if (!newHome || !newAway || newHome === newAway || !addToJornadaId) return
    setAdding(true)
    const match_date = (newDate && newTime) ? parseDate(newDate, newTime) : null
    await supabase.from('liga_partidos').insert({ jornada_id: addToJornadaId, home: newHome, away: newAway, match_date })
    setAdding(false)
    setNewHome(''); setNewAway(''); setNewDate(''); setNewTime('')
    if (addToJornadaId === selectedId) loadPartidos()
  }

  const deletePartido = async (id) => {
    if (!confirm('¿Borrar partido y sus apuestas?')) return
    await supabase.from('liga_partidos').delete().eq('id', id)
    loadPartidos()
  }

  const updatePartidoDate = async (id, date, time) => {
    const match_date = parseDate(date, time)
    if (!match_date) return
    await supabase.from('liga_partidos').update({ match_date }).eq('id', id)
    loadPartidos()
  }

  const selectedJornada = myJornadas.find(j => j.id === selectedId)

  return (
    <div>
      {/* Jornada selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={selectedId || ''} onChange={e => setSelectedId(e.target.value)} style={{ ...sel, flex: 1 }}>
          {myJornadas.map(j => <option key={j.id} value={j.id}>{j.label}{j.active ? ' ★ Activa' : ''}</option>)}
        </select>
        {selectedId && selectedId !== activeJornadaId && (
          <button onClick={() => setActive(selectedId)} style={{ ...btn(), whiteSpace: 'nowrap' }}>★ Activar</button>
        )}
        {selectedId && selectedId === activeJornadaId && (
          <span style={{ fontSize: 12, color: 'var(--green)', whiteSpace: 'nowrap' }}>★ Activa</span>
        )}
        {selectedId && (
          <button onClick={() => deleteJornada(selectedId)} style={{ ...btn('rgba(239,68,68,.8)'), padding: '8px 10px' }}>🗑</button>
        )}
      </div>

      {/* Create jornada */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8, fontWeight: 600 }}>NUEVA JORNADA</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={newJLabel} onChange={e => setNewJLabel(e.target.value)} placeholder="Ej: Jornada 1"
            style={{ ...inp, flex: 1 }} onKeyDown={e => e.key === 'Enter' && createJornada()} />
          <button onClick={createJornada} disabled={creatingJ || !newJLabel.trim()} style={btn()}>
            {creatingJ ? '…' : '+ Crear'}
          </button>
        </div>
      </div>

      {/* Partidos */}
      {selectedId && (
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>
            Partidos — {selectedJornada?.label}
          </div>

          {/* Existing partidos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {partidos.map(p => (
              <PartidoRow key={p.id} partido={p} onDelete={deletePartido} onDateChange={updatePartidoDate} />
            ))}
            {partidos.length === 0 && (
              <div style={{ color: 'var(--text3)', fontSize: 13, padding: 12 }}>No hay partidos. Añade uno abajo.</div>
            )}
          </div>

          {/* Add partido */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10, fontWeight: 600 }}>AÑADIR PARTIDO</div>
            {/* Jornada destino */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Jornada</div>
              <select value={addToJornadaId || ''} onChange={e => setAddToJornadaId(e.target.value)} style={sel}>
                {myJornadas.map(j => <option key={j.id} value={j.id}>{j.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <select value={newHome} onChange={e => setNewHome(e.target.value)} style={sel}>
                <option value="">— Local —</option>
                {teams.filter(t => t !== newAway).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <span style={{ color: 'var(--text3)', textAlign: 'center' }}>vs</span>
              <select value={newAway} onChange={e => setNewAway(e.target.value)} style={sel}>
                <option value="">— Visitante —</option>
                {teams.filter(t => t !== newHome).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Fecha (DD/MM/AA)</div>
                <input type="text" value={newDate} onChange={e => setNewDate(e.target.value)}
                  placeholder="ej: 20/08/26" style={inp} maxLength={8} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Hora (HH:MM)</div>
                <input type="text" value={newTime} onChange={e => setNewTime(e.target.value)}
                  placeholder="ej: 21:00" style={inp} maxLength={5} />
              </div>
            </div>
            <button onClick={addPartido} disabled={adding || !newHome || !newAway} style={{ ...btn(), width: '100%' }}>
              {adding ? 'Añadiendo…' : '+ Añadir partido'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PartidoRow({ partido, onDelete, onDateChange }) {
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editing, setEditing] = useState(false)

  const currentDate = partido.match_date
    ? new Date(partido.match_date).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Madrid' })
    : 'Sin fecha'

  const hasResult = partido.home_goals !== null

  return (
    <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>
          {partido.home} <span style={{ color: 'var(--text3)' }}>vs</span> {partido.away}
          {hasResult && <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--green)' }}>({partido.home_goals}–{partido.away_goals})</span>}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setEditing(e => !e)}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'none', color: 'var(--text2)', fontSize: 12, cursor: 'pointer' }}>
            ✏️
          </button>
          <button onClick={() => onDelete(partido.id)}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.08)', color: 'var(--red)', fontSize: 12, cursor: 'pointer' }}>
            🗑
          </button>
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{currentDate}</div>
      {editing && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginTop: 4 }}>
          <input type="text" value={editDate} onChange={e => setEditDate(e.target.value)}
            placeholder="DD/MM/AA" style={{ ...inp, fontSize: 12 }} maxLength={8} />
          <input type="text" value={editTime} onChange={e => setEditTime(e.target.value)}
            placeholder="HH:MM" style={{ ...inp, fontSize: 12 }} maxLength={5} />
          <button onClick={() => { onDateChange(partido.id, editDate, editTime); setEditing(false) }}
            style={{ ...btn(), padding: '6px 10px', fontSize: 12 }}>✓</button>
        </div>
      )}
    </div>
  )
}

// ── Players Section ───────────────────────────────────────────────────────────
function PlayersSection({ teams }) {
  const [selectedTeam, setSelectedTeam] = useState(teams[0] || '')
  const [players, setPlayers] = useState([])
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkImporting, setBulkImporting] = useState(false)
  const [bulkMsg, setBulkMsg] = useState('')

  useEffect(() => { loadPlayers() }, [selectedTeam])

  const loadPlayers = async () => {
    setLoading(true)
    const { data } = await supabase.from('liga_players').select('*').eq('team', selectedTeam).order('name')
    setPlayers(data || [])
    setLoading(false)
  }

  const addPlayer = async () => {
    if (!newName.trim()) return
    setAdding(true)
    await supabase.from('liga_players').insert({ team: selectedTeam, name: newName.trim() })
    setNewName('')
    setAdding(false)
    loadPlayers()
  }

  const deletePlayer = async (id) => {
    await supabase.from('liga_players').delete().eq('id', id)
    loadPlayers()
  }

  const deleteAll = async () => {
    if (!confirm(`¿Borrar TODOS los jugadores de ${selectedTeam}?`)) return
    await supabase.from('liga_players').delete().eq('team', selectedTeam)
    loadPlayers()
  }

  const bulkImport = async () => {
    const names = bulkText.split('\n').map(l => l.trim()).filter(Boolean)
    if (!names.length) return
    setBulkImporting(true)
    setBulkMsg('')
    // Delete existing and re-insert
    await supabase.from('liga_players').delete().eq('team', selectedTeam)
    const rows = names.map(name => ({ team: selectedTeam, name }))
    const { error } = await supabase.from('liga_players').insert(rows)
    setBulkImporting(false)
    setBulkMsg(error ? `Error: ${error.message}` : `✓ ${names.length} jugadores importados`)
    setBulkText('')
    loadPlayers()
  }

  return (
    <div>
      <select value={selectedTeam} onChange={e => { setSelectedTeam(e.target.value); setBulkMsg('') }} style={{ ...sel, marginBottom: 14 }}>
        {teams.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      {/* Add single */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8, fontWeight: 600 }}>AÑADIR JUGADOR</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre del jugador"
            style={{ ...inp, flex: 1 }} onKeyDown={e => e.key === 'Enter' && addPlayer()} />
          <button onClick={addPlayer} disabled={adding || !newName.trim()} style={btn()}>
            {adding ? '…' : '+ Añadir'}
          </button>
        </div>
      </div>

      {/* Bulk import */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8, fontWeight: 600 }}>IMPORTAR LISTA (uno por línea — reemplaza la plantilla actual)</div>
        <textarea value={bulkText} onChange={e => setBulkText(e.target.value)}
          placeholder={'Lewandowski\nLamine Yamal\nRaphinha\nPedri\n...'}
          rows={8}
          style={{ ...inp, width: '100%', resize: 'vertical', boxSizing: 'border-box', marginBottom: 8, fontFamily: 'monospace', fontSize: 13 }} />
        {bulkMsg && <div style={{ fontSize: 12, color: bulkMsg.startsWith('✓') ? 'var(--green)' : 'var(--red)', marginBottom: 8 }}>{bulkMsg}</div>}
        <button onClick={bulkImport} disabled={bulkImporting || !bulkText.trim()} style={{ ...btn(), width: '100%' }}>
          {bulkImporting ? 'Importando…' : '📋 Importar lista'}
        </button>
      </div>

      {/* Player list */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--text3)' }}>{players.length} jugadores</span>
        {players.length > 0 && (
          <button onClick={deleteAll} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.08)', color: 'var(--red)', fontSize: 12, cursor: 'pointer' }}>
            🗑 Borrar todos
          </button>
        )}
      </div>

      {loading
        ? <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 20 }}>Cargando…</div>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {players.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
                <span style={{ fontSize: 14 }}>{p.name}</span>
                <button onClick={() => deletePlayer(p.id)}
                  style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.08)', color: 'var(--red)', fontSize: 12, cursor: 'pointer' }}>
                  🗑
                </button>
              </div>
            ))}
            {players.length === 0 && <div style={{ color: 'var(--text3)', fontSize: 13, padding: 12 }}>Sin jugadores. Añade o importa la plantilla.</div>}
          </div>
        )
      }</div>
  )
}

// ── Logos Section ─────────────────────────────────────────────────────────────
function LogosSection({ teams }) {
  const [selectedTeam, setSelectedTeam] = useState(teams[0] || '')
  const [logos, setLogos] = useState({}) // team -> svg string
  const [svgText, setSvgText] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadLogos() }, [])

  const loadLogos = async () => {
    setLoading(true)
    const { data } = await supabase.from('liga_team_logos').select('team, svg')
    if (data) {
      const map = {}
      data.forEach(r => { map[r.team] = r.svg })
      setLogos(map)
    }
    setLoading(false)
  }

  useEffect(() => {
    setSvgText(logos[selectedTeam] || '')
    setSaved(false)
  }, [selectedTeam, logos])

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target.result
      if (content.includes('<svg') || content.includes('<?xml')) {
        setSvgText(content)
      } else {
        alert('El archivo no parece un SVG válido')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const save = async () => {
    if (!svgText.trim()) return
    setSaving(true)
    await supabase.from('liga_team_logos').upsert({ team: selectedTeam, svg: svgText.trim(), updated_at: new Date().toISOString() }, { onConflict: 'team' })
    setLogos(prev => ({ ...prev, [selectedTeam]: svgText.trim() }))
    invalidateLogoCache()
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const deleteLogo = async () => {
    if (!confirm(`¿Borrar escudo de ${selectedTeam}?`)) return
    setDeleting(true)
    await supabase.from('liga_team_logos').delete().eq('team', selectedTeam)
    setLogos(prev => { const n = { ...prev }; delete n[selectedTeam]; return n })
    invalidateLogoCache()
    setSvgText('')
    setDeleting(false)
  }

  const hasLogo = !!logos[selectedTeam]

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>
        Sube el SVG oficial de cada equipo. Se guarda en la base de datos y se muestra en los partidos.
      </p>

      <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}
        style={{ ...sel, marginBottom: 14 }}>
        {teams.map(t => (
          <option key={t} value={t}>{logos[t] ? '✓ ' : '○ '}{t}</option>
        ))}
      </select>

      {/* Preview */}
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {hasLogo
            ? <div dangerouslySetInnerHTML={{ __html: logos[selectedTeam] }} style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
            : <div style={{ fontSize: 36 }}>⚽</div>
          }
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedTeam}</div>
          <div style={{ fontSize: 12, color: hasLogo ? 'var(--green)' : 'var(--text3)', marginTop: 2 }}>
            {loading ? 'Cargando…' : hasLogo ? '✓ Escudo cargado' : 'Sin escudo'}
          </div>
        </div>
      </div>

      {/* Upload file */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10, fontWeight: 600 }}>SUBIR ARCHIVO SVG</div>
        <label style={{ display: 'block', padding: '10px 14px', borderRadius: 8, border: '2px dashed var(--border)', textAlign: 'center', cursor: 'pointer', fontSize: 13, color: 'var(--text2)' }}>
          📁 Seleccionar archivo .svg
          <input type="file" accept=".svg,image/svg+xml" onChange={handleFile} style={{ display: 'none' }} />
        </label>
        <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, marginBottom: 0 }}>
          O pega el código SVG directamente abajo
        </p>
      </div>

      {/* SVG text */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6, fontWeight: 600 }}>CÓDIGO SVG</div>
        <textarea
          value={svgText}
          onChange={e => setSvgText(e.target.value)}
          placeholder={'<svg xmlns="http://www.w3.org/2000/svg" viewBox="...">\n  ...\n</svg>'}
          rows={6}
          style={{ ...inp, width: '100%', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 12 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} disabled={saving || !svgText.trim()}
          style={{ ...btn(), flex: 1 }}>
          {saving ? 'Guardando…' : saved ? '✓ Guardado' : '💾 Guardar escudo'}
        </button>
        {hasLogo && (
          <button onClick={deleteLogo} disabled={deleting}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.08)', color: 'var(--red)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-b)' }}>
            🗑
          </button>
        )}
      </div>

      {/* Summary */}
      <div style={{ marginTop: 20, fontSize: 12, color: 'var(--text3)' }}>
        {Object.keys(logos).length} / {teams.length} escudos subidos
      </div>
    </div>
  )
}

// ── Usuarios Section ──────────────────────────────────────────────────────────
function UsuariosSection({ ligaId }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadUsers() }, [ligaId])

  const loadUsers = async () => {
    setLoading(true)
    const { data: memberships } = await supabase
      .from('liga_memberships').select('user_id, profiles(id, username, display_name, is_admin)')
      .eq('liga_id', ligaId)
    const members = (memberships || []).map(m => m.profiles).filter(p => p && !p.is_admin)
    setUsers(members)
    setLoading(false)
  }

  const deleteUser = async (userId, username) => {
    if (!confirm(`¿Eliminar a ${username} de esta liga? También se borrarán sus apuestas.`)) return
    // Remove from liga
    await supabase.from('liga_memberships').delete().eq('user_id', userId).eq('liga_id', ligaId)
    // Remove bets in this liga
    await supabase.from('liga_bets').delete().eq('user_id', userId).eq('liga_id', ligaId)
    loadUsers()
  }

  const deleteUserCompletely = async (userId, username) => {
    if (!confirm(`¿BORRAR COMPLETAMENTE a ${username}? Se eliminará su cuenta y todas sus apuestas en todas las ligas.`)) return
    if (!confirm('¿Seguro? Esta acción no se puede deshacer.')) return
    await supabase.from('profiles').delete().eq('id', userId)
    loadUsers()
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>
        Usuarios registrados en esta liga: <strong style={{ color: 'var(--text)' }}>{users.length}</strong>
      </div>
      {loading
        ? <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 20 }}>Cargando…</div>
        : users.length === 0
        ? <div style={{ color: 'var(--text3)', padding: 20 }}>No hay usuarios registrados en esta liga.</div>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {users.map(u => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{u.display_name || u.username}</div>
                  {u.display_name && u.display_name !== u.username && (
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>@{u.username}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => deleteUser(u.id, u.display_name || u.username)}
                    title="Quitar de esta liga"
                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(245,166,35,.3)', background: 'rgba(245,166,35,.08)', color: 'var(--accent)', fontSize: 12, cursor: 'pointer' }}>
                    Quitar
                  </button>
                  <button onClick={() => deleteUserCompletely(u.id, u.display_name || u.username)}
                    title="Borrar cuenta completamente"
                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.08)', color: 'var(--red)', fontSize: 12, cursor: 'pointer' }}>
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}

// ── Config Section ────────────────────────────────────────────────────────────
function ConfigSection({ points, onPointsSaved, currentUser, onDisplayNameChanged, ligaId }) {
  const [exact, setExact] = useState(points.exact)
  const [diff, setDiff] = useState(points.diff)
  const [sign, setSign] = useState(points.sign)
  const [scorer, setScorer] = useState(points.scorer)
  const [minute, setMinute] = useState(points.minute)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    setExact(points.exact); setDiff(points.diff); setSign(points.sign)
    setScorer(points.scorer); setMinute(points.minute)
  }, [points])

  const savePoints = async () => {
    setSaving(true)
    const value = { exact: +exact, diff: +diff, sign: +sign, scorer: +scorer, minute: +minute }
    await supabase.from('config').upsert({ key: 'liga_points', value, liga_id: ligaId }, { onConflict: 'key,liga_id' })
    onPointsSaved(value)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const resetAll = async () => {
    if (!confirm('⚠️ ¿Borrar TODAS las apuestas de liga? Esta acción no se puede deshacer.')) return
    if (!confirm('¿Seguro? Se borrarán todos los puntos y apuestas de todos los usuarios.')) return
    setResetting(true)
    await supabase.from('liga_bets').delete().eq('liga_id', ligaId)
    setResetting(false)
    alert('✅ Todas las apuestas han sido borradas.')
  }

  const numInp = (val, set) => (
    <input type="number" min="0" max="10" value={val} onChange={e => set(e.target.value)}
      style={{ ...inp, width: 60, textAlign: 'center' }} />
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Points config */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Puntuación</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['🎯 Resultado exacto', exact, setExact],
            ['↔️ Diferencia exacta', diff, setDiff],
            ['✅ Ganador/empate', sign, setSign],
            ['⚽ Goleador', scorer, setScorer],
            ['🕐 Tramo minuto', minute, setMinute],
          ].map(([label, val, set]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14 }}>{label}</span>
              {numInp(val, set)}
            </div>
          ))}
        </div>
        <button onClick={savePoints} disabled={saving} style={{ ...btn(), width: '100%', marginTop: 14 }}>
          {saving ? 'Guardando…' : saved ? '✓ Guardado' : '💾 Guardar puntos'}
        </button>
      </div>

      {/* Reset */}
      <div style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--red)' }}>⚠️ Zona de peligro</div>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>
          Borra todas las apuestas de liga para empezar de cero (primera vuelta / segunda vuelta). Las jornadas y partidos no se borran.
        </p>
        <button onClick={resetAll} disabled={resetting}
          style={{ ...btn('rgba(239,68,68,.8)'), width: '100%' }}>
          {resetting ? 'Borrando…' : '🗑 Resetear todas las apuestas'}
        </button>
      </div>
    </div>
  )
}
