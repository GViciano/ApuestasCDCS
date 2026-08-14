import { useState, useEffect } from 'react'
import { supabase } from './supabase.js'
import { DEF_PTS } from './data.js'
import Login from './components/Login.jsx'
import Jornada from './components/Jornada.jsx'
import Ranking from './components/Ranking.jsx'
import Settings from './components/Settings.jsx'

export default function App() {
  const [user, setUser] = useState(() => {
    try { const s = localStorage.getItem('apuestas_user'); return s ? JSON.parse(s) : null } catch { return null }
  })
  const [displayName, setDisplayName] = useState(() => {
    try { const s = localStorage.getItem('apuestas_user'); if (s) { const u = JSON.parse(s); return u.display_name || u.username } } catch {}
    return ''
  })
  const [tab, setTab] = useState('jornada')
  const [menuOpen, setMenuOpen] = useState(false)
  const [showChangeName, setShowChangeName] = useState(false)
  const [points, setPoints] = useState(DEF_PTS)
  const [jornadas, setJornadas] = useState([])
  const [activeJornadaId, setActiveJornadaId] = useState(null)
  const [selectedJornadaId, setSelectedJornadaId] = useState(null)

  useEffect(() => { if (user) { loadConfig(); loadJornadas() } }, [user])

  const loadConfig = async () => {
    const { data } = await supabase.from('config')
      .select('*').eq('key', 'liga_points').eq('liga_id', user.ligaId).single()
    if (data?.value) setPoints(data.value)
    else {
      // Fallback to global config
      const { data: global } = await supabase.from('config')
        .select('*').eq('key', 'liga_points').is('liga_id', null).single()
      if (global?.value) setPoints(global.value)
    }
  }

  const loadJornadas = async () => {
    if (!user?.ligaId) return
    const { data } = await supabase.from('liga_jornadas')
      .select('*').eq('liga_id', user.ligaId).order('numero')
    if (data) {
      setJornadas(data)
      const active = data.find(j => j.active)
      if (active) setActiveJornadaId(active.id)
      // Always default to null (Próximos partidos), never auto-select a jornada
    }
  }

  const handleLogin = (u) => {
    setUser(u)
    setDisplayName(u.display_name || u.username)
    try { localStorage.setItem('apuestas_user', JSON.stringify(u)) } catch {}
  }

  const handleLogout = () => {
    setUser(null); setDisplayName(''); setTab('jornada')
    setJornadas([]); setSelectedJornadaId(null); setActiveJornadaId(null)
    try { localStorage.removeItem('apuestas_user') } catch {}
  }

  // Switch liga without full logout
  const switchLiga = async () => {
    const { data: memberships } = await supabase
      .from('liga_memberships').select('liga_id, ligas(id, nombre, codigo)')
      .eq('user_id', user.id)
    const userLigas = user.is_admin
      ? (await supabase.from('ligas').select('*').order('nombre')).data || []
      : (memberships || []).map(m => m.ligas).filter(Boolean)

    if (userLigas.length <= 1) return
    // Show liga selector by resetting to login-like state
    setUser(prev => ({ ...prev, _selectingLiga: true, _availableLigas: userLigas }))
  }

  // If selecting liga, show selector overlay
  if (user?._selectingLiga) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:16, padding:32, width:'100%', maxWidth:360 }}>
          <div style={{ fontFamily:'var(--font-d)', fontSize:24, color:'var(--accent)', textAlign:'center', marginBottom:20 }}>Cambiar de liga</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
            {user._availableLigas.map(l => (
              <button key={l.id} onClick={() => {
                setUser(prev => { const u = {...prev}; delete u._selectingLiga; delete u._availableLigas; const next = {...u, ligaId:l.id, ligaNombre:l.nombre}; try { localStorage.setItem('apuestas_user', JSON.stringify(next)) } catch {}; return next })
                setSelectedJornadaId(null); setActiveJornadaId(null); setJornadas([])
              }}
                style={{ padding:'12px 16px', borderRadius:9, border:`1px solid ${l.id===user.ligaId?'var(--accent)':'var(--border)'}`, background: l.id===user.ligaId?'rgba(245,166,35,.1)':'var(--bg3)', color:'var(--text)', fontSize:14, cursor:'pointer', fontFamily:'var(--font-b)', textAlign:'left', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>{l.nombre}</span>
                <span style={{ fontSize:11, color:'var(--text3)', background:'var(--bg2)', padding:'2px 8px', borderRadius:6 }}>{l.codigo}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setUser(prev => { const u={...prev}; delete u._selectingLiga; delete u._availableLigas; return u })}
            style={{ width:'100%', padding:10, borderRadius:9, border:'1px solid var(--border)', background:'transparent', color:'var(--text2)', fontSize:14, cursor:'pointer', fontFamily:'var(--font-b)' }}>
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  const navItems = [
    { id: 'jornada', label: '⚽ Jornadas' },
    { id: 'ranking', label: '📊 Ranking' },
    ...(user?.is_admin ? [{ id: 'settings', label: '⚙️ Config' }] : []),
  ]

  if (!user) return <Login onLogin={handleLogin} />

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <div style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:200 }}>
        <button onClick={() => setMenuOpen(o => !o)}
          style={{ background:'transparent', border:'none', cursor:'pointer', padding:6, display:'flex', flexDirection:'column', gap:5, flexShrink:0 }}>
          <span style={{ display:'block', width:22, height:2, background:'var(--text)', borderRadius:2, transition:'all .2s', transform:menuOpen?'translateY(7px) rotate(45deg)':'none' }} />
          <span style={{ display:'block', width:22, height:2, background:'var(--text)', borderRadius:2, transition:'all .2s', opacity:menuOpen?0:1 }} />
          <span style={{ display:'block', width:22, height:2, background:'var(--text)', borderRadius:2, transition:'all .2s', transform:menuOpen?'translateY(-7px) rotate(-45deg)':'none' }} />
        </button>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:'var(--font-d)', fontSize:18, letterSpacing:2, color:'var(--accent)' }}>⚽ {user.ligaNombre || 'LA LIGA'}</div>
          <div style={{ fontSize:10, color:'var(--text3)', letterSpacing:1 }}>APUESTAS 26/27</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {user.is_admin && <span style={{ fontSize:11, background:'rgba(245,166,35,.2)', color:'var(--accent)', padding:'2px 7px', borderRadius:4, fontWeight:500 }}>ADMIN</span>}
          <button onClick={handleLogout}
            style={{ background:'transparent', color:'var(--text2)', border:'1px solid var(--border)', borderRadius:7, padding:'5px 10px', fontSize:13, cursor:'pointer', fontFamily:'var(--font-b)' }}>
            Salir
          </button>
        </div>
      </div>

      {/* Drawer */}
      {menuOpen && (
        <div style={{ position:'fixed', top:0, left:0, width:'100vw', height:'100vh', zIndex:190, background:'rgba(0,0,0,.4)' }}
          onClick={() => setMenuOpen(false)}>
          <div style={{ position:'absolute', top:0, left:0, width:240, height:'100vh', background:'var(--bg2)', borderRight:'1px solid var(--border)', boxShadow:'4px 0 20px rgba(0,0,0,.3)', display:'flex', flexDirection:'column', paddingTop:58 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding:'10px 20px', fontSize:13, color:'var(--text2)', borderBottom:'1px solid var(--border)' }}>👤 {displayName}</div>
            {navItems.map(n => (
              <button key={n.id} onClick={() => { setTab(n.id); setMenuOpen(false) }}
                style={{ padding:'14px 20px', border:'none', background:tab===n.id?'rgba(245,166,35,.1)':'transparent', color:tab===n.id?'var(--accent)':'var(--text)', fontWeight:tab===n.id?600:400, fontSize:15, cursor:'pointer', fontFamily:'var(--font-b)', textAlign:'left', borderLeft:tab===n.id?'3px solid var(--accent)':'3px solid transparent', transition:'all .15s' }}>
                {n.label}
              </button>
            ))}
            <div style={{ height:1, background:'var(--border)', margin:'8px 0' }} />
            <button onClick={() => { setShowChangeName(true); setMenuOpen(false) }}
              style={{ padding:'12px 20px', border:'none', background:'transparent', color:'var(--text3)', fontSize:13, cursor:'pointer', fontFamily:'var(--font-b)', textAlign:'left' }}>
              ✏️ Cambiar nombre
            </button>
            <button onClick={() => { switchLiga(); setMenuOpen(false) }}
              style={{ padding:'12px 20px', border:'none', background:'transparent', color:'var(--text3)', fontSize:13, cursor:'pointer', fontFamily:'var(--font-b)', textAlign:'left' }}>
              🔄 Cambiar de liga
            </button>
          </div>
        </div>
      )}

      {/* Change name modal */}
      {showChangeName && (
        <ChangeNameModal
          currentName={displayName}
          userId={user.id}
          onSaved={name => { setDisplayName(name); setUser(prev => { const next = {...prev, display_name: name}; try { localStorage.setItem('apuestas_user', JSON.stringify(next)) } catch {}; return next }); setShowChangeName(false) }}
          onClose={() => setShowChangeName(false)}
        />
      )}

      {/* Content */}
      <div style={{ flex:1, padding:'16px', maxWidth:800, margin:'0 auto', width:'100%', boxSizing:'border-box' }}>
        {tab === 'jornada' && jornadas.length > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <select value={selectedJornadaId || 'proximos'} onChange={e => setSelectedJornadaId(e.target.value === 'proximos' ? null : e.target.value)}
              style={{ flex:1, padding:'9px 12px', borderRadius:9, border:'1px solid var(--border)', background:'var(--bg2)', color:'var(--text)', fontSize:14, fontFamily:'var(--font-b)', cursor:'pointer' }}>
              <option value="proximos">⏳ Próximos partidos</option>
              {jornadas.map(j => (
                <option key={j.id} value={j.id}>{j.label}{j.id===activeJornadaId?' ★ Activa':''}</option>
              ))}
            </select>
          </div>
        )}

        {tab === 'jornada' && (
          <Jornada jornadaId={selectedJornadaId} jornadas={jornadas} ligaId={user.ligaId}
            user={user} points={points} isAdmin={user.is_admin} onJornadaUpdated={loadJornadas} />
        )}
        {tab === 'ranking' && (
          <Ranking points={points} currentUser={user} jornadas={jornadas} ligaId={user.ligaId} />
        )}
        {tab === 'settings' && user.is_admin && (
          <Settings points={points} currentUser={user} jornadas={jornadas}
            activeJornadaId={activeJornadaId} ligaId={user.ligaId}
            onPointsSaved={p => setPoints(p)} onJornadaUpdated={loadJornadas}
            onDisplayNameChanged={name => setDisplayName(name)}
            onLigaCreated={liga => {
              setUser(prev => ({ ...prev, ligaId: liga.id, ligaNombre: liga.nombre }))
              setSelectedJornadaId(null)
              setActiveJornadaId(null)
              setJornadas([])
            }} />
        )}
      </div>
    </div>
  )
}

function ChangeNameModal({ currentName, userId, onSaved, onClose }) {
  const [name, setName] = useState(currentName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', userId)
    if (error) { setError(error.message); setSaving(false); return }
    onSaved(name.trim())
  }

  return (
    <div style={{ position:'fixed', top:0, left:0, width:'100vw', height:'100vh', zIndex:300, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={onClose}>
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:16, padding:28, width:'100%', maxWidth:340 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight:600, fontSize:16, marginBottom:16 }}>✏️ Cambiar nombre</div>
        {error && <div style={{ color:'var(--red)', fontSize:13, marginBottom:10 }}>{error}</div>}
        <input value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key==='Enter' && save()}
          style={{ width:'100%', padding:'10px 12px', borderRadius:9, border:'1px solid var(--border)', background:'var(--bg3)', color:'var(--text)', fontSize:14, fontFamily:'var(--font-b)', outline:'none', boxSizing:'border-box', marginBottom:14 }}
          autoFocus />
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:10, borderRadius:9, border:'1px solid var(--border)', background:'transparent', color:'var(--text2)', fontSize:14, cursor:'pointer', fontFamily:'var(--font-b)' }}>
            Cancelar
          </button>
          <button onClick={save} disabled={saving || !name.trim()}
            style={{ flex:1, padding:10, borderRadius:9, border:'none', background:'var(--accent)', color:'#000', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-b)' }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
