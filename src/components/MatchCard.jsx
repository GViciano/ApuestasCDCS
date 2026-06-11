import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { SQUADS, fmtDate, isOpen, timeLeft, calcPoints, calcPointsBreakdown, getSign, MINUTE_RANGES_GROUP, MINUTE_RANGES_KO } from '../data.js'
import Flag from './Flag.jsx'

const s = {
  card:(hasResult,resultSaved)=>({
    background:'var(--bg2)',
    border:`1px solid ${resultSaved?'rgba(34,197,94,.5)':hasResult?'var(--border2)':'var(--border)'}`,
    borderRadius:12,padding:16,marginBottom:10,
    transition:'border-color .3s',
  }),
  header:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12,gap:8},
  date:{fontSize:11,color:'var(--text3)',textTransform:'uppercase',letterSpacing:.8},
  badgeTime:{fontSize:12,padding:'3px 8px',borderRadius:20,color:'var(--accent)',background:'rgba(245,166,35,.1)'},
  badgePts:{fontSize:12,padding:'3px 8px',borderRadius:20,color:'var(--green)',background:'rgba(34,197,94,.15)',fontWeight:500},
  badgeZero:{fontSize:12,padding:'3px 8px',borderRadius:20,color:'var(--text3)',background:'rgba(255,255,255,.05)'},
  closed:{fontSize:11,color:'var(--text3)'},
  ptsDetail:{display:'flex',gap:5,fontSize:11,marginTop:3,justifyContent:'flex-end',flexWrap:'wrap'},
  ptsChip:{background:'rgba(34,197,94,.1)',color:'var(--green)',padding:'1px 5px',borderRadius:10},
  teams:{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:8,alignItems:'center',marginBottom:14},
  team:{textAlign:'center'},
  scoreReal:{fontFamily:'var(--font-d)',fontSize:32,color:'var(--accent)',letterSpacing:3},
  vsText:{fontFamily:'var(--font-d)',fontSize:22,color:'var(--text3)'},
  section:{borderTop:'1px solid var(--border)',paddingTop:12,marginTop:4},
  sectionLabel:(accent)=>({fontSize:11,color:accent?'var(--accent)':'var(--text3)',marginBottom:8,textTransform:'uppercase',letterSpacing:.7}),
  scoreInputs:{display:'grid',gridTemplateColumns:'1fr 20px 1fr',gap:8,alignItems:'center',marginBottom:12},
  scoreDash:{textAlign:'center',fontFamily:'var(--font-d)',fontSize:20,color:'var(--text3)'},
  scoreInput:(open)=>({textAlign:'center',background:'var(--bg4)',border:`1px solid ${open?'var(--border2)':'var(--border)'}`,borderRadius:8,padding:'8px 4px',color:'var(--text)',fontSize:22,fontFamily:'var(--font-d)',width:'100%',opacity:open?1:.4}),
  extras:{display:'flex',flexDirection:'column',gap:10,marginBottom:10},
  extraLabel:{fontSize:11,color:'var(--text3)',marginBottom:4},
  sel:(open)=>({background:'var(--bg4)',border:'1px solid var(--border)',borderRadius:7,padding:'8px 10px',color:'var(--text)',fontSize:13,width:'100%',fontFamily:'var(--font-b)',opacity:open?1:.4}),
  btnPrimary:{width:'100%',padding:9,borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer',border:'none',background:'var(--accent)',color:'#0a0f1e'},
  btnSaved:{width:'100%',padding:9,borderRadius:8,fontSize:13,fontWeight:500,cursor:'default',border:'1px solid var(--border)',background:'transparent',color:'var(--text3)'},
  btnSecondary:{width:'100%',padding:9,borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer',border:'1px solid var(--border2)',background:'var(--bg4)',color:'var(--text)'},
  btnGhost:{background:'transparent',border:'1px solid var(--border)',borderRadius:7,padding:'5px 12px',fontSize:12,color:'var(--text3)',cursor:'pointer',fontFamily:'var(--font-b)'},
  savedBet:{fontSize:12,color:'var(--text3)',textAlign:'center',padding:'6px 0',lineHeight:1.5},
  noBet:{fontSize:12,color:'var(--text3)',textAlign:'center',padding:'4px 0',fontStyle:'italic'},
}

function signLabel(hg, ag) {
  const sign = getSign(hg, ag)
  if (sign === 'H') return '🏠 Local'
  if (sign === 'A') return '✈️ Visitante'
  return '🤝 Empate'
}

export default function MatchCard({ match, user, myBet, result, allBets, allProfiles, points, onBetSaved, onResultSaved }) {
  const hasResult = result && result.home_goals !== undefined
  const open = isOpen(match.date) && !hasResult  // locked by time OR by admin result
  const tl = timeLeft(match.date)
  const earned = calcPoints(myBet, result, points)
  const breakdown = calcPointsBreakdown(myBet, result, points)
  const homeSquad = SQUADS[match.home] || []
  const awaySquad = SQUADS[match.away] || []

  // Player bet state
  const [homeG, setHomeG] = useState(myBet?.home_goals ?? '')
  const [awayG, setAwayG] = useState(myBet?.away_goals ?? '')
  const [scorer, setScorer] = useState(myBet?.scorer || '')
  const [minute, setMinute] = useState(myBet?.minute || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showOtherBets, setShowOtherBets] = useState(false)

  // Admin result state — synced with result prop via useEffect
  const [rHomeG, setRHomeG] = useState(result?.home_goals ?? '')
  const [rAwayG, setRAwayG] = useState(result?.away_goals ?? '')
  const [rScorer, setRScorer] = useState(result?.scorer || '')
  const [rMinute, setRMinute] = useState(result?.minute || '')
  const [resultSaved, setResultSaved] = useState(hasResult)

  // Sync admin fields when result prop changes (after parent reloads)
  useEffect(() => {
    if (result) {
      setRHomeG(result.home_goals ?? '')
      setRAwayG(result.away_goals ?? '')
      setRScorer(result.scorer || '')
      setRMinute(result.minute || '')
      setResultSaved(true)
    }
  }, [result])

  const saveBet = async () => {
    if (homeG === '' && awayG === '') return  // ambos vacíos = no hacer nada
    setSaving(true)
    const payload = {
      user_id: user.id, match_id: match.id,
      home_goals: homeG === '' ? 0 : +homeG,
      away_goals: awayG === '' ? 0 : +awayG,
      scorer: scorer || null,
      minute: minute || null,
    }
    if (myBet?.id) await supabase.from('bets').update(payload).eq('id', myBet.id)
    else await supabase.from('bets').insert(payload)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 1500)
    onBetSaved?.()
  }

  const saveResult = async () => {
    if (rHomeG === '' || rAwayG === '') return
    const payload = {
      match_id: match.id,
      home_goals: +rHomeG, away_goals: +rAwayG,
      scorer: rScorer || null,
      minute: rMinute || null,  // keep as string, no + conversion
    }
    if (result?.id) await supabase.from('results').update(payload).eq('id', result.id)
    else await supabase.from('results').insert(payload)
    setResultSaved(true)
    onResultSaved?.()
  }

  const deleteResult = async () => {
    if (!confirm(`¿Borrar el resultado de ${match.home} - ${match.away}? Se eliminarán los puntos calculados.`)) return
    await supabase.from('results').delete().eq('match_id', match.id)
    setRHomeG(''); setRAwayG(''); setRScorer(''); setRMinute('')
    setResultSaved(false)
    onResultSaved?.()
  }

  const minuteRanges = match.phase === 'ko' ? MINUTE_RANGES_KO : MINUTE_RANGES_GROUP

  const MinuteSelect = ({val, onChange, disabled}) => (
    <select value={val} onChange={e => onChange(e.target.value)} disabled={disabled} style={s.sel(!disabled)}>
      <option value="">— Tramo —</option>
      {minuteRanges.map(r => (
        <option key={r.value} value={r.value}>{r.label}</option>
      ))}
    </select>
  )

  const PlayerSelect = ({val, onChange, disabled}) => (
    <select value={val} onChange={e => onChange(e.target.value)} disabled={disabled} style={s.sel(!disabled)}>
      <option value="">— Ninguno / sin goles —</option>
      <optgroup label={`── ${match.home} ──`}>
        {homeSquad.map(p => <option key={p} value={p}>{p}</option>)}
      </optgroup>
      <optgroup label={`── ${match.away} ──`}>
        {awaySquad.map(p => <option key={p} value={p}>{p}</option>)}
      </optgroup>
    </select>
  )

  // Other players' bets — only shown when match is closed
  const otherBets = !open ? (allBets || []).filter(b => b.user_id !== user.id) : []

  return (
    <div style={s.card(hasResult, resultSaved && user.is_admin)}>
      {/* Header */}
      <div style={s.header}>
        <span style={s.date}>{fmtDate(match.date)}</span>
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3}}>
          {earned !== null ? (
            <>
              <span style={earned > 0 ? s.badgePts : s.badgeZero}>
                {earned > 0 ? `+${earned} pts` : '0 pts'}
              </span>
              {earned > 0 && breakdown && (
                <div style={s.ptsDetail}>
                  {breakdown.exact > 0 && <span style={s.ptsChip}>🎯+{breakdown.exact}</span>}
                  {breakdown.sign > 0 && <span style={s.ptsChip}>✅+{breakdown.sign}</span>}
                  {breakdown.scorer > 0 && <span style={s.ptsChip}>⚽+{breakdown.scorer}</span>}
                  {breakdown.minute > 0 && <span style={s.ptsChip}>🕐+{breakdown.minute}</span>}
                </div>
              )}
            </>
          ) : tl ? <span style={s.badgeTime}>⏱ {tl}</span>
            : !open && !hasResult ? <span style={s.closed}>Cerrada</span> : null}
        </div>
      </div>

      {/* Teams + score */}
      <div style={s.teams}>
        <div style={s.team}>
          <Flag team={match.home} size={48} style={{borderRadius:4,marginBottom:6}}/>
          <div style={{fontSize:12,fontWeight:500,marginTop:4,lineHeight:1.3}}>{match.home}</div>
        </div>
        <div style={{textAlign:'center',padding:'0 8px'}}>
          {hasResult
            ? <span style={s.scoreReal}>{result.home_goals} - {result.away_goals}</span>
            : <span style={s.vsText}>VS</span>}
        </div>
        <div style={s.team}>
          <Flag team={match.away} size={48} style={{borderRadius:4,marginBottom:6}}/>
          <div style={{fontSize:12,fontWeight:500,marginTop:4,lineHeight:1.3}}>{match.away}</div>
        </div>
      </div>

      {/* Player bet section */}
      {!user.is_admin && (
        <div style={s.section}>
          <div style={s.sectionLabel(false)}>Tu apuesta</div>

          {/* Only show inputs while match is open */}
          {open && (
            <>
              <div style={s.scoreInputs}>
                <input type="number" min="0" max="20" value={homeG} onChange={e => setHomeG(e.target.value)}
                  placeholder="0" style={s.scoreInput(true)}/>
                <span style={s.scoreDash}>-</span>
                <input type="number" min="0" max="20" value={awayG} onChange={e => setAwayG(e.target.value)}
                  placeholder="0" style={s.scoreInput(true)}/>
              </div>
              <div style={s.extras}>
                <div>
                  <div style={s.extraLabel}>⚽ Primer goleador</div>
                  <PlayerSelect val={scorer} onChange={setScorer} disabled={false}/>
                </div>
                <div>
                  <div style={s.extraLabel}>🕐 Tramo del primer gol</div>
                  <MinuteSelect val={minute} onChange={setMinute} disabled={false}/>
                </div>
              </div>
              <button style={saved ? s.btnSaved : s.btnPrimary} onClick={saveBet} disabled={saving}>
                {saving ? 'Guardando…' : saved ? '✓ Guardada' : myBet ? 'Actualizar apuesta' : 'Guardar apuesta'}
              </button>
              {myBet && !saved && (
                <div style={{textAlign:'center',marginTop:6,fontSize:12,color:'var(--green)'}}>
                  ✓ Apuesta guardada
                </div>
              )}
            </>
          )}

          {/* Once closed: show bet summary + breakdown if result exists */}
          {!open && myBet && (
            <div style={{marginTop:4}}>
              <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center',
                padding:'8px 10px',background:'var(--bg3)',borderRadius:8,marginBottom:6}}>
                <span style={{fontSize:12,color:'var(--text3)'}}>Tu apuesta:</span>
                <span style={{fontFamily:'var(--font-d)',fontSize:18,color:'var(--text)'}}>
                  {myBet.home_goals} - {myBet.away_goals}
                </span>
                {myBet.scorer && <span style={{fontSize:12,color:'var(--text2)'}}>⚽ {myBet.scorer}</span>}
                {myBet.minute && <span style={{fontSize:12,color:'var(--text2)'}}>🕐 {myBet.minute}'</span>}
              </div>

              {hasResult && breakdown && (
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                    padding:'5px 10px',borderRadius:7,
                    background: breakdown.exact > 0 ? 'rgba(34,197,94,.08)' : 'rgba(255,255,255,.03)'}}>
                    <span style={{fontSize:12,color: breakdown.exact > 0 ? 'var(--text)' : 'var(--text3)'}}>
                      {breakdown.exact > 0 ? '✓' : '✗'} Resultado exacto ({result.home_goals}-{result.away_goals})
                    </span>
                    <span style={{fontSize:12,fontWeight:600,color: breakdown.exact > 0 ? 'var(--green)' : 'var(--text3)'}}>
                      {breakdown.exact > 0 ? `+${breakdown.exact} pts` : '0 pts'}
                    </span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                    padding:'5px 10px',borderRadius:7,
                    background: breakdown.sign > 0 ? 'rgba(34,197,94,.08)' : 'rgba(255,255,255,.03)'}}>
                    <span style={{fontSize:12,color: breakdown.sign > 0 ? 'var(--text)' : 'var(--text3)'}}>
                      {breakdown.sign > 0 ? '✓' : '✗'} Ganador/empate
                    </span>
                    <span style={{fontSize:12,fontWeight:600,color: breakdown.sign > 0 ? 'var(--green)' : 'var(--text3)'}}>
                      {breakdown.sign > 0 ? `+${breakdown.sign} pts` : '0 pts'}
                    </span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                    padding:'5px 10px',borderRadius:7,
                    background: breakdown.scorer > 0 ? 'rgba(34,197,94,.08)' : 'rgba(255,255,255,.03)'}}>
                    <span style={{fontSize:12,color: breakdown.scorer > 0 ? 'var(--text)' : 'var(--text3)'}}>
                      {breakdown.scorer > 0 ? '✓' : '✗'} Goleador
                      {myBet.scorer && <span style={{color:'var(--text3)'}}> ({myBet.scorer}{result.scorer && myBet.scorer !== result.scorer ? ` → ${result.scorer}` : ''})</span>}
                      {!myBet.scorer && <span style={{color:'var(--text3)'}}> (no apostaste)</span>}
                    </span>
                    <span style={{fontSize:12,fontWeight:600,color: breakdown.scorer > 0 ? 'var(--green)' : 'var(--text3)'}}>
                      {breakdown.scorer > 0 ? `+${breakdown.scorer} pts` : '0 pts'}
                    </span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                    padding:'5px 10px',borderRadius:7,
                    background: breakdown.minute > 0 ? 'rgba(34,197,94,.08)' : 'rgba(255,255,255,.03)'}}>
                    <span style={{fontSize:12,color: breakdown.minute > 0 ? 'var(--text)' : 'var(--text3)'}}>
                      {breakdown.minute > 0 ? '✓' : '✗'} Tramo del gol
                      {myBet.minute && <span style={{color:'var(--text3)'}}> ({myBet.minute}'{result.minute && myBet.minute !== result.minute ? ` → ${result.minute}'` : ''})</span>}
                      {!myBet.minute && <span style={{color:'var(--text3)'}}> (no apostaste)</span>}
                    </span>
                    <span style={{fontSize:12,fontWeight:600,color: breakdown.minute > 0 ? 'var(--green)' : 'var(--text3)'}}>
                      {breakdown.minute > 0 ? `+${breakdown.minute} pts` : '0 pts'}
                    </span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                    padding:'6px 10px',borderRadius:7,marginTop:2,
                    background: earned > 0 ? 'rgba(34,197,94,.12)' : 'rgba(255,255,255,.04)',
                    border: `1px solid ${earned > 0 ? 'rgba(34,197,94,.3)' : 'var(--border)'}`}}>
                    <span style={{fontSize:13,fontWeight:600,color: earned > 0 ? 'var(--green)' : 'var(--text3)'}}>Total este partido</span>
                    <span style={{fontSize:15,fontWeight:700,color: earned > 0 ? 'var(--green)' : 'var(--text3)'}}>
                      {earned > 0 ? `+${earned} pts` : '0 pts'}
                    </span>
                  </div>
                </div>
              )}

              {/* Closed but no result yet */}
              {!hasResult && (
                <div style={{fontSize:12,color:'var(--text3)',fontStyle:'italic',padding:'4px 0'}}>
                  Esperando resultado del partido…
                </div>
              )}
            </div>
          )}
          {!open && !myBet && (
            <div style={s.noBet}>No apostaste en este partido</div>
          )}
        </div>
      )}

      {/* Admin result section */}
      {user.is_admin && (
        <div style={{...s.section, background: resultSaved ? 'rgba(34,197,94,.05)' : 'transparent', borderRadius: 8, padding: '12px 8px 8px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div style={s.sectionLabel(true)}>Resultado real</div>
            {resultSaved && (
              <span style={{fontSize:11,color:'var(--green)',background:'rgba(34,197,94,.15)',
                padding:'2px 8px',borderRadius:20,fontWeight:500}}>
                ✓ Guardado
              </span>
            )}
          </div>
          {resultSaved && (
            <div style={{fontSize:12,color:'var(--text2)',marginBottom:10,padding:'8px 10px',
              background:'var(--bg3)',borderRadius:8,display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
              <span style={{fontFamily:'var(--font-d)',fontSize:20,color:'var(--accent)'}}>
                {rHomeG} - {rAwayG}
              </span>
              {rScorer && <span>⚽ {rScorer}</span>}
              {rMinute && <span>🕐 {rMinute}'</span>}
              <span style={{color:'var(--text3)',fontSize:11,marginLeft:'auto'}}>Toca para editar ↓</span>
            </div>
          )}
          <div style={s.scoreInputs}>
            <input type="number" min="0" value={rHomeG} onChange={e => setRHomeG(e.target.value)}
              placeholder="0" style={s.scoreInput(true)}/>
            <span style={s.scoreDash}>-</span>
            <input type="number" min="0" value={rAwayG} onChange={e => setRAwayG(e.target.value)}
              placeholder="0" style={s.scoreInput(true)}/>
          </div>
          <div style={s.extras}>
            <div>
              <div style={s.extraLabel}>⚽ Primer goleador</div>
              <PlayerSelect val={rScorer} onChange={setRScorer} disabled={false}/>
            </div>
            <div>
              <div style={s.extraLabel}>🕐 Tramo del primer gol</div>
              <MinuteSelect val={rMinute} onChange={setRMinute} disabled={false}/>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button style={{...s.btnSecondary, flex:1}} onClick={saveResult}>
              {resultSaved ? '💾 Actualizar resultado' : '💾 Guardar resultado'}
            </button>
            {resultSaved && (
              <button onClick={deleteResult}
                style={{padding:'9px 14px',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer',
                  border:'1px solid rgba(239,68,68,.4)',background:'rgba(239,68,68,.08)',
                  color:'var(--red)',whiteSpace:'nowrap'}}>
                🗑 Borrar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Other players' bets */}
      {!open && otherBets.length > 0 && (
        <div style={s.section}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div style={s.sectionLabel(false)}>Apuestas de todos ({otherBets.length})</div>
            <button style={s.btnGhost} onClick={() => setShowOtherBets(v => !v)}>
              {showOtherBets ? 'Ocultar ▲' : 'Ver ▼'}
            </button>
          </div>
          {showOtherBets && (
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {otherBets.map(b => {
                const bd = calcPointsBreakdown(b, result, points)
                const bPts = bd ? bd.exact + bd.sign + bd.scorer + bd.minute : null
                const name = allProfiles[b.user_id] || '?'
                return (
                  <div key={b.user_id} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,alignItems:'center',
                    background:'var(--bg4)',borderRadius:8,padding:'8px 12px',fontSize:13}}>
                    <div>
                      <span style={{fontWeight:500,color:'var(--text2)'}}>{name}</span>
                      <span style={{color:'var(--text3)',marginLeft:10,fontFamily:'var(--font-d)',fontSize:16}}>
                        {b.home_goals} - {b.away_goals}
                      </span>
                      <span style={{color:'var(--text3)',fontSize:11,marginLeft:8}}>{signLabel(b.home_goals, b.away_goals)}</span>
                      {b.scorer && <span style={{color:'var(--text3)',fontSize:11,marginLeft:8}}>⚽ {b.scorer}</span>}
                      {b.minute && <span style={{color:'var(--text3)',fontSize:11,marginLeft:8}}>🕐 {b.minute}'</span>}
                    </div>
                    {bPts !== null && (
                      <span style={{fontSize:12,fontWeight:600,
                        color: bPts > 0 ? 'var(--green)' : 'var(--text3)',
                        background: bPts > 0 ? 'rgba(34,197,94,.15)' : 'rgba(255,255,255,.05)',
                        padding:'2px 8px',borderRadius:20,whiteSpace:'nowrap'}}>
                        {bPts > 0 ? `+${bPts} pts` : '0 pts'}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
