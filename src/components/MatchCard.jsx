import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { MINUTE_RANGES, isOpen, timeLeft, fmtDate, calcPoints, calcPointsBreakdown } from '../data.js'
import Shield from './Shield.jsx'

const s = {
  card: (hasResult, open) => ({
    background: 'var(--bg2)',
    border: `1px solid ${hasResult ? 'rgba(34,197,94,.25)' : open ? 'var(--border)' : 'rgba(245,166,35,.2)'}`,
    borderRadius: 12, padding: 16,
  }),
  score: { fontFamily: 'var(--font-d)', fontSize: 32, minWidth: 36, textAlign: 'center' },
  teamName: { fontSize: 13, color: 'var(--text2)', textAlign: 'center', marginTop: 4, fontWeight: 500 },
  input: (active) => ({
    width: 52, padding: '8px 4px', borderRadius: 8,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: 'var(--bg3)', color: 'var(--text)', fontSize: 22,
    fontFamily: 'var(--font-d)', textAlign: 'center', outline: 'none',
    // Remove spinners
    MozAppearance: 'textfield',
  }),
  sel: (active) => ({
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: 'var(--bg3)', color: 'var(--text)', fontSize: 13,
    fontFamily: 'var(--font-b)', outline: 'none',
  }),
  btn: { width: '100%', padding: 10, borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#000', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-b)' },
  btnSaved: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', fontSize: 13, cursor: 'default', fontFamily: 'var(--font-b)' },
  label: { fontSize: 11, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: .5 },
}

// Hide number input spinners globally
const noSpinnerStyle = `input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}`

export default function MatchCard({ partido, jornadaLabel, ligaId, user, myBet, allBets, allProfiles, points, isAdmin, onSaved }) {
  const hasResult = partido.home_goals !== null && partido.home_goals !== undefined

  useEffect(() => {
    if (!document.getElementById('no-spinner-style')) {
      const style = document.createElement('style')
      style.id = 'no-spinner-style'
      style.textContent = noSpinnerStyle
      document.head.appendChild(style)
    }
  }, [])

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  const timeOpen = isOpen(partido.match_date)
  const open = timeOpen && !hasResult  // can bet: time not up AND no result
  // Show other bets when: time is up OR result has been entered
  const showOtherBets = !timeOpen || hasResult

  const [homeG, setHomeG] = useState(myBet?.home_goals ?? '')
  const [awayG, setAwayG] = useState(myBet?.away_goals ?? '')
  const [scorer, setScorer] = useState(myBet?.scorer || '')
  const [minute, setMinute] = useState(myBet?.minute || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const [rHome, setRHome] = useState(hasResult ? String(partido.home_goals) : '')
  const [rAway, setRAway] = useState(hasResult ? String(partido.away_goals) : '')
  const [rScorer, setRScorer] = useState(partido.scorer || '')
  const [rMinute, setRMinute] = useState(partido.minute || '')
  const [rSaving, setRSaving] = useState(false)
  const [rSaved, setRSaved] = useState(false)

  const [homePlayers, setHomePlayers] = useState([])
  const [awayPlayers, setAwayPlayers] = useState([])

  useEffect(() => { loadPlayers() }, [partido.home, partido.away])
  useEffect(() => {
    setHomeG(myBet?.home_goals ?? '')
    setAwayG(myBet?.away_goals ?? '')
    setScorer(myBet?.scorer || '')
    setMinute(myBet?.minute || '')
  }, [myBet])

  const loadPlayers = async () => {
    const { data } = await supabase.from('liga_players')
      .select('name, team').in('team', [partido.home, partido.away]).order('name')
    if (data) {
      setHomePlayers(data.filter(p => p.team === partido.home).map(p => p.name))
      setAwayPlayers(data.filter(p => p.team === partido.away).map(p => p.name))
    }
  }

  const saveBet = async () => {
    if (homeG === '' && awayG === '') return
    setSaving(true)
    const payload = {
      user_id: user.id, partido_id: partido.id, liga_id: ligaId,
      home_goals: homeG === '' ? 0 : +homeG,
      away_goals: awayG === '' ? 0 : +awayG,
      scorer: scorer || null, minute: minute || null,
    }
    if (myBet?.id) await supabase.from('liga_bets').update(payload).eq('id', myBet.id)
    else await supabase.from('liga_bets').insert(payload)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 1500)
    onSaved?.()
  }

  const saveResult = async () => {
    if (rHome === '' && rAway === '') return
    setRSaving(true)
    await supabase.from('liga_partidos').update({
      home_goals: +rHome, away_goals: +rAway,
      scorer: rScorer || null, minute: rMinute || null,
    }).eq('id', partido.id)
    setRSaving(false); setRSaved(true)
    setTimeout(() => setRSaved(false), 1500)
    onSaved?.()
  }

  const deleteResult = async () => {
    if (!confirm(`¿Borrar resultado de ${partido.home} - ${partido.away}?`)) return
    await supabase.from('liga_partidos').update({ home_goals: null, away_goals: null, scorer: null, minute: null }).eq('id', partido.id)
    onSaved?.()
  }

  const otherBets = showOtherBets ? (allBets || []).filter(b => b.user_id !== user.id) : []
  const earned = calcPoints(myBet, hasResult ? partido : null, points)
  const breakdown = calcPointsBreakdown(myBet, hasResult ? partido : null, points)
  const tl = timeLeft(partido.match_date)

  const resultLabel = () => {
    if (!breakdown) return null
    const parts = []
    if (breakdown.result > 0) {
      if (breakdown.resultType === 'exact') parts.push(`🎯 +${breakdown.result}`)
      else if (breakdown.resultType === 'diff') parts.push(`↔️ +${breakdown.result}`)
      else parts.push(`✅ +${breakdown.result}`)
    }
    if (breakdown.scorer > 0) parts.push(`⚽ +${breakdown.scorer}`)
    if (breakdown.minute > 0) parts.push(`🕐 +${breakdown.minute}`)
    return parts.join('  ')
  }

  const PlayerSelect = ({ val, onChange, disabled }) => (
    <select value={val} onChange={e => onChange(e.target.value)} disabled={disabled} style={s.sel(!disabled)}>
      <option value="">— Ninguno / sin goles —</option>
      {homePlayers.length > 0 && (
        <optgroup label={`── ${partido.home} ──`}>
          {homePlayers.map(p => <option key={p} value={p}>{p}</option>)}
        </optgroup>
      )}
      {awayPlayers.length > 0 && (
        <optgroup label={`── ${partido.away} ──`}>
          {awayPlayers.map(p => <option key={p} value={p}>{p}</option>)}
        </optgroup>
      )}
    </select>
  )

  return (
    <div style={s.card(hasResult, open)}>
      {/* Date + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          {jornadaLabel && <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{jornadaLabel}</div>}
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>{fmtDate(partido.match_date)}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {tl && open && <span style={{ fontSize: 11, color: 'var(--accent)', background: 'rgba(245,166,35,.1)', padding: '2px 7px', borderRadius: 12 }}>⏱ {tl}</span>}
          {!open && !hasResult && <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)', padding: '2px 7px', borderRadius: 12 }}>Cerrada</span>}
          {hasResult && <span style={{ fontSize: 11, color: 'var(--green)', background: 'rgba(34,197,94,.1)', padding: '2px 7px', borderRadius: 12 }}>✓ Resultado</span>}
        </div>
      </div>

      {/* Teams + score */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <Shield team={partido.home} size={48} />
          <div style={s.teamName}>{partido.home}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {hasResult ? (
            <>
              <span style={{ ...s.score, color: 'var(--green)' }}>{partido.home_goals}</span>
              <span style={{ fontSize: 24, color: 'var(--text3)' }}>–</span>
              <span style={{ ...s.score, color: 'var(--green)' }}>{partido.away_goals}</span>
            </>
          ) : (
            <span style={{ fontSize: 20, color: 'var(--text3)', fontFamily: 'var(--font-d)', padding: '0 8px' }}>vs</span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <Shield team={partido.away} size={48} />
          <div style={s.teamName}>{partido.away}</div>
        </div>
      </div>

      {/* My result + breakdown */}
      {hasResult && myBet && (
        <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text3)' }}>
              Tu apuesta: <strong style={{ color: 'var(--text)' }}>{myBet.home_goals}–{myBet.away_goals}</strong>
              {myBet.scorer && <> · {myBet.scorer}</>}
            </span>
            <span style={{ fontFamily: 'var(--font-d)', fontSize: 20, color: earned > 0 ? 'var(--green)' : 'var(--text3)' }}>
              {earned !== null ? (earned > 0 ? `+${earned}` : '0') : '—'} pts
            </span>
          </div>
          {breakdown && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{resultLabel()}</div>}
        </div>
      )}

      {/* Bet form */}
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={s.label}>Local</div>
              <input type="number" min="0" max="20" value={homeG} onChange={e => setHomeG(e.target.value)}
                style={{ ...s.input(true), width: 64 }} placeholder="0" />
            </div>
            <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 22, fontFamily: 'var(--font-d)', paddingTop: 18 }}>–</div>
            <div style={{ textAlign: 'center' }}>
              <div style={s.label}>Visitante</div>
              <input type="number" min="0" max="20" value={awayG} onChange={e => setAwayG(e.target.value)}
                style={{ ...s.input(true), width: 64 }} placeholder="0" />
            </div>
          </div>
          <div>
            <div style={s.label}>Primer goleador</div>
            <PlayerSelect val={scorer} onChange={setScorer} disabled={false} />
          </div>
          <div>
            <div style={s.label}>Tramo del primer gol</div>
            <select value={minute} onChange={e => setMinute(e.target.value)} style={s.sel(true)}>
              <option value="">— Tramo —</option>
              {MINUTE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <button onClick={saveBet} disabled={saving} style={saved ? s.btnSaved : s.btn}>
            {saving ? 'Guardando…' : saved ? '✓ Guardada' : myBet ? 'Actualizar apuesta' : 'Guardar apuesta'}
          </button>
          {myBet && !saved && (
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--green)' }}>✓ Apuesta guardada</div>
          )}
        </div>
      )}

      {/* Closed no result — show my bet */}
      {!open && !hasResult && myBet && (
        <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text2)' }}>
          Tu apuesta: <strong>{myBet.home_goals}–{myBet.away_goals}</strong>
          {myBet.scorer && <> · {myBet.scorer}</>}
          {myBet.minute && <> · {myBet.minute}</>}
        </div>
      )}

      {/* Admin result input */}
      {isAdmin && (
        <div style={{ background: 'rgba(245,166,35,.05)', border: '1px solid rgba(245,166,35,.2)', borderRadius: 8, padding: '10px 12px', marginTop: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .7 }}>Resultado real</div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <input type="number" min="0" max="20" value={rHome} onChange={e => setRHome(e.target.value)}
              style={{ ...s.input(true), width: 64 }} placeholder="0" />
            <span style={{ color: 'var(--text3)', fontSize: 22, fontFamily: 'var(--font-d)' }}>–</span>
            <input type="number" min="0" max="20" value={rAway} onChange={e => setRAway(e.target.value)}
              style={{ ...s.input(true), width: 64 }} placeholder="0" />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Primer goleador</div>
          <div style={{ marginBottom: 8 }}>
            <PlayerSelect val={rScorer} onChange={setRScorer} disabled={false} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Tramo del primer gol</div>
          <div style={{ marginBottom: 8 }}>
            <select value={rMinute} onChange={e => setRMinute(e.target.value)} style={s.sel(true)}>
              <option value="">— Tramo —</option>
              {MINUTE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={saveResult} disabled={rSaving || (rHome === '' && rAway === '')}
              style={{ flex: 1, padding: '7px', borderRadius: 7, border: '1px solid var(--border)', background: rSaved ? 'rgba(34,197,94,.1)' : 'var(--bg3)', color: rSaved ? 'var(--green)' : 'var(--text)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-b)' }}>
              {rSaving ? 'Guardando…' : rSaved ? '✓ Guardado' : '💾 Guardar resultado'}
            </button>
            {hasResult && (
              <button onClick={deleteResult}
                style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.08)', color: 'var(--red)', fontSize: 12, cursor: 'pointer' }}>
                🗑
              </button>
            )}
          </div>
        </div>
      )}

      {/* Other users bets */}
      {showOtherBets && otherBets.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <button onClick={() => setExpanded(e => !e)}
            style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer', padding: 0 }}>
            {expanded ? '▲' : '▼'} Ver apuestas ({otherBets.length})
          </button>
          {expanded && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {otherBets.map(b => {
                const name = allProfiles[b.user_id] || '?'
                const pts = hasResult ? calcPoints(b, partido, points) : null
                const bd = hasResult ? calcPointsBreakdown(b, partido, points) : null
                return (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg3)', borderRadius: 8, padding: '7px 10px', fontSize: 13 }}>
                    <div>
                      <span style={{ fontWeight: 500 }}>{name}</span>
                      <span style={{ color: 'var(--text3)', marginLeft: 8 }}>{b.home_goals}–{b.away_goals}</span>
                      {b.scorer && <span style={{ color: 'var(--text3)', marginLeft: 6, fontSize: 11 }}>⚽ {b.scorer}</span>}
                      {b.minute && <span style={{ color: 'var(--text3)', marginLeft: 6, fontSize: 11 }}>🕐 {b.minute}</span>}
                    </div>
                    {pts !== null && (
                      <span style={{ fontFamily: 'var(--font-d)', fontSize: 16, color: pts > 0 ? 'var(--green)' : 'var(--text3)', minWidth: 40, textAlign: 'right' }}>
                        +{pts}
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
