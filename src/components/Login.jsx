import { useState } from 'react'
import { supabase } from '../supabase.js'

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    setErr('')
    if (!username.trim() || !password) return setErr('Rellena todos los campos')
    setLoading(true)
    try {
      if (mode === 'login') {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username.trim())
          .single()
        console.log('Login debug:', JSON.stringify({ error, hasData: !!data, storedHash: data?.password_hash, inputHash: btoa(password) }))
        if (error || !data) { setErr('Usuario o contraseña incorrectos'); setLoading(false); return }
        if (data.password_hash !== btoa(password)) { setErr('Usuario o contraseña incorrectos'); setLoading(false); return }
        onLogin(data)
      } else {
        if (username.trim().length < 3) { setErr('Mínimo 3 caracteres'); setLoading(false); return }
        if (password.length < 4) { setErr('Mínimo 4 caracteres para la contraseña'); setLoading(false); return }
        const { data: ex } = await supabase.from('profiles').select('id').eq('username', username.trim()).single()
        if (ex) { setErr('Ese nombre de usuario ya existe'); setLoading(false); return }
        const { data, error } = await supabase
          .from('profiles')
          .insert({ username: username.trim(), display_name: null, password_hash: btoa(password), is_admin: false })
          .select('id, username, display_name, password_hash, is_admin, created_at')
          .single()
        if (error) { setErr('Error: ' + error.message); setLoading(false); return }
        onLogin(data)
      }
    } catch(e) { setErr('Error de conexión') }
    setLoading(false)
  }

  const s = {
    wrap:{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'radial-gradient(ellipse at 50% 0%,#1a2c50 0%,var(--bg) 70%)'},
    box:{width:'100%',maxWidth:400},
    big:{fontFamily:'var(--font-d)',fontSize:64,color:'var(--accent)',letterSpacing:3,lineHeight:1,textAlign:'center'},
    sub:{fontFamily:'var(--font-d)',fontSize:20,color:'var(--text2)',letterSpacing:5,textAlign:'center',marginTop:4,marginBottom:32},
    card:{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:16,padding:28},
    tabs:{display:'flex',gap:4,marginBottom:24,background:'var(--bg)',borderRadius:10,padding:4},
    tab:(active)=>({flex:1,padding:8,borderRadius:7,border:'none',background:active?'var(--accent)':'transparent',color:active?'#0a0f1e':'var(--text2)',fontWeight:500,fontSize:14,cursor:'pointer',fontFamily:'var(--font-b)',transition:'all .15s'}),
    form:{display:'flex',flexDirection:'column',gap:14},
    label:{fontSize:12,fontWeight:500,color:'var(--text2)',textTransform:'uppercase',letterSpacing:.8,display:'block',marginBottom:5},
    input:{background:'var(--bg4)',border:'1px solid var(--border)',borderRadius:8,padding:'9px 12px',color:'var(--text)',fontSize:14,width:'100%',fontFamily:'var(--font-b)'},
    err:{fontSize:13,color:'var(--red)',padding:'8px 12px',background:'rgba(239,68,68,.1)',borderRadius:7},
    btn:{background:'var(--accent)',color:'#0a0f1e',fontWeight:600,fontSize:15,padding:12,borderRadius:8,width:'100%',border:'none',cursor:'pointer',marginTop:4},
  }

  return (
    <div style={s.wrap}>
      <div style={s.box}>
        <div style={s.big}>MUNDIAL</div>
        <div style={s.sub}>APUESTAS 2026</div>
        <div style={s.card}>
          <div style={s.tabs}>
            <button style={s.tab(mode==='login')} onClick={()=>{setMode('login');setErr('')}}>Entrar</button>
            <button style={s.tab(mode==='register')} onClick={()=>{setMode('register');setErr('')}}>Registrarse</button>
          </div>
          <div style={s.form}>
            <div><label style={s.label}>Usuario</label><input style={s.input} value={username} onChange={e=>setUsername(e.target.value)} placeholder="tunombre" onKeyDown={e=>e.key==='Enter'&&handle()}/></div>
            <div><label style={s.label}>Contraseña</label><input style={s.input} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••" onKeyDown={e=>e.key==='Enter'&&handle()}/></div>
            {err && <div style={s.err}>{err}</div>}
            <button style={s.btn} onClick={handle} disabled={loading}>{loading?'Cargando…':mode==='login'?'Entrar →':'Crear cuenta →'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
