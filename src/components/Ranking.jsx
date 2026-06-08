import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { GROUPS, calcPointsBreakdown } from '../data.js'

export default function Ranking({ points }) {
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
    const [{ data: profiles }, { data: bets }, { data: results }, { data: predictions }, { data: realQuals }, { data: predResults }] = await Promise.all([
      supabase.from('profiles').select('*').eq('is_admin', false),
      supabase.from('bets').select('*'),
      supabase.from('results').select('*'),
      supabase.from('predictions').select('*'),
      supabase.from('group_qualifiers').select('*'),
      supabase.from('prediction_results').select('*'),
    ])
    const resultsMap = {}
    results?.forEach(r => { resultsMap[r.match_id] = r })

    // Real qualifiers map: { 'A': ['1st', '2nd', '3rd?'] } — sorted by position
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
      return { username:u.username, displayName, total, exactPts, signPts, scorerPts, minutePts, qualPts, koPredPts, placed }
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
          {scores.map((s,i) => (
            <div key={s.username} style={{display:'grid',gridTemplateColumns:'36px 1fr auto',gap:12,alignItems:'center',
              background:i===0?'rgba(245,166,35,.08)':'var(--bg2)',
              border:`1px solid ${i===0?'rgba(245,166,35,.3)':'var(--border)'}`,
              borderRadius:10,padding:'12px 16px'}}>
              <div style={{fontFamily:'var(--font-d)',fontSize:24,color:i<3?'var(--accent)':'var(--text3)',textAlign:'center'}}>
                {i<3?medals[i]:i+1}
              </div>
              <div>
                <div style={{fontWeight:500,fontSize:14}}>{s.displayName}</div>
                <div style={{fontSize:11,color:'var(--text3)',marginTop:3,display:'flex',gap:8,flexWrap:'wrap'}}>
                  <span>🎯 {s.exactPts} exacto</span>
                  <span>✅ {s.signPts} ganador</span>
                  <span>⚽ {s.scorerPts} goleador</span>
                  <span>🕐 {s.minutePts} minuto</span>
                  {s.qualPts > 0 && <span>🏟 {s.qualPts} clasif.</span>}
                  {s.koPredPts > 0 && <span>🏆 {s.koPredPts} pred.</span>}
                  <span style={{color:'var(--text3)'}}>{s.placed} apuestas</span>
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:'var(--font-d)',fontSize:30,color:i===0?'var(--accent)':'var(--text)'}}>{s.total}</div>
                <div style={{fontSize:11,color:'var(--text3)'}}>pts</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
