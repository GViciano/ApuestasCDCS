import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { FLAGS, KO_ROUNDS } from '../data.js'
import MatchCard from './MatchCard.jsx'
import Flag from './Flag.jsx'

const ALL_TEAMS = Object.keys(FLAGS).sort()

const btn = (variant='primary') => ({
  padding: variant==='sm' ? '5px 10px' : '8px 16px',
  borderRadius: 8, border: 'none', cursor: 'pointer',
  fontFamily: 'var(--font-b)', fontWeight: 500,
  fontSize: variant==='sm' ? 12 : 13,
  background: variant==='primary' ? 'var(--accent)' : variant==='danger' ? 'var(--red)' : 'var(--bg4)',
  color: variant==='primary' ? '#0a0f1e' : 'var(--text)',
  ...(variant==='secondary' ? {border:'1px solid var(--border2)'} : {}),
})

export default function KOSection({ user, points }) {
  const [koMatches, setKoMatches] = useState([])
  const [bets, setBets] = useState({})
  const [allBets, setAllBets] = useState({})
  const [allProfiles, setAllProfiles] = useState({})
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeRound, setActiveRound] = useState('R32')

  // Admin add match form — separate date/time fields in European format
  const [addRound, setAddRound] = useState('R32')
  const [addHome, setAddHome] = useState('')
  const [addAway, setAddAway] = useState('')
  const [addDay, setAddDay] = useState('')    // DD
  const [addMonth, setAddMonth] = useState('') // MM
  const [addYear, setAddYear] = useState('')   // YYYY
  const [addHour, setAddHour] = useState('')   // HH
  const [addMin, setAddMin] = useState('00')   // MM
  const [addMsg, setAddMsg] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data: matches } = await supabase.from('ko_matches').select('*').order('created_at')
    const matchIds = (matches || []).map(m => m.id)

    const [betsRes, allBetsRes, resultsRes, profilesRes] = await Promise.all([
      matchIds.length ? supabase.from('bets').select('*').eq('user_id', user.id).in('match_id', matchIds) : { data: [] },
      matchIds.length ? supabase.from('bets').select('*').in('match_id', matchIds) : { data: [] },
      matchIds.length ? supabase.from('results').select('*').in('match_id', matchIds) : { data: [] },
      supabase.from('profiles').select('id, username, display_name').eq('is_admin', false),
    ])

    const betsMap = {}; betsRes.data?.forEach(b => { betsMap[b.match_id] = b })
    const allBetsMap = {}
    allBetsRes.data?.forEach(b => {
      if (!allBetsMap[b.match_id]) allBetsMap[b.match_id] = []
      allBetsMap[b.match_id].push(b)
    })
    const resMap = {}; resultsRes.data?.forEach(r => { resMap[r.match_id] = r })
    const profMap = {}; profilesRes.data?.forEach(p => { profMap[p.id] = p.display_name || p.username })

    setKoMatches(matches || [])
    setBets(betsMap); setAllBets(allBetsMap); setResults(resMap); setAllProfiles(profMap)
    setLoading(false)
  }

  const addMatch = async () => {
    if (!addHome || !addAway) return setAddMsg('Elige los dos equipos')
    if (addHome === addAway) return setAddMsg('Los equipos deben ser distintos')
    const round = KO_ROUNDS.find(r => r.id === addRound)
    const existingInRound = koMatches.filter(m => m.round === addRound)
    if (existingInRound.length >= round.slots) return setAddMsg(`Máximo ${round.slots} partido(s) en ${round.label}`)

    // Build ISO date from European fields — treat input as Madrid time
    let matchDate = null
    if (addDay && addMonth && addYear && addHour) {
      const dayN = parseInt(addDay), monN = parseInt(addMonth), yearN = parseInt(addYear)
      const hourN = parseInt(addHour), minN = parseInt(addMin) || 0
      // Madrid is UTC+2 in summer (Mar-Oct), UTC+1 in winter
      const isSummer = monN >= 3 && monN <= 10
      const offsetHours = isSummer ? 2 : 1
      const utcDate = new Date(Date.UTC(yearN, monN - 1, dayN, hourN - offsetHours, minN, 0))
      matchDate = utcDate.toISOString()
    }

    const id = `${addRound}_${Date.now()}`
    const { error } = await supabase.from('ko_matches').insert({
      id, round: addRound, round_label: round.label,
      home: addHome, away: addAway,
      match_date: matchDate,
    })
    if (error) return setAddMsg('Error: ' + error.message)
    setAddMsg('✓ Partido añadido')
    setAddHome(''); setAddAway('')
    setAddDay(''); setAddMonth(''); setAddYear(''); setAddHour(''); setAddMin('00')
    setShowAddForm(false)
    load()
  }

  const deleteMatch = async (id) => {
    if (!confirm('¿Eliminar este partido? Se borrarán sus apuestas y resultado.')) return
    await supabase.from('bets').delete().eq('match_id', id)
    await supabase.from('results').delete().eq('match_id', id)
    await supabase.from('ko_matches').delete().eq('id', id)
    load()
  }

  const roundsWithMatches = KO_ROUNDS.filter(r => koMatches.some(m => m.round === r.id))
  const matchesInRound = koMatches.filter(m => m.round === activeRound)

  const selStyle = {background:'var(--bg4)',border:'1px solid var(--border)',borderRadius:8,
    padding:'8px 10px',color:'var(--text)',fontSize:13,fontFamily:'var(--font-b)',width:'100%'}
  const inpStyle = {...selStyle}

  return (
    <div>
      {/* Round tabs */}
      {roundsWithMatches.length > 0 && (
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
          {roundsWithMatches.map(r => (
            <button key={r.id} onClick={()=>setActiveRound(r.id)}
              style={{padding:'6px 14px',borderRadius:8,cursor:'pointer',fontFamily:'var(--font-b)',fontWeight:500,fontSize:13,
                border:`1px solid ${activeRound===r.id?'var(--accent)':'var(--border)'}`,
                background:activeRound===r.id?'rgba(245,166,35,.1)':'var(--bg2)',
                color:activeRound===r.id?'var(--accent)':'var(--text2)'}}>
              {r.label}
            </button>
          ))}
        </div>
      )}

      {/* Admin: add match button */}
      {user.is_admin && (
        <div style={{marginBottom:16}}>
          <button style={btn('secondary')} onClick={()=>setShowAddForm(v=>!v)}>
            {showAddForm ? '✕ Cancelar' : '+ Añadir cruce'}
          </button>
          {addMsg && (
            <span style={{marginLeft:12,fontSize:13,color:addMsg.startsWith('✓')?'var(--green)':'var(--red)'}}>
              {addMsg}
            </span>
          )}
          {showAddForm && (
            <div style={{marginTop:12,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:12,padding:16,display:'flex',flexDirection:'column',gap:10}}>
              <div style={{fontSize:12,color:'var(--text2)',textTransform:'uppercase',letterSpacing:.8,marginBottom:4}}>Nuevo cruce</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div>
                  <div style={{fontSize:11,color:'var(--text3)',marginBottom:4}}>Ronda</div>
                  <select value={addRound} onChange={e=>setAddRound(e.target.value)} style={selStyle}>
                    {KO_ROUNDS.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{fontSize:11,color:'var(--text3)',marginBottom:4}}>Fecha (DD/MM/AAAA) — hora Madrid</div>
                  <div style={{display:'grid',gridTemplateColumns:'2fr 2fr 3fr 2fr 2fr',gap:4,alignItems:'center'}}>
                    <input type="number" min="1" max="31" placeholder="DD" value={addDay} onChange={e=>setAddDay(e.target.value)}
                      style={{...inpStyle,textAlign:'center',padding:'8px 4px'}}/>
                    <input type="number" min="1" max="12" placeholder="MM" value={addMonth} onChange={e=>setAddMonth(e.target.value)}
                      style={{...inpStyle,textAlign:'center',padding:'8px 4px'}}/>
                    <input type="number" min="2026" max="2027" placeholder="AAAA" value={addYear} onChange={e=>setAddYear(e.target.value)}
                      style={{...inpStyle,textAlign:'center',padding:'8px 4px'}}/>
                    <input type="number" min="0" max="23" placeholder="HH" value={addHour} onChange={e=>setAddHour(e.target.value)}
                      style={{...inpStyle,textAlign:'center',padding:'8px 4px'}}/>
                    <input type="number" min="0" max="59" placeholder="MM" value={addMin} onChange={e=>setAddMin(e.target.value)}
                      style={{...inpStyle,textAlign:'center',padding:'8px 4px'}}/>
                  </div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div>
                  <div style={{fontSize:11,color:'var(--text3)',marginBottom:4}}>Equipo local</div>
                  <select value={addHome} onChange={e=>setAddHome(e.target.value)} style={selStyle}>
                    <option value="">— Selecciona —</option>
                    {ALL_TEAMS.map(t=><option key={t} value={t}>{FLAGS[t]||''} {t}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{fontSize:11,color:'var(--text3)',marginBottom:4}}>Equipo visitante</div>
                  <select value={addAway} onChange={e=>setAddAway(e.target.value)} style={selStyle}>
                    <option value="">— Selecciona —</option>
                    {ALL_TEAMS.map(t=><option key={t} value={t}>{FLAGS[t]||''} {t}</option>)}
                  </select>
                </div>
              </div>
              {addHome && addAway && addHome !== addAway && (
                <div style={{display:'flex',alignItems:'center',gap:16,padding:'8px 12px',background:'var(--bg3)',borderRadius:8,fontSize:13}}>
                  <span style={{display:'flex',alignItems:'center',gap:6}}>
                    <Flag team={addHome} size={20}/> {addHome}
                  </span>
                  <span style={{color:'var(--text3)',fontFamily:'var(--font-d)',fontSize:18}}>VS</span>
                  <span style={{display:'flex',alignItems:'center',gap:6}}>
                    <Flag team={addAway} size={20}/> {addAway}
                  </span>
                </div>
              )}
              <button style={btn('primary')} onClick={addMatch}>Confirmar partido</button>
            </div>
          )}
        </div>
      )}

      {/* No matches yet */}
      {loading ? (
        <div style={{color:'var(--text3)',textAlign:'center',padding:40}}>Cargando…</div>
      ) : koMatches.length === 0 ? (
        <div style={{textAlign:'center',padding:40,color:'var(--text3)'}}>
          <div style={{fontSize:32,marginBottom:12}}>🏆</div>
          <div style={{fontSize:14,marginBottom:4}}>Los cruces aún no están disponibles</div>
          {user.is_admin && <div style={{fontSize:12}}>El admin los añadirá cuando terminen los grupos</div>}
        </div>
      ) : matchesInRound.length === 0 ? (
        <div style={{color:'var(--text3)',textAlign:'center',padding:32,fontSize:13}}>
          No hay partidos en esta ronda aún
        </div>
      ) : (
        matchesInRound.map(m => {
          const matchObj = {
            id: m.id,
            home: m.home,
            away: m.away,
            date: m.match_date || new Date(Date.now() + 86400000 * 30).toISOString(),
            phase: 'ko',
          }
          return (
            <div key={m.id} style={{position:'relative'}}>
              <MatchCard
                match={matchObj}
                user={user}
                myBet={bets[m.id]}
                result={results[m.id]}
                allBets={allBets[m.id] || []}
                allProfiles={allProfiles}
                points={points}
                onBetSaved={load}
                onResultSaved={load}
              />
              {user.is_admin && (
                <button onClick={()=>deleteMatch(m.id)}
                  style={{...btn('danger','sm'),position:'absolute',top:12,right:12,fontSize:11,padding:'3px 8px'}}>
                  Eliminar
                </button>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
