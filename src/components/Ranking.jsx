import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { GROUPS, calcPointsBreakdown } from '../data.js'

export default function Ranking({ points, currentUser }) {
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const allGroupMatches = Object.values(GROUPS).flatMap(g => g.matches)
    const { data: koMatches } = await supabase.from('ko_matches').select('*')
    const allMatches = [
      ...allGroupMatches,
      ...(koMatches || []).map(m => ({ id: m.id, phase: 'ko' })),
    ]
    // Fetch all bets with pagination (Supabase default limit is 1000)
    let allBets = []
    let from = 0
    const pageSize = 1000
    while (true) {
      const { data, error } = await supabase.from('bets').select('*').range(from, from + pageSize - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      allBets = allBets.concat(data)
      if (data.length < pageSize) break
      from += pageSize
    }
    const bets = allBets
    // Paginate predictions too
    let allPredictions = []
    let predFrom = 0
    while (true) {
      const { data, error } = await supabase.from('predictions').select('*').range(predFrom, predFrom + 999)
      if (error) throw error
      if (!data || data.length === 0) break
      allPredictions = allPredictions.concat(data)
      if (data.length < 1000) break
      predFrom += 1000
    }
    const [{ data: profiles }, { data: results }, { data: realQuals }, { data: predResults }] = await Promise.all([
      supabase.from('profiles').select('*').eq('is_admin', false),
      supabase.from('results').select('*').limit(5000),
      supabase.from('group_qualifiers').select('*'),
      supabase.from('prediction_results').select('*'),
    ])
    const predictions = allPredictions

    // Real qualifiers map: { 'A': ['1st', '2nd', '3rd?'] } — sorted by position
    const resultsMap = {}
    results?.forEach(r => { resultsMap[r.match_id] = r })

    const realQualMap = {}
    realQuals?.forEach(q => {
      if (!realQualMap[q.group_id]) realQualMap[q.group_id] = [null, null, null]
      realQualMap[q.group_id][q.position - 1] = q.team
    })
    Object.keys(realQualMap).forEach(g => {
      realQualMap[g] = realQualMap[g].filter(Boolean)
    })

    // Real knockout prediction results map
    const predResMap = {}
    predResults?.forEach(r => { predResMap[r.prediction_type] = r.teams })

    const scores = (profiles || []).map(u => {
      let total=0, exactPts=0, signPts=0, scorerPts=0, minutePts=0, qualPts=0, koPredPts=0, placed=0
      let exactN=0, signN=0, scorerN=0, minuteN=0

      // Match bets
      const userBets = (bets||[]).filter(b => b.user_id===u.id)
      allMatches.forEach(m => {
        const bet = userBets.find(b => b.match_id===m.id)
        if (!bet) return
        placed++
        const bd = calcPointsBreakdown(bet, resultsMap[m.id], points)
        if (!bd) return
        exactPts+=bd.exact; signPts+=bd.sign; scorerPts+=bd.scorer; minutePts+=bd.minute
        total+=bd.exact+bd.sign+bd.scorer+bd.minute
        if (bd.exact>0) exactN++
        if (bd.sign>0) signN++
        if (bd.scorer>0) scorerN++
        if (bd.minute>0) minuteN++
      })

      // Qualifier predictions — position-aware scoring using extra='A_1','A_2' format
      const userQualPreds = (predictions||[]).filter(p =>
        p.user_id===u.id &&
        p.prediction_type==='group_qualifier' &&
        p.extra?.includes('_') // only new format: 'A_1', 'A_2'
      )
      userQualPreds.forEach(p => {
        const parts = p.extra.split('_')
        const groupId = parts[0]
        const predPos = parseInt(parts[1]) - 1 // 0=1st, 1=2nd
        if (isNaN(predPos)) return
        const real = realQualMap[groupId] || []
        if (!real.length) return
        const realPos12 = real.slice(0, 2).indexOf(p.value)
        const isThird = real[2] === p.value
        if (realPos12 >= 0) {
          if (realPos12 === predPos) { qualPts += points.qualifier; total += points.qualifier }
          else { qualPts += 1; total += 1 }
        } else if (isThird) {
          qualPts += 1; total += 1
        }
      })

      // Knockout/champion predictions
      const koPredTypes = [
        { type: 'semifinal', pts: points.semifinal },
        { type: 'finalist',  pts: points.finalist },
        { type: 'champion',  pts: points.champion },
      ]
      koPredTypes.forEach(({ type, pts: typePts }) => {
        const real = predResMap[type] || []
        if (!real.length) return
        const userTypePreds = (predictions||[]).filter(p => p.user_id===u.id && p.prediction_type===type)
        userTypePreds.forEach(p => {
          if (real.includes(p.value)) { koPredPts += typePts; total += typePts }
        })
      })

      const displayName = (u.display_name && u.display_name !== u.username)
        ? u.display_name
        : u.username.includes('@') ? '(sin nombre)' : u.username
      return { username:u.username, displayName, total, exactPts, signPts, scorerPts, minutePts, qualPts, koPredPts, placed, exactN, signN, scorerN, minuteN }
    }).sort((a,b) => b.total-a.total)

    setScores(scores)
    setLoading(false)
  }

  const medals = ['🥇','🥈','🥉']

  return (
    <div>
      <h2 style={{fontFamily:'var(--font-d)',fontSize:28,letterSpacing:1,marginBottom:20}}>CLASIFICACIÓN</h2>
      {loading ? <div style={{color:'var(--text3)',textAlign:'center',padding:40}}>Cargando…</div>
      : scores.length===0 ? <div style={{color:'var(--text3)',textAlign:'center',padding:40}}>Sin participantes aún</div>
      : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {scores.map((s,i) => {
            const isMe = currentUser && s.username === currentUser.username
            return (
            <div key={s.username} style={{display:'grid',gridTemplateColumns:'36px 1fr auto',gap:12,alignItems:'center',
              background: isMe ? 'rgba(99,179,237,.12)' : i===0 ? 'rgba(245,166,35,.08)' : 'var(--bg2)',
              border:`1px solid ${isMe ? 'rgba(99,179,237,.5)' : i===0?'rgba(245,166,35,.3)':'var(--border)'}`,
              borderRadius:10,padding:'12px 16px'}}>
              <div style={{fontFamily:'var(--font-d)',fontSize:24,color:i<3?'var(--accent)':'var(--text3)',textAlign:'center'}}>
                {i<3?medals[i]:i+1}
              </div>
              <div>
                <div style={{fontWeight:500,fontSize:14,display:'flex',alignItems:'center',gap:6}}>
                  {s.displayName}
                </div>
                <div style={{fontSize:11,color:'var(--text3)',marginTop:3,display:'flex',gap:8,flexWrap:'wrap'}}>
                  {s.exactN>0 && <span>🎯 {s.exactN}×exacto <span style={{color:'var(--accent)'}}>+{s.exactPts+s.exactN*points.sign}pts</span></span>}
                  {(s.signN-s.exactN)>0 && <span>✅ {s.signN-s.exactN}×ganador <span style={{color:'var(--accent)'}}>+{(s.signN-s.exactN)*points.sign}pts</span></span>}
                  {s.scorerN>0 && <span>⚽ {s.scorerN}×goleador <span style={{color:'var(--accent)'}}>+{s.scorerPts}pts</span></span>}
                  {s.minuteN>0 && <span>🕐 {s.minuteN}×minuto <span style={{color:'var(--accent)'}}>+{s.minutePts}pts</span></span>}
                  {s.qualPts > 0 && <span>🏟 <span style={{color:'var(--accent)'}}>+{s.qualPts}pts</span> clasif.</span>}
                  {s.koPredPts > 0 && <span>🏆 <span style={{color:'var(--accent)'}}>+{s.koPredPts}pts</span> pred.</span>}
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:'var(--font-d)',fontSize:30,color:i===0?'var(--accent)':'var(--text)'}}>{s.total}</div>
                <div style={{fontSize:11,color:'var(--text3)'}}>pts</div>
              </div>
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
