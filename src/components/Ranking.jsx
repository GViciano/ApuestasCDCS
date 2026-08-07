import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { calcPointsBreakdown } from '../data.js'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const medals = ['🥇', '🥈', '🥉']
const COLORS = ['#f5a623','#4fc3f7','#81c784','#e57373','#ba68c8','#ff8a65','#4db6ac','#fff176','#f48fb1','#90a4ae','#a5d6a7','#ce93d8']

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function Ranking({ points, currentUser, jornadas, ligaId }) {
  const [view, setView] = useState('global')
  const [selectedJornadaId, setSelectedJornadaId] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth()) // 0-11
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear())
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(false)
  const [chartData, setChartData] = useState([])
  const [visiblePlayers, setVisiblePlayers] = useState(new Set())
  const [profiles, setProfiles] = useState([])

  useEffect(() => {
    if (jornadas.length > 0 && !selectedJornadaId) {
      const active = jornadas.find(j => j.active) || jornadas[jornadas.length - 1]
      setSelectedJornadaId(active?.id)
    }
  }, [jornadas])

  useEffect(() => {
    if (view !== 'chart') load()
    else loadChart()
  }, [view, selectedJornadaId, selectedMonth, selectedYear, points, ligaId])

  const getLigaJornadaIds = async () => {
    const { data } = await supabase.from('liga_jornadas').select('id').eq('liga_id', ligaId)
    return (data || []).map(j => j.id)
  }

  const getMembers = async () => {
    const { data } = await supabase.from('liga_memberships').select('user_id').eq('liga_id', ligaId)
    const ids = (data || []).map(m => m.user_id)
    const { data: prof } = await supabase.from('profiles').select('id, username, display_name').in('id', ids)
    return prof || []
  }

  const fetchBets = async (partidoIds) => {
    let all = [], from = 0
    while (true) {
      const { data, error } = await supabase.from('liga_bets').select('*').in('partido_id', partidoIds).range(from, from + 999)
      if (error || !data?.length) break
      all = all.concat(data)
      if (data.length < 1000) break
      from += 1000
    }
    return all
  }

  const calcScores = (members, allBets, resultsMap) => {
    return members.map(u => {
      let total = 0, exactN = 0, diffN = 0, signN = 0, scorerN = 0, minuteN = 0
      let exactPts = 0, diffPts = 0, signPts = 0, scorerPts = 0, minutePts = 0
      allBets.filter(b => b.user_id === u.id).forEach(b => {
        const result = resultsMap[b.partido_id]
        if (!result) return
        const bd = calcPointsBreakdown(b, result, points)
        if (!bd) return
        total += bd.result + bd.scorer + bd.minute
        if (bd.resultType === 'exact') { exactN++; exactPts += bd.result }
        else if (bd.resultType === 'diff') { diffN++; diffPts += bd.result }
        else if (bd.resultType === 'sign') { signN++; signPts += bd.result }
        if (bd.scorer > 0) { scorerN++; scorerPts += bd.scorer }
        if (bd.minute > 0) { minuteN++; minutePts += bd.minute }
      })
      const displayName = (u.display_name && u.display_name !== u.username)
        ? u.display_name : u.username.includes('@') ? '(sin nombre)' : u.username
      return { id: u.id, username: u.username, displayName, total, exactN, diffN, signN, scorerN, minuteN, exactPts, diffPts, signPts, scorerPts, minutePts }
    }).sort((a, b) => b.total - a.total)
  }

  const load = async () => {
    if (!ligaId) return
    setLoading(true)
    try {
      const ligaJornadaIds = await getLigaJornadaIds()
      if (!ligaJornadaIds.length) { setScores([]); setLoading(false); return }

      let partidosQuery = supabase.from('liga_partidos').select('*').in('jornada_id', ligaJornadaIds)

      if (view === 'jornada' && selectedJornadaId) {
        partidosQuery = partidosQuery.eq('jornada_id', selectedJornadaId)
      } else if (view === 'mensual') {
        // Filter by month/year using match_date
        const from = new Date(selectedYear, selectedMonth, 1).toISOString()
        const to = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).toISOString()
        partidosQuery = partidosQuery.gte('match_date', from).lte('match_date', to)
      }

      const { data: partidos } = await partidosQuery
      if (!partidos?.length) { setScores([]); setLoading(false); return }

      const resultsMap = {}
      partidos.forEach(p => { if (p.home_goals !== null) resultsMap[p.id] = p })

      const allBets = await fetchBets(partidos.map(p => p.id))
      const members = await getMembers()
      setScores(calcScores(members, allBets, resultsMap))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const loadChart = async () => {
    if (!ligaId) return
    setLoading(true)
    try {
      const { data: ligaJornadasData } = await supabase.from('liga_jornadas').select('*').eq('liga_id', ligaId).order('numero')
      const activeJornadas = ligaJornadasData || []
      const ligaJornadaIds = activeJornadas.map(j => j.id)
      if (!ligaJornadaIds.length) { setChartData([]); setLoading(false); return }

      const { data: allPartidos } = await supabase.from('liga_partidos').select('*').in('jornada_id', ligaJornadaIds).order('match_date')
      const members = await getMembers()
      setProfiles(members)

      const allPartidoIds = (allPartidos || []).map(p => p.id)
      const allBets = allPartidoIds.length ? await fetchBets(allPartidoIds) : []

      const jornadaPartidos = {}
      activeJornadas.forEach(j => { jornadaPartidos[j.id] = [] })
      ;(allPartidos || []).forEach(p => { if (jornadaPartidos[p.jornada_id]) jornadaPartidos[p.jornada_id].push(p) })

      const userCumulative = {}
      members.forEach(u => { userCumulative[u.id] = 0 })

      const data = []
      activeJornadas.forEach(j => {
        const jParts = jornadaPartidos[j.id] || []
        const resultsMap = {}
        jParts.forEach(p => { if (p.home_goals !== null) resultsMap[p.id] = p })
        if (!Object.keys(resultsMap).length) return

        members.forEach(u => {
          let jPts = 0
          allBets.filter(b => b.user_id === u.id && resultsMap[b.partido_id]).forEach(b => {
            const bd = calcPointsBreakdown(b, resultsMap[b.partido_id], points)
            if (bd) jPts += bd.result + bd.scorer + bd.minute
          })
          userCumulative[u.id] = (userCumulative[u.id] || 0) + jPts
        })

        const sorted = [...members].sort((a, b) => (userCumulative[b.id] || 0) - (userCumulative[a.id] || 0))
        const positions = {}
        sorted.forEach((u, idx) => { positions[u.id] = idx + 1 })

        const point = { jornada: j.label.replace('Jornada ', 'J'), _pts: {} }
        members.forEach(u => {
          const name = (u.display_name && u.display_name !== u.username) ? u.display_name : u.username
          point[name] = positions[u.id]
          point._pts[name] = userCumulative[u.id] || 0
        })
        data.push(point)
      })

      setChartData(data)
      const names = new Set(members.map(u => (u.display_name && u.display_name !== u.username) ? u.display_name : u.username))
      setVisiblePlayers(names)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const playerNames = profiles.map(u => (u.display_name && u.display_name !== u.username) ? u.display_name : u.username)

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const sorted = [...payload].sort((a, b) => a.value - b.value)
    const ptsData = payload[0]?.payload?._pts || {}
    return (
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', fontSize:12 }}>
        <div style={{ fontWeight:600, marginBottom:6, color:'var(--text)' }}>{label}</div>
        {sorted.map(entry => (
          <div key={entry.name} style={{ display:'flex', gap:8, alignItems:'center', marginBottom:2 }}>
            <span style={{ color:entry.color, minWidth:20 }}>{entry.value}º</span>
            <span style={{ color:'var(--text2)' }}>{entry.name}</span>
            <span style={{ color:entry.color, fontWeight:600, marginLeft:'auto', paddingLeft:12 }}>{ptsData[entry.name] ?? 0} pts</span>
          </div>
        ))}
      </div>
    )
  }

  const viewTabs = [
    ['global', '🏆 Global'],
    ['mensual', '📅 Mensual'],
    ['jornada', '📋 Jornada'],
    ['chart', '📈 Evolución'],
  ]

  return (
    <div>
      {/* View toggle */}
      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
        {viewTabs.map(([v, label]) => (
          <button key={v} onClick={() => setView(v)}
            style={{ padding:'6px 12px', borderRadius:8, cursor:'pointer', fontFamily:'var(--font-b)', fontWeight:500, fontSize:13, border:`1px solid ${view===v?'var(--accent)':'var(--border)'}`, background:view===v?'rgba(245,166,35,.1)':'var(--bg2)', color:view===v?'var(--accent)':'var(--text2)' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Jornada selector */}
      {view === 'jornada' && jornadas.length > 0 && (
        <select value={selectedJornadaId || ''} onChange={e => setSelectedJornadaId(e.target.value)}
          style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid var(--border)', background:'var(--bg2)', color:'var(--text)', fontSize:14, fontFamily:'var(--font-b)', marginBottom:14 }}>
          {jornadas.map(j => (
            <option key={j.id} value={j.id}>{j.label}{j.active?' ★':''}</option>
          ))}
        </select>
      )}

      {/* Month selector */}
      {view === 'mensual' && (
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          <select value={selectedMonth} onChange={e => setSelectedMonth(+e.target.value)}
            style={{ flex:1, padding:'9px 12px', borderRadius:9, border:'1px solid var(--border)', background:'var(--bg2)', color:'var(--text)', fontSize:14, fontFamily:'var(--font-b)' }}>
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(+e.target.value)}
            style={{ width:90, padding:'9px 12px', borderRadius:9, border:'1px solid var(--border)', background:'var(--bg2)', color:'var(--text)', fontSize:14, fontFamily:'var(--font-b)' }}>
            {[2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      {loading
        ? <div style={{ color:'var(--text3)', textAlign:'center', padding:40 }}>Cargando…</div>
        : view === 'chart'
        ? (
          <div>
            {chartData.length === 0
              ? <div style={{ color:'var(--text3)', textAlign:'center', padding:40 }}>No hay datos suficientes aún</div>
              : (
                <>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
                    {playerNames.map((name, i) => {
                      const color = COLORS[i % COLORS.length]
                      const active = visiblePlayers.has(name)
                      return (
                        <button key={name} onClick={() => {
                          setVisiblePlayers(prev => { const n = new Set(prev); active ? n.delete(name) : n.add(name); return n })
                        }}
                          style={{ padding:'4px 10px', borderRadius:20, cursor:'pointer', fontSize:12, fontFamily:'var(--font-b)', border:`1px solid ${color}`, background:active?color+'33':'transparent', color:active?color:'var(--text3)', transition:'all .15s' }}>
                          {name}
                        </button>
                      )
                    })}
                  </div>
                  <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 8px 8px' }}>
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={chartData} margin={{ top:4, right:16, left:-20, bottom:4 }}>
                        <XAxis dataKey="jornada" tick={{ fill:'var(--text3)', fontSize:11 }} />
                        <YAxis reversed tick={{ fill:'var(--text3)', fontSize:11 }} tickFormatter={v => `${v}º`}
                          domain={[1, playerNames.length || 1]} ticks={Array.from({ length: playerNames.length || 1 }, (_, i) => i + 1)} />
                        <Tooltip content={<CustomTooltip />} />
                        {playerNames.map((name, i) => visiblePlayers.has(name) && (
                          <Line key={name} type="monotone" dataKey={name}
                            stroke={COLORS[i % COLORS.length]} strokeWidth={2}
                            dot={{ r:4, fill:COLORS[i % COLORS.length] }}
                            activeDot={{ r:6 }} connectNulls />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                    <div style={{ fontSize:11, color:'var(--text3)', textAlign:'center', marginTop:4 }}>
                      Eje Y: posición (1º arriba) · Hover para ver puntos
                    </div>
                  </div>
                </>
              )
            }
          </div>
        )
        : scores.length === 0
        ? <div style={{ color:'var(--text3)', textAlign:'center', padding:40 }}>Sin datos aún</div>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {scores.map((sc, i) => {
              const isMe = currentUser && sc.username === currentUser.username
              return (
                <div key={sc.username} style={{ display:'grid', gridTemplateColumns:'36px 1fr auto', gap:12, alignItems:'center', background:isMe?'rgba(99,179,237,.12)':i===0?'rgba(245,166,35,.08)':'var(--bg2)', border:`1px solid ${isMe?'rgba(99,179,237,.5)':i===0?'rgba(245,166,35,.3)':'var(--border)'}`, borderRadius:10, padding:'12px 16px' }}>
                  <div style={{ fontFamily:'var(--font-d)', fontSize:24, color:i<3?'var(--accent)':'var(--text3)', textAlign:'center' }}>
                    {i<3?medals[i]:i+1}
                  </div>
                  <div>
                    <div style={{ fontWeight:500, fontSize:14 }}>{sc.displayName}</div>
                    <div style={{ fontSize:11, color:'var(--text3)', marginTop:3, display:'flex', gap:8, flexWrap:'wrap' }}>
                      {sc.exactN>0 && <span>🎯 {sc.exactN}× <span style={{ color:'var(--accent)' }}>+{sc.exactPts}pts</span></span>}
                      {sc.diffN>0 && <span>↔️ {sc.diffN}× <span style={{ color:'var(--accent)' }}>+{sc.diffPts}pts</span></span>}
                      {sc.signN>0 && <span>✅ {sc.signN}× <span style={{ color:'var(--accent)' }}>+{sc.signPts}pts</span></span>}
                      {sc.scorerN>0 && <span>⚽ {sc.scorerN}× <span style={{ color:'var(--accent)' }}>+{sc.scorerPts}pts</span></span>}
                      {sc.minuteN>0 && <span>🕐 {sc.minuteN}× <span style={{ color:'var(--accent)' }}>+{sc.minutePts}pts</span></span>}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'var(--font-d)', fontSize:30, color:i===0?'var(--accent)':'var(--text)' }}>{sc.total}</div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>pts</div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      }
    </div>
  )
}
