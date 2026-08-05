import { useState } from 'react'
import { supabase } from '../supabase.js'

const s = {
  wrap: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20 },
  card: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:16, padding:32, width:'100%', maxWidth:360 },
  big: { fontFamily:'var(--font-d)', fontSize:36, letterSpacing:4, color:'var(--accent)', textAlign:'center', marginBottom:4 },
  sub: { fontSize:13, color:'var(--text3)', textAlign:'center', marginBottom:28, letterSpacing:2 },
  label: { fontSize:12, color:'var(--text3)', marginBottom:6, display:'block' },
  inp: { width:'100%', padding:'10px 12px', borderRadius:9, border:'1px solid var(--border)', background:'var(--bg3)', color:'var(--text)', fontSize:14, fontFamily:'var(--font-b)', outline:'none', boxSizing:'border-box', marginBottom:14 },
  btn: { width:'100%', padding:12, borderRadius:9, border:'none', background:'var(--accent)', color:'#000', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-b)', marginTop:4 },
  err: { color:'var(--red)', fontSize:13, marginBottom:12, textAlign:'center' },
  link: { color:'var(--accent)', background:'none', border:'none', cursor:'pointer', fontSize:13, textDecoration:'underline', fontFamily:'var(--font-b)' },
}

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'select-liga'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [codigo, setCodigo] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ligas, setLigas] = useState([])
  const [userData, setUserData] = useState(null)

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) return
    setLoading(true); setError('')
    try {
      const { data: profiles } = await supabase
        .from('profiles').select('*').eq('username', username.trim())
      if (!profiles?.length) { setError('Usuario no encontrado'); setLoading(false); return }
      const user = profiles[0]

      // If no password column or null: admin can login freely, regular users blocked
      const storedPwd = user.password || user.password_hash || null
      const hasPassword = storedPwd !== null && storedPwd !== ''
      if (hasPassword) {
        if (storedPwd !== password) { setError('Contraseña incorrecta'); setLoading(false); return }
      } else {
        // Legacy: no password stored — only admin can enter
        if (!user.is_admin) { setError('Contraseña incorrecta'); setLoading(false); return }
      }

      if (user.is_admin) {
        // Admin: load all ligas
        const { data: allLigas } = await supabase.from('ligas').select('*').order('nombre')
        if (!allLigas || allLigas.length === 0) {
          // No ligas yet — enter with null ligaId so admin can create the first one
          onLogin({ ...user, ligaId: null, ligaNombre: 'Sin liga' })
        } else if (allLigas.length === 1) {
          onLogin({ ...user, ligaId: allLigas[0].id, ligaNombre: allLigas[0].nombre })
        } else {
          setLigas(allLigas)
          setUserData(user)
          setMode('select-liga')
        }
      } else {
        // Regular user: load their ligas
        const { data: memberships } = await supabase
          .from('liga_memberships').select('liga_id, ligas(id, nombre, codigo)')
          .eq('user_id', user.id)
        const userLigas = (memberships || []).map(m => m.ligas).filter(Boolean)
        if (userLigas.length === 0) {
          setError('No perteneces a ninguna liga. Regístrate con un código de liga.')
          setLoading(false); return
        }
        if (userLigas.length === 1) {
          onLogin({ ...user, ligaId: userLigas[0].id, ligaNombre: userLigas[0].nombre })
        } else {
          setLigas(userLigas)
          setUserData(user)
          setMode('select-liga')
        }
      }
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const handleRegister = async () => {
    if (!username.trim() || !password.trim() || !codigo.trim()) return
    setLoading(true); setError('')
    try {
      // Find liga by code
      const { data: ligaData } = await supabase
        .from('ligas').select('*').eq('codigo', codigo.trim().toUpperCase()).single()
      if (!ligaData) { setError('Código de liga no válido'); setLoading(false); return }

      // Check if username exists
      const { data: existing } = await supabase
        .from('profiles').select('id').eq('username', username.trim())
      
      let userId
      if (existing?.length) {
        // User exists — just add membership
        userId = existing[0].id
        const { data: alreadyMember } = await supabase
          .from('liga_memberships').select('id').eq('user_id', userId).eq('liga_id', ligaData.id)
        if (alreadyMember?.length) {
          setError('Ya estás en esta liga. Usa el login.')
          setLoading(false); return
        }
      } else {
        // Create new user
        const { data: newProfile, error: pErr } = await supabase
          .from('profiles').insert({
            username: username.trim(),
            password: password,
            password_hash: password,
            display_name: displayName.trim() || username.trim(),
            is_admin: false
          }).select().single()
        if (pErr) { setError(pErr.message); setLoading(false); return }
        userId = newProfile.id
      }

      // Add membership
      await supabase.from('liga_memberships').insert({ user_id: userId, liga_id: ligaData.id })

      // Login directly
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single()
      onLogin({ ...profile, ligaId: ligaData.id, ligaNombre: ligaData.nombre })
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const selectLiga = (liga) => {
    onLogin({ ...userData, ligaId: liga.id, ligaNombre: liga.nombre })
  }

  if (mode === 'select-liga') return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.big}>LIGAS</div>
        <div style={s.sub}>Selecciona una liga</div>
        {error && <div style={s.err}>{error}</div>}
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
          {ligas.map(l => (
            <button key={l.id} onClick={() => selectLiga(l)}
              style={{ padding:'12px 16px', borderRadius:9, border:'1px solid var(--border)', background:'var(--bg3)', color:'var(--text)', fontSize:14, cursor:'pointer', fontFamily:'var(--font-b)', textAlign:'left', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span>{l.nombre}</span>
              <span style={{ fontSize:11, color:'var(--text3)', background:'var(--bg2)', padding:'2px 8px', borderRadius:6 }}>{l.codigo}</span>
            </button>
          ))}
        </div>
        <div style={{ textAlign:'center' }}>
          <button onClick={() => { setMode('login'); setError('') }} style={s.link}>← Volver</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.big}>LA LIGA</div>
        <div style={s.sub}>APUESTAS 26/27</div>
        {error && <div style={s.err}>{error}</div>}

        {mode === 'login' ? (
          <>
            <label style={s.label}>Usuario</label>
            <input style={s.inp} value={username} onChange={e => setUsername(e.target.value)}
              placeholder="Tu usuario" onKeyDown={e => e.key==='Enter' && handleLogin()} autoFocus />
            <label style={s.label}>Contraseña</label>
            <input style={s.inp} type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" onKeyDown={e => e.key==='Enter' && handleLogin()} />
            <button style={s.btn} onClick={handleLogin} disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
            <div style={{ textAlign:'center', marginTop:16, fontSize:13, color:'var(--text3)' }}>
              ¿Primera vez? <button onClick={() => { setMode('register'); setError('') }} style={s.link}>Regístrate</button>
            </div>
          </>
        ) : (
          <>
            <label style={s.label}>Nombre visible</label>
            <input style={s.inp} value={displayName} onChange={e => setDisplayName(e.target.value)}
              placeholder="Cómo te verán los demás" autoFocus />
            <label style={s.label}>Usuario</label>
            <input style={s.inp} value={username} onChange={e => setUsername(e.target.value)}
              placeholder="Para hacer login" />
            <label style={s.label}>Contraseña</label>
            <input style={s.inp} type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" />
            <label style={s.label}>Código de liga</label>
            <input style={{ ...s.inp, textTransform:'uppercase', letterSpacing:3, fontFamily:'var(--font-d)', fontSize:18 }}
              value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())}
              placeholder="XXXXXX" maxLength={12}
              onKeyDown={e => e.key==='Enter' && handleRegister()} />
            <button style={s.btn} onClick={handleRegister} disabled={loading}>
              {loading ? 'Registrando…' : 'Unirme a la liga'}
            </button>
            <div style={{ textAlign:'center', marginTop:16, fontSize:13, color:'var(--text3)' }}>
              ¿Ya tienes cuenta? <button onClick={() => { setMode('login'); setError('') }} style={s.link}>Inicia sesión</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
