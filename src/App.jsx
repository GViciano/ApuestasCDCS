import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase.js'
import { GROUPS, DEF_PTS } from './data.js'
import Login from './components/Login.jsx'
import MatchCard from './components/MatchCard.jsx'
import Ranking from './components/Ranking.jsx'
import Settings from './components/Settings.jsx'
import Flag from './components/Flag.jsx'
import KOSection from './components/KOSection.jsx'
import NameModal from './components/NameModal.jsx'
import Predictions from './components/Predictions.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [tab, setTab] = useState('groups')
  const [group, setGroup] = useState('A')
  const [viewMode, setViewMode] = useState('group') // 'group' | 'date'
  const [bets, setBets] = useState({})
  const [allBets, setAllBets] = useState({})   // bets de todos los usuarios, por match_id
  const [allProfiles, setAllProfiles] = useState({}) // id -> display_name
  const [results, setResults] = useState({})
  const [points, setPoints] = useState(DEF_PTS)
  const [rankingKey, setRankingKey] = useState(0)
  const [showNameModal, setShowNameModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  const switchTab = (id) => {
    setTab(id)
    if (id === 'ranking') setRankingKey(k => k + 1)
  }

  useEffect(() => { loadConfig() }, [])
  useEffect(() => { if (user) { viewMode === 'date' ? loadAllMatches() : loadGroupData() } }, [user, group, viewMode])

  const loadConfig = async () => {
    const { data } = await supabase.from('config').select('*').eq('key','points').single()
    if (data?.value) setPoints(data.value)
  }

  const loadGroupData = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const matchIds = GROUPS[group].matches.map(m => m.id)
      if (!matchIds.length) { setLoading(false); return }

      const [betsRes, resultsRes, allBetsRes, profilesRes] = await Promise.all([
        supabase.from('bets').select('*').eq('user_id', user.id).in('match_id', matchIds),
        supabase.from('results').select('*').in('match_id', matchIds),
        supabase.from('bets').select('*').in('match_id', matchIds),
        supabase.from('profiles').select('id, username, display_name').eq('is_admin', false),
      ])

      // Check for Supabase errors
      const errs = [betsRes, resultsRes, allBetsRes, profilesRes]
        .map(r => r.error?.message).filter(Boolean)
      if (errs.length) throw new Error(errs[0])

      const betsMap = {}
      betsRes.data?.forEach(b => { betsMap[b.match_id] = b })

      const resMap = {}
      resultsRes.data?.forEach(r => { resMap[r.match_id] = r })

      const allBetsMap = {}
      allBetsRes.data?.forEach(b => {
        if (!allBetsMap[b.match_id]) allBetsMap[b.match_id] = []
        allBetsMap[b.match_id].push(b)
      })

      const profilesMap = {}
      profilesRes.data?.forEach(p => {
        profilesMap[p.id] = p.display_name || p.username
      })

      setBets(betsMap)
      setResults(resMap)
      setAllBets(allBetsMap)
      setAllProfiles(profilesMap)
    } catch (err) {
      console.error('Error loading group data:', err)
      setLoadError(err.message || 'Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const loadAllMatches = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const allMatchIds = Object.values(GROUPS).flatMap(g => g.matches.map(m => m.id))

      const [betsRes, resultsRes, allBetsRes, profilesRes] = await Promise.all([
        supabase.from('bets').select('*').eq('user_id', user.id).in('match_id', allMatchIds),
        supabase.from('results').select('*').in('match_id', allMatchIds),
        supabase.from('bets').select('*').in('match_id', allMatchIds),
        supabase.from('profiles').select('id, username, display_name').eq('is_admin', false),
      ])

      const errs = [betsRes, resultsRes, allBetsRes, profilesRes].map(r => r.error?.message).filter(Boolean)
      if (errs.length) throw new Error(errs[0])

      const betsMap = {}
      betsRes.data?.forEach(b => { betsMap[b.match_id] = b })
      const resMap = {}
      resultsRes.data?.forEach(r => { resMap[r.match_id] = r })
      const allBetsMap = {}
      allBetsRes.data?.forEach(b => {
        if (!allBetsMap[b.match_id]) allBetsMap[b.match_id] = []
        allBetsMap[b.match_id].push(b)
      })
      const profilesMap = {}
      profilesRes.data?.forEach(p => { profilesMap[p.id] = p.display_name || p.username })

      setBets(betsMap)
      setResults(resMap)
      setAllBets(allBetsMap)
      setAllProfiles(profilesMap)
    } catch (err) {
      setLoadError(err.message || 'Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }


  const handleLogin = (u) => {
    const normalized = { ...u, is_admin: u.is_admin === true || u.is_admin === 'true' }
    setUser(normalized)
    setDisplayName(normalized.display_name || normalized.username)
    const needsName = !normalized.display_name || normalized.display_name.trim() === ''
    if (needsName && !normalized.is_admin) {
      if (!normalized.username.includes('@')) {
        // Non-email username — auto-set display_name silently
        supabase.from('profiles').update({ display_name: normalized.username }).eq('id', normalized.id)
        setUser({ ...normalized, display_name: normalized.username })
        setDisplayName(normalized.username)
      } else {
        setShowNameModal(true)
      }
    }
  }

  const handleNameSaved = (name) => {
    setDisplayName(name)
    setUser(prev => ({ ...prev, display_name: name }))
    setShowNameModal(false)
  }

  const handleDisplayNameChanged = useCallback((name) => {
    setDisplayName(name)
    setUser(prev => ({ ...prev, display_name: name }))
  }, [])

  if (!user) return <Login onLogin={handleLogin}/>

  const navItems = [
    {id:'groups',      label:'⚽ Grupos'},
    {id:'ko',          label:'🏆 Cruces'},
    {id:'predictions', label:'🔮 Predicciones'},
    {id:'ranking',     label:'📊 Ranking'},
    {id:'settings',    label:'⚙️ Config'},
  ]

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column'}}>
      {showNameModal && (
        <NameModal
          user={user}
          onSaved={handleNameSaved}
          onSkip={() => setShowNameModal(false)}
        />
      )}
      {/* Header */}
      <div style={{background:'var(--bg2)',borderBottom:'1px solid var(--border)',padding:'12px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100}}>
        <div style={{fontFamily:'var(--font-d)',fontSize:22,letterSpacing:2,color:'var(--accent)'}}>⚽ MUNDIAL 2026</div>
        <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          {user.is_admin && <span style={{fontSize:11,background:'rgba(245,166,35,.2)',color:'var(--accent)',padding:'2px 7px',borderRadius:4,fontWeight:500}}>ADMIN</span>}
          <span style={{fontSize:13,color:'var(--text2)'}}>👤 {displayName}</span>
          <button onClick={()=>{ setUser(null); setDisplayName('') }}
            style={{background:'transparent',color:'var(--text2)',border:'1px solid var(--border)',borderRadius:7,padding:'5px 12px',fontSize:13,cursor:'pointer',fontFamily:'var(--font-b)'}}>
            Salir
          </button>
        </div>
      </div>

      {/* Nav */}
      <div style={{background:'var(--bg2)',borderBottom:'1px solid var(--border)',display:'flex',padding:'0 16px',overflowX:'auto'}}>
        {navItems.map(n => (
          <button key={n.id} onClick={()=>switchTab(n.id)}
            style={{padding:'11px 18px',border:'none',background:'transparent',
              color:tab===n.id?'var(--accent)':'var(--text2)',
              borderBottom:tab===n.id?'2px solid var(--accent)':'2px solid transparent',
              fontWeight:500,fontSize:14,cursor:'pointer',fontFamily:'var(--font-b)',whiteSpace:'nowrap',transition:'all .15s'}}>
            {n.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{flex:1,padding:20,maxWidth:800,margin:'0 auto',width:'100%'}}>
        {tab === 'groups' && (
          <>
            {/* Toggle grupo / fecha */}
            <div style={{display:'flex',gap:8,marginBottom:14}}>
              {[['group','📋 Por grupo'],['date','📅 Por fecha']].map(([mode,label]) => (
                <button key={mode} onClick={()=>setViewMode(mode)}
                  style={{padding:'6px 16px',borderRadius:8,cursor:'pointer',fontFamily:'var(--font-b)',fontWeight:500,fontSize:13,transition:'all .15s',
                    border:`1px solid ${viewMode===mode?'var(--accent)':'var(--border)'}`,
                    background:viewMode===mode?'rgba(245,166,35,.1)':'var(--bg2)',
                    color:viewMode===mode?'var(--accent)':'var(--text2)'}}>
                  {label}
                </button>
              ))}
            </div>

            {viewMode === 'group' && (
              <>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
                  {Object.keys(GROUPS).map(g => {
                    const hasBets = !user.is_admin && GROUPS[g].matches.some(m => bets[m.id])
                    return (
                      <button key={g} onClick={()=>setGroup(g)}
                        style={{padding:'6px 14px',borderRadius:8,position:'relative',transition:'all .15s',cursor:'pointer',fontFamily:'var(--font-b)',fontWeight:500,fontSize:13,
                          border:`1px solid ${group===g?'var(--accent)':'var(--border)'}`,
                          background:group===g?'rgba(245,166,35,.1)':'var(--bg2)',
                          color:group===g?'var(--accent)':'var(--text2)'}}>
                        Grupo {g}
                        {hasBets && <span style={{position:'absolute',top:-4,right:-4,width:8,height:8,background:'var(--green)',borderRadius:'50%'}}/>}
                      </button>
                    )
                  })}
                </div>
                <div style={{display:'flex',gap:16,flexWrap:'wrap',marginBottom:14,alignItems:'center'}}>
                  {GROUPS[group].teams.map(t => (
                    <span key={t} style={{fontSize:13,color:'var(--text2)',display:'flex',alignItems:'center',gap:6}}>
                      <Flag team={t} size={20}/> {t}
                    </span>
                  ))}
                </div>
              </>
            )}

            {loadError
              ? <div style={{color:'var(--red)',fontSize:13,padding:'20px',background:'rgba(239,68,68,.1)',borderRadius:8}}>
                  ⚠️ Error: {loadError}
                  <button onClick={()=>{setLoadError(''); viewMode==='date'?loadAllMatches():loadGroupData()}}
                    style={{marginLeft:12,fontSize:12,color:'var(--accent)',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>
                    Reintentar
                  </button>
                </div>
              : loading
              ? <div style={{color:'var(--text3)',textAlign:'center',padding:40}}>Cargando…</div>
              : viewMode === 'group'
              ? GROUPS[group].matches.map(m => (
                  <MatchCard key={m.id} match={m} user={user}
                    myBet={bets[m.id]} result={results[m.id]}
                    allBets={allBets[m.id] || []}
                    allProfiles={allProfiles}
                    points={points} onBetSaved={loadGroupData} onResultSaved={loadGroupData}/>
                ))
              : (() => {
                  const allMatches = Object.values(GROUPS).flatMap(g => g.matches)
                  allMatches.sort((a,b) => new Date(a.date) - new Date(b.date))
                  return allMatches.map(m => (
                    <MatchCard key={m.id} match={m} user={user}
                      myBet={bets[m.id]} result={results[m.id]}
                      allBets={allBets[m.id] || []}
                      allProfiles={allProfiles}
                      points={points} onBetSaved={loadAllMatches} onResultSaved={loadAllMatches}/>
                  ))
                })()
            }
          </>
        )}

        {tab === 'ko' && <KOSection user={user} points={points}/>}

        {tab === 'predictions' && <Predictions user={user} points={points}/>}

        {tab === 'ranking' && <Ranking key={rankingKey} points={points}/>}

        {tab === 'settings' && (
          <Settings
            points={points}
            currentUser={user}
            onPointsSaved={p => setPoints(p)}
            onDisplayNameChanged={handleDisplayNameChanged}
            onOpenNameModal={() => setShowNameModal(true)}
          />
        )}
      </div>
    </div>
  )
}
