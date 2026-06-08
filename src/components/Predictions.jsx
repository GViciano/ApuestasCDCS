import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { GROUPS, FLAGS } from '../data.js'
import Flag from './Flag.jsx'

const ALL_TEAMS = Object.keys(FLAGS).sort((a, b) => a.localeCompare(b))

// Deadline: predictions lock when the tournament starts (first match)
const TOURNAMENT_START = new Date('2026-06-11T17:00:00')
const isPredictionOpen = () => new Date() < TOURNAMENT_START

function timeLeftStr() {
  const diff = TOURNAMENT_START - new Date()
  if (diff <= 0) return null
  const days = Math.floor(diff / 86400000)
  const hrs = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (days > 0) return `${days}d ${hrs}h`
  if (hrs > 0) return `${hrs}h ${mins}m`
  return `${mins}m`
}

const sel = (accent) => ({
  background: 'var(--bg4)', border: `1px solid ${accent ? 'rgba(245,166,35,.4)' : 'var(--border)'}`,
  borderRadius: 8, padding: '8px 10px', color: 'var(--text)',
  fontSize: 13, width: '100%', fontFamily: 'var(--font-b)',
})

export default function Predictions({ user, points }) {
  const isAdmin = user.is_admin === true || user.is_admin === 'true'
  const [myPredictions, setMyPredictions] = useState({}) // key -> value or [value1, value2]
  const [allPredictions, setAllPredictions] = useState([]) // all users predictions
  const [profiles, setProfiles] = useState({}) // id -> name
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})
  const [tab, setTab] = useState('groups')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const open = isPredictionOpen()
  const tl = timeLeftStr()

  useEffect(() => { load() }, [])

  const [realQualifiers, setRealQualifiers] = useState({})
  const [realPredResults, setRealPredResults] = useState({}) // { semifinal:[...], finalist:[...], champion:[...] }

  const load = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [myRes, allRes, profRes, qualRes, predResRes] = await Promise.all([
        supabase.from('predictions').select('*').eq('user_id', user.id),
        supabase.from('predictions').select('*'),
        supabase.from('profiles').select('id, username, display_name').eq('is_admin', false),
        supabase.from('group_qualifiers').select('*'),
        supabase.from('prediction_results').select('*'),
      ])

      // Check for errors
      const errors = [myRes, allRes, profRes, qualRes, predResRes].map(r => r.error?.message).filter(Boolean)
      if (errors.length) throw new Error(errors[0])

      const map = {}
      myRes.data?.forEach(p => {
        if (p.prediction_type === 'group_qualifier') {
          // extra format: 'A_1' or 'A_2'
          const parts = p.extra?.split('_')
          const groupId = parts?.[0]
          const pos = parseInt(parts?.[1]) - 1 // 0-indexed
          const key = `qualifier_${groupId}`
          if (!map[key]) map[key] = ['', '']
          if (pos === 0 || pos === 1) map[key][pos] = p.value
        } else {
          const key = p.prediction_type
          if (!map[key]) map[key] = []
          map[key].push(p.value)
        }
      })
      setMyPredictions(map)
      setAllPredictions(allRes.data || [])

      const pm = {}
      profRes.data?.forEach(p => { pm[p.id] = p.display_name || p.username })
      setProfiles(pm)

      const qm = {}
      qualRes.data?.forEach(q => {
        if (!qm[q.group_id]) qm[q.group_id] = [null, null, null]
        qm[q.group_id][q.position - 1] = q.team
      })
      Object.keys(qm).forEach(g => { qm[g] = qm[g].filter(Boolean) })
      setRealQualifiers(qm)

      const rm = {}
      predResRes.data?.forEach(r => { rm[r.prediction_type] = r.teams })
      setRealPredResults(rm)
    } catch(err) {
      console.error('Predictions load error:', err)
      setLoadError(err.message || 'Error al cargar predicciones')
    } finally {
      setLoading(false)
    }
  }

  const savePrediction = async (type, extra, values) => {
    const key = type === 'group_qualifier' ? `qualifier_${extra}` : type
    setSaving(s => ({ ...s, [key]: true }))

    if (type === 'group_qualifier') {
      // For qualifiers, store each team with position encoded: extra='A_1', extra='A_2'
      await supabase.from('predictions').delete().eq('user_id', user.id).eq('prediction_type', type).like('extra', extra + '_%')
      const validValues = values.filter(Boolean)
      if (validValues.length > 0) {
        const rows = validValues.map((v, i) => ({
          user_id: user.id,
          prediction_type: type,
          extra: `${extra}_${i + 1}`, // e.g. 'A_1', 'A_2'
          value: v,
        }))
        const { error: insErr } = await supabase.from('predictions').insert(rows)
        if (insErr) console.error('Insert error:', insErr)
      }
    } else {
      // For other types (semifinal, finalist, champion), extra is null
      let deleteQ = supabase.from('predictions').delete().eq('user_id', user.id).eq('prediction_type', type).is('extra', null)
      const { error: delErr } = await deleteQ
      if (delErr) console.error('Delete error:', delErr)

      const validValues = values.filter(Boolean)
      if (validValues.length > 0) {
        const rows = validValues.map(v => ({
          user_id: user.id,
          prediction_type: type,
          extra: null,
          value: v,
        }))
        const { error: insErr } = await supabase.from('predictions').insert(rows)
        if (insErr) console.error('Insert error:', insErr)
      }
    }

    setSaving(s => ({ ...s, [key]: false }))
    setSaved(s => ({ ...s, [key]: true }))
    setTimeout(() => setSaved(s => ({ ...s, [key]: false })), 1500)
    load()
  }

  const tabBtn = (id, label) => (
    <button key={id} onClick={() => setTab(id)} style={{
      padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
      fontFamily: 'var(--font-b)', fontWeight: 500, fontSize: 13,
      border: `1px solid ${tab === id ? 'var(--accent)' : 'var(--border)'}`,
      background: tab === id ? 'rgba(245,166,35,.1)' : 'var(--bg2)',
      color: tab === id ? 'var(--accent)' : 'var(--text2)',
    }}>
      {label}
    </button>
  )

  return (
    <div>
      {loading && (
        <div style={{color:'var(--text3)',textAlign:'center',padding:40}}>Cargando predicciones…</div>
      )}
      {!loading && loadError && (
        <div style={{color:'var(--red)',padding:'16px',background:'rgba(239,68,68,.1)',borderRadius:8,marginBottom:16}}>
          ⚠️ {loadError}
          <button onClick={load} style={{marginLeft:12,color:'var(--accent)',background:'none',border:'none',cursor:'pointer',fontSize:13,textDecoration:'underline'}}>
            Reintentar
          </button>
        </div>
      )}
      {!loading && !loadError && (
      <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 28, letterSpacing: 1 }}>PREDICCIONES</h2>
        {open && tl && (
          <span style={{ fontSize: 12, color: 'var(--accent)', background: 'rgba(245,166,35,.1)', padding: '4px 10px', borderRadius: 20 }}>
            ⏱ Cierra en {tl}
          </span>
        )}
        {!open && (
          <span style={{ fontSize: 12, color: 'var(--text3)', background: 'var(--bg3)', padding: '4px 10px', borderRadius: 20 }}>
            🔒 Cerradas
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {tabBtn('groups', '🏟 Clasificados')}
        {tabBtn('knockouts', '🏆 Semis / Final')}
        {tabBtn('champion', '👑 Campeón')}
        {!open && tabBtn('ranking', '📊 Ver todas')}
      </div>

      {tab === 'groups' && (
        <GroupQualifiers isAdmin={isAdmin} open={open} myPredictions={myPredictions}
          saving={saving} saved={saved} onSave={savePrediction} points={points}
          realQualifiers={realQualifiers} onReload={load} />
      )}
      {tab === 'knockouts' && (
        <KnockoutPredictions isAdmin={isAdmin} open={open} myPredictions={myPredictions}
          saving={saving} saved={saved} onSave={savePrediction} points={points}
          realResults={realPredResults} onReload={load} />
      )}
      {tab === 'champion' && (
        <ChampionPrediction isAdmin={isAdmin} user={user} open={open} myPredictions={myPredictions}
          saving={saving} saved={saved} onSave={savePrediction} points={points}
          realResults={realPredResults} onReload={load} />
      )}
      {tab === 'ranking' && !open && (
        <PredictionsRanking allPredictions={allPredictions} profiles={profiles} points={points} myUserId={user.id} />
      )}
      {tab === 'ranking' && open && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 14, marginBottom: 4 }}>Las predicciones de los demás se revelan cuando empiece el torneo</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Cierra en {tl}</div>
        </div>
      )}
      </div>
      )}
    </div>
  )
}

// ── Group Qualifiers ──────────────────────────────────────────────────────────
function GroupQualifiers({ isAdmin, open, myPredictions, saving, saved, onSave, points, realQualifiers, onReload }) {
  return (
    <div>
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px', marginBottom:16, fontSize:13 }}>
        <div style={{ fontWeight:500, marginBottom:6 }}>Sistema de puntuación — Clasificados de grupo</div>
        <div style={{ display:'flex', flexDirection:'column', gap:4, color:'var(--text3)' }}>
          <div><strong style={{ color:'var(--green)' }}>{points.qualifier} pts</strong>{' '}→ Aciertas el equipo <em>y</em> la posición (1.º o 2.º exacto)</div>
          <div><strong style={{ color:'var(--accent)' }}>1 pt</strong>{' '}→ El equipo pasa como 1.º o 2.º pero en la posición contraria</div>
          <div><strong style={{ color:'var(--accent)' }}>1 pt</strong>{' '}→ El equipo pasa como mejor tercero (aunque lo pusieras 1.º o 2.º)</div>
          <div><strong style={{ color:'var(--red)' }}>0 pts</strong>{' '}→ El equipo no se clasifica</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Object.entries(GROUPS).map(([g, { teams }]) => {
          const key = `qualifier_${g}`
          const current = myPredictions[key] || []
          const real = realQualifiers[g] || []
          return (
            <GroupQualifierCard key={g} group={g} teams={teams} current={current}
              open={open} saving={saving[key]} saved={saved[key]}
              real={real} isAdmin={isAdmin} onReload={onReload}
              onSave={(vals) => onSave('group_qualifier', g, vals)}
              points={points} />
          )
        })}
      </div>
    </div>
  )
}

function GroupQualifierCard({ group, teams, current, open, saving, saved, onSave, real, isAdmin, onReload, points }) {
  const [sel1, setSel1] = useState(current[0] || '')
  const [sel2, setSel2] = useState(current[1] || '')
  const [adminSel1, setAdminSel1] = useState(real[0] || '')
  const [adminSel2, setAdminSel2] = useState(real[1] || '')
  const [adminSel3, setAdminSel3] = useState(real[2] || '') // optional 3rd qualifier
  const [adminSaving, setAdminSaving] = useState(false)
  const [adminSaved, setAdminSaved] = useState(false)

  useEffect(() => { setSel1(current[0] || ''); setSel2(current[1] || '') }, [current[0], current[1]])
  useEffect(() => {
    setAdminSel1(real[0] || '')
    setAdminSel2(real[1] || '')
    setAdminSel3(real[2] || '')
  }, [real[0], real[1], real[2]])

  const isSaved = current.length >= 2 && current[0] && current[1]
  const hasReal = real.length >= 2
  const hasThird = !!real[2]

  // Position-aware scoring:
  // - Predicted team is 1st or 2nd qualifier AND position matches → full pts
  // - Predicted team is 1st or 2nd qualifier but wrong position → 1pt
  // - Predicted team is 3rd qualifier (mejor tercero) → 1pt regardless
  // - Team doesn't qualify → 0pts
  const calcEarned = () => {
    if (!hasReal || !isSaved) return null
    let pts = 0
    ;[0, 1].forEach(i => {
      const predicted = current[i]
      if (!predicted) return
      const realPos12 = real.slice(0, 2).indexOf(predicted) // check among 1st/2nd
      const isThird = real[2] === predicted                  // check if 3rd qualifier
      if (realPos12 >= 0) {
        if (realPos12 === i) pts += points.qualifier  // exact position
        else pts += 1                                  // qualifies but wrong position
      } else if (isThird) {
        pts += 1                                       // 3rd qualifier: always 1pt
      }
    })
    return pts
  }
  const earned = calcEarned()

  const saveReal = async () => {
    if (!adminSel1 || !adminSel2 || adminSel1 === adminSel2) return
    setAdminSaving(true)
    await supabase.from('group_qualifiers').delete().eq('group_id', group)
    const rows = [
      { group_id: group, team: adminSel1, position: 1 },
      { group_id: group, team: adminSel2, position: 2 },
    ]
    if (adminSel3 && adminSel3 !== adminSel1 && adminSel3 !== adminSel2) {
      rows.push({ group_id: group, team: adminSel3, position: 3 })
    }
    await supabase.from('group_qualifiers').insert(rows)
    setAdminSaving(false)
    setAdminSaved(true)
    setTimeout(() => setAdminSaved(false), 1500)
    onReload()
  }

  const deleteReal = async () => {
    if (!confirm(`¿Borrar los clasificados del Grupo ${group}?`)) return
    await supabase.from('group_qualifiers').delete().eq('group_id', group)
    setAdminSel1(''); setAdminSel2(''); setAdminSel3('')
    onReload()
  }

  return (
    <div style={{
      background: 'var(--bg2)',
      border: `1px solid ${hasReal ? 'rgba(34,197,94,.3)' : isSaved ? 'rgba(245,166,35,.2)' : 'var(--border)'}`,
      borderRadius: 12, padding: 14,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontFamily: 'var(--font-d)', fontSize: 16, letterSpacing: 1, color: 'var(--text2)' }}>
          GRUPO {group}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {earned !== null && (
            <span style={{ fontSize: 12, fontWeight: 600,
              color: earned > 0 ? 'var(--green)' : 'var(--text3)',
              background: earned > 0 ? 'rgba(34,197,94,.15)' : 'rgba(255,255,255,.05)',
              padding: '2px 8px', borderRadius: 20 }}>
              {earned > 0 ? `+${earned} pts` : '0 pts'}
            </span>
          )}
          {isSaved && !hasReal && <span style={{ fontSize: 11, color: 'var(--accent)', background: 'rgba(245,166,35,.1)', padding: '2px 8px', borderRadius: 20 }}>✓ Guardado</span>}
          {hasReal && <span style={{ fontSize: 11, color: 'var(--green)', background: 'rgba(34,197,94,.15)', padding: '2px 8px', borderRadius: 20 }}>✓ Resultado oficial</span>}
        </div>
      </div>

      {/* Teams reference */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {teams.map(t => {
          const realPos12 = real.slice(0, 2).indexOf(t) // position among 1st/2nd
          const isThird = real[2] === t
          const qualifies = realPos12 >= 0 || isThird
          const predPos = current.indexOf(t)
          const predicted = predPos >= 0
          const exactHit = realPos12 >= 0 && predicted && realPos12 === predPos
          const partialHit = (realPos12 >= 0 && predicted && realPos12 !== predPos) || (isThird && predicted)
          return (
            <span key={t} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
              color: exactHit ? 'var(--green)' : partialHit ? 'var(--accent)' : qualifies ? 'var(--text)' : predicted ? 'var(--red)' : 'var(--text3)',
              fontWeight: (qualifies || predicted) ? 500 : 400 }}>
              <Flag team={t} size={14} />
              {t}
              {exactHit && ' ✓'}
              {partialHit && ' ~'}
              {isThird && !predicted && ' 3★'}
              {realPos12 >= 0 && !predicted && ' ★'}
              {hasReal && predicted && !qualifies && ' ✗'}
            </span>
          )
        })}
      </div>

      {/* Real qualifiers (admin only) */}
      {isAdmin && (
        <div style={{ background: 'rgba(245,166,35,.05)', border: '1px solid rgba(245,166,35,.2)', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .7 }}>
            Clasificados reales
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            {[
              [adminSel1, setAdminSel1, [adminSel2, adminSel3], '1.º clasificado'],
              [adminSel2, setAdminSel2, [adminSel1, adminSel3], '2.º clasificado'],
            ].map(([val, setVal, others, label]) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
                <select value={val} onChange={e => setVal(e.target.value)}
                  style={{ background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 8px', color: 'var(--text)', fontSize: 13, width: '100%', fontFamily: 'var(--font-b)' }}>
                  <option value="">— Selecciona —</option>
                  {teams.map(t => <option key={t} value={t} disabled={others.includes(t)}>{t}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>
              3.º mejor tercero <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>(opcional — si pasa)</span>
            </div>
            <select value={adminSel3} onChange={e => setAdminSel3(e.target.value)}
              style={{ background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 8px', color: 'var(--text)', fontSize: 13, width: '100%', fontFamily: 'var(--font-b)' }}>
              <option value="">— No pasa ningún tercero —</option>
              {teams.map(t => <option key={t} value={t} disabled={t === adminSel1 || t === adminSel2}>{t}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={saveReal} disabled={adminSaving || !adminSel1 || !adminSel2 || adminSel1 === adminSel2}
              style={{ flex: 1, padding: '6px', borderRadius: 7, border: '1px solid var(--border2)', background: adminSaved ? 'rgba(34,197,94,.1)' : 'var(--bg4)', color: adminSaved ? 'var(--green)' : 'var(--text)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-b)' }}>
              {adminSaving ? 'Guardando…' : adminSaved ? '✓ Guardado' : '💾 Guardar'}
            </button>
            {hasReal && (
              <button onClick={deleteReal}
                style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.08)', color: 'var(--red)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-b)' }}>
                🗑
              </button>
            )}
          </div>
        </div>
      )}

      {/* Player prediction inputs */}
      {!isAdmin && open && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            {[
              [sel1, setSel1, sel2, '1.º clasificado'],
              [sel2, setSel2, sel1, '2.º clasificado'],
            ].map(([val, setVal, other, label]) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
                <select value={val} onChange={e => setVal(e.target.value)} style={sel(val)}>
                  <option value="">— Selecciona —</option>
                  {teams.map(t => <option key={t} value={t} disabled={t === other}>{t}</option>)}
                </select>
              </div>
            ))}
          </div>
          <button onClick={() => onSave([sel1, sel2])} disabled={saving || !sel1 || !sel2}
            style={{ width: '100%', padding: '7px', borderRadius: 8, cursor: 'pointer',
              fontFamily: 'var(--font-b)', fontWeight: 500, fontSize: 13, border: 'none',
              background: saved ? 'transparent' : 'var(--accent)',
              color: saved ? 'var(--text3)' : '#0a0f1e',
              outline: saved ? '1px solid var(--border)' : 'none',
              opacity: (!sel1 || !sel2) ? .5 : 1 }}>
            {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar'}
          </button>
        </>
      )}

      {/* Closed: show own prediction vs real */}
      {!isAdmin && !open && (
        <div style={{ fontSize: 12 }}>
          {isSaved ? (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {current.map((t, i) => {
                const realPos12 = real.slice(0, 2).indexOf(t)
                const isThird = real[2] === t
                const exactHit = realPos12 === i
                const partialHit = (realPos12 >= 0 && !exactHit) || isThird
                const missed = hasReal && realPos12 < 0 && !isThird
                return (
                  <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 5,
                    color: exactHit ? 'var(--green)' : partialHit ? 'var(--accent)' : missed ? 'var(--red)' : 'var(--text2)' }}>
                    <Flag team={t} size={14} />
                    {i === 0 ? '1.º' : '2.º'} {t}
                    {exactHit && <span> ✓ +{points.qualifier}pts</span>}
                    {partialHit && <span> ~ +1pt{isThird ? ' (3.º)' : ''}</span>}
                    {missed && ' ✗'}
                  </span>
                )
              })}
            </div>
          ) : (
            <div style={{ color: 'var(--text3)', fontStyle: 'italic' }}>Sin predicción</div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Knockout Predictions ──────────────────────────────────────────────────────
function KnockoutPredictions({ isAdmin, open, myPredictions, saving, saved, onSave, points, realResults, onReload }) {
  const stages = [
    { key: 'semifinal', label: 'Semifinalistas', desc: 'Elige los 4 equipos que llegan a semifinales', count: 4, pts: points.semifinal },
    { key: 'finalist',  label: 'Finalistas',     desc: 'Elige los 2 equipos que llegan a la final',   count: 2, pts: points.finalist },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {stages.map(({ key, label, desc, count, pts }) => (
        <MultiTeamCard key={key} stageKey={key} label={label} desc={desc} count={count} pts={pts}
          current={myPredictions[key] || []} open={open}
          saving={saving[key]} saved={saved[key]}
          real={realResults[key] || []}
          isAdmin={isAdmin} onReload={onReload}
          onSave={(vals) => onSave(key, null, vals)} />
      ))}
    </div>
  )
}

function MultiTeamCard({ stageKey, label, desc, count, pts, current, open, saving, saved, onSave, real, isAdmin, onReload }) {
  const [selections, setSelections] = useState(() => {
    const arr = [...(current || [])]; while (arr.length < count) arr.push(''); return arr
  })
  const [adminSels, setAdminSels] = useState(() => {
    const arr = [...(real || [])]; while (arr.length < count) arr.push(''); return arr
  })
  const [adminSaving, setAdminSaving] = useState(false)
  const [adminSaved, setAdminSaved] = useState(false)

  useEffect(() => {
    const arr = [...(current || [])]; while (arr.length < count) arr.push('')
    setSelections(arr)
  }, [current.join(',')])

  useEffect(() => {
    const arr = [...(real || [])]; while (arr.length < count) arr.push('')
    setAdminSels(arr)
  }, [real.join(',')])

  const setAt = (i, val) => { const n = [...selections]; n[i] = val; setSelections(n) }
  const setAdminAt = (i, val) => { const n = [...adminSels]; n[i] = val; setAdminSels(n) }

  const isSaved = current.length === count && current.every(Boolean)
  const hasReal = real.length === count && real.every(Boolean)
  const isReady = selections.filter(Boolean).length === count && new Set(selections.filter(Boolean)).size === count
  const adminReady = adminSels.filter(Boolean).length === count && new Set(adminSels.filter(Boolean)).size === count

  const earned = !open && hasReal && isSaved
    ? current.filter(t => real.includes(t)).length * pts : null

  const saveReal = async () => {
    setAdminSaving(true)
    await supabase.from('prediction_results').upsert({ prediction_type: stageKey, teams: adminSels.filter(Boolean) }, { onConflict: 'prediction_type' })
    setAdminSaving(false); setAdminSaved(true)
    setTimeout(() => setAdminSaved(false), 1500)
    onReload()
  }
  const deleteReal = async () => {
    if (!confirm(`¿Borrar los ${label.toLowerCase()} reales?`)) return
    await supabase.from('prediction_results').delete().eq('prediction_type', stageKey)
    onReload()
  }

  return (
    <div style={{ background:'var(--bg2)', border:`1px solid ${hasReal?'rgba(34,197,94,.3)':isSaved?'rgba(245,166,35,.2)':'var(--border)'}`, borderRadius:12, padding:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <div style={{ fontFamily:'var(--font-d)', fontSize:18, letterSpacing:1 }}>{label}</div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {earned !== null && (
            <span style={{ fontSize:12, fontWeight:600, color:earned>0?'var(--green)':'var(--text3)', background:earned>0?'rgba(34,197,94,.15)':'rgba(255,255,255,.05)', padding:'2px 8px', borderRadius:20 }}>
              {earned>0?`+${earned} pts`:'0 pts'}
            </span>
          )}
          <span style={{ fontSize:12, color:'var(--accent)', background:'rgba(245,166,35,.1)', padding:'2px 8px', borderRadius:20 }}>{pts} pts c/u</span>
          {hasReal && <span style={{ fontSize:11, color:'var(--green)', background:'rgba(34,197,94,.15)', padding:'2px 8px', borderRadius:20 }}>✓ Oficial</span>}
          {!hasReal && isSaved && <span style={{ fontSize:11, color:'var(--accent)', background:'rgba(245,166,35,.1)', padding:'2px 8px', borderRadius:20 }}>✓ Guardado</span>}
        </div>
      </div>
      <p style={{ fontSize:12, color:'var(--text3)', marginBottom:12 }}>{desc}</p>

      {/* Admin real results */}
      {isAdmin && (
        <div style={{ background:'rgba(245,166,35,.05)', border:'1px solid rgba(245,166,35,.2)', borderRadius:8, padding:'10px 12px', marginBottom:12 }}>
          <div style={{ fontSize:11, color:'var(--accent)', marginBottom:8, textTransform:'uppercase', letterSpacing:.7 }}>Equipos reales</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
            {adminSels.map((val, i) => (
              <div key={i}>
                <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4 }}>Equipo {i+1}</div>
                <select value={val} onChange={e => setAdminAt(i, e.target.value)}
                  style={{ background:'var(--bg4)', border:'1px solid var(--border)', borderRadius:7, padding:'7px 8px', color:'var(--text)', fontSize:13, width:'100%', fontFamily:'var(--font-b)' }}>
                  <option value="">— Selecciona —</option>
                  {ALL_TEAMS.map(t => <option key={t} value={t} disabled={adminSels.some((s,j) => j!==i && s===t)}>{t}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={saveReal} disabled={adminSaving || !adminReady}
              style={{ flex:1, padding:'6px', borderRadius:7, border:'1px solid var(--border2)', background:adminSaved?'rgba(34,197,94,.1)':'var(--bg4)', color:adminSaved?'var(--green)':'var(--text)', fontSize:12, cursor:'pointer', fontFamily:'var(--font-b)', opacity:!adminReady?.5:1 }}>
              {adminSaving?'Guardando…':adminSaved?'✓ Guardado':'💾 Guardar'}
            </button>
            {hasReal && (
              <button onClick={deleteReal}
                style={{ padding:'6px 10px', borderRadius:7, border:'1px solid rgba(239,68,68,.3)', background:'rgba(239,68,68,.08)', color:'var(--red)', fontSize:12, cursor:'pointer', fontFamily:'var(--font-b)' }}>
                🗑
              </button>
            )}
          </div>
        </div>
      )}

      {/* Player predictions */}
      {!isAdmin && open && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
            {selections.map((val, i) => (
              <div key={i}>
                <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4 }}>Equipo {i+1}</div>
                <select value={val} onChange={e => setAt(i, e.target.value)} style={sel(val)}>
                  <option value="">— Selecciona —</option>
                  {ALL_TEAMS.map(t => <option key={t} value={t} disabled={selections.some((s,j) => j!==i && s===t)}>{t}</option>)}
                </select>
              </div>
            ))}
          </div>
          <button onClick={() => onSave(selections)} disabled={saving || !isReady}
            style={{ width:'100%', padding:9, borderRadius:8, cursor:'pointer', fontFamily:'var(--font-b)', fontWeight:500, fontSize:13, border:'none',
              background:saved?'transparent':'var(--accent)', color:saved?'var(--text3)':'#0a0f1e',
              outline:saved?'1px solid var(--border)':'none', opacity:!isReady?.5:1 }}>
            {saving?'Guardando…':saved?'✓ Guardado':'Guardar'}
          </button>
        </>
      )}
      {!isAdmin && !open && (
        <div style={{ fontSize:12 }}>
          {isSaved ? (
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {current.map(t => {
                const hit = real.includes(t)
                return (
                  <span key={t} style={{ display:'flex', alignItems:'center', gap:5, color:hit?'var(--green)':hasReal?'var(--red)':'var(--text2)' }}>
                    <Flag team={t} size={14}/> {t} {hit?'✓':hasReal?'✗':''}
                  </span>
                )
              })}
            </div>
          ) : <div style={{ color:'var(--text3)', fontStyle:'italic' }}>Sin predicción</div>}
        </div>
      )}
    </div>
  )
}

// ── Champion ──────────────────────────────────────────────────────────────────
function ChampionPrediction({ isAdmin, user, open, myPredictions, saving, saved, onSave, points, realResults, onReload }) {
  const current = myPredictions['champion']?.[0] || ''
  const realChampion = realResults['champion']?.[0] || ''
  const [selected, setSelected] = useState(current)
  const [adminSel, setAdminSel] = useState(realChampion)
  const [adminSaving, setAdminSaving] = useState(false)
  const [adminSaved, setAdminSaved] = useState(false)

  useEffect(() => setSelected(current), [current])
  useEffect(() => setAdminSel(realChampion), [realChampion])

  const hit = realChampion && current && current === realChampion

  const saveReal = async () => {
    if (!adminSel) return
    setAdminSaving(true)
    await supabase.from('prediction_results').upsert({ prediction_type: 'champion', teams: [adminSel] }, { onConflict: 'prediction_type' })
    setAdminSaving(false); setAdminSaved(true)
    setTimeout(() => setAdminSaved(false), 1500)
    onReload()
  }
  const deleteReal = async () => {
    if (!confirm('¿Borrar el campeón real?')) return
    await supabase.from('prediction_results').delete().eq('prediction_type', 'champion')
    setAdminSel('')
    onReload()
  }

  return (
    <div>
      <p style={{ fontSize:13, color:'var(--text3)', marginBottom:16 }}>
        ¿Quién ganará el Mundial? <strong style={{ color:'var(--accent)' }}>{points.champion} pts</strong> si aciertas.
      </p>

      {/* Admin real champion */}
      {isAdmin && (
        <div style={{ background:'rgba(245,166,35,.05)', border:'1px solid rgba(245,166,35,.2)', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
          <div style={{ fontSize:11, color:'var(--accent)', marginBottom:8, textTransform:'uppercase', letterSpacing:.7 }}>Campeón real</div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <select value={adminSel} onChange={e => setAdminSel(e.target.value)}
              style={{ flex:1, background:'var(--bg4)', border:'1px solid var(--border)', borderRadius:7, padding:'8px 10px', color:'var(--text)', fontSize:13, fontFamily:'var(--font-b)' }}>
              <option value="">— Selecciona —</option>
              {ALL_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={saveReal} disabled={adminSaving || !adminSel}
              style={{ padding:'8px 12px', borderRadius:7, border:'1px solid var(--border2)', background:adminSaved?'rgba(34,197,94,.1)':'var(--bg4)', color:adminSaved?'var(--green)':'var(--text)', fontSize:12, cursor:'pointer', fontFamily:'var(--font-b)' }}>
              {adminSaving?'…':adminSaved?'✓':'💾'}
            </button>
            {realChampion && (
              <button onClick={deleteReal}
                style={{ padding:'8px 10px', borderRadius:7, border:'1px solid rgba(239,68,68,.3)', background:'rgba(239,68,68,.08)', color:'var(--red)', fontSize:12, cursor:'pointer', fontFamily:'var(--font-b)' }}>
                🗑
              </button>
            )}
          </div>
          {realChampion && (
            <div style={{ marginTop:8, fontSize:12, color:'var(--text2)', display:'flex', alignItems:'center', gap:6 }}>
              <Flag team={realChampion} size={20}/> <strong>{realChampion}</strong> — campeón oficial
            </div>
          )}
        </div>
      )}

      <div style={{ background:'var(--bg2)', border:`1px solid ${realChampion?'rgba(34,197,94,.3)':current?'rgba(245,166,35,.4)':'var(--border)'}`, borderRadius:12, padding:20, textAlign:'center' }}>
        {current && (
          <div style={{ marginBottom:16 }}>
            <Flag team={current} size={64} style={{ borderRadius:6, margin:'0 auto 8px' }}/>
            <div style={{ fontFamily:'var(--font-d)', fontSize:24, color: hit?'var(--green)':realChampion?'var(--red)':'var(--accent)', letterSpacing:1 }}>
              {current}
            </div>
            <div style={{ fontSize:11, marginTop:4, color: hit?'var(--green)':realChampion?'var(--red)':'var(--text3)' }}>
              {hit ? '✓ ¡Acertaste!' : realChampion ? '✗ No acertaste' : '✓ Tu predicción'}
            </div>
            {hit && <div style={{ fontSize:20, marginTop:4 }}>+{points.champion} pts</div>}
          </div>
        )}
        {!isAdmin && open && (
          <>
            <select value={selected} onChange={e => setSelected(e.target.value)}
              style={{ ...sel(selected), maxWidth:300, marginBottom:12 }}>
              <option value="">— Elige el campeón —</option>
              {ALL_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <br/>
            <button onClick={() => onSave('champion', null, [selected])} disabled={saving['champion'] || !selected}
              style={{ padding:'10px 28px', borderRadius:8, border:'none', cursor:'pointer',
                fontFamily:'var(--font-b)', fontWeight:600, fontSize:14,
                background:saved['champion']?'transparent':'var(--accent)',
                color:saved['champion']?'var(--text3)':'#0a0f1e',
                outline:saved['champion']?'1px solid var(--border)':'none',
                opacity:!selected?.5:1 }}>
              {saving['champion']?'Guardando…':saved['champion']?'✓ Guardado':'👑 Confirmar campeón'}
            </button>
          </>
        )}
        {!isAdmin && !open && !current && (
          <div style={{ fontSize:13, color:'var(--text3)', fontStyle:'italic' }}>Sin predicción del campeón</div>
        )}
      </div>
    </div>
  )
}

// ── Predictions Ranking ───────────────────────────────────────────────────────
function PredictionsRanking({ allPredictions, profiles, points }) {
  // Group by user
  const byUser = {}
  allPredictions.forEach(p => {
    if (!byUser[p.user_id]) byUser[p.user_id] = []
    byUser[p.user_id].push(p)
  })

  const medals = ['🥇', '🥈', '🥉']

  const rows = Object.entries(byUser).map(([userId, preds]) => {
    const name = profiles[userId] || '?'
    const champion = preds.find(p => p.prediction_type === 'champion')?.value
    const finalists = preds.filter(p => p.prediction_type === 'finalist').map(p => p.value)
    const semis = preds.filter(p => p.prediction_type === 'semifinal').map(p => p.value)
    const qualifiers = preds.filter(p => p.prediction_type === 'group_qualifier')
    return { userId, name, champion, finalists, semis, qualifiers }
  }).sort((a, b) => a.name.localeCompare(b.name))

  if (rows.length === 0) {
    return <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 40 }}>Nadie ha hecho predicciones aún</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((r, i) => (
        <div key={r.userId} style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 500, fontSize: 14 }}>{r.name}</div>
            {r.champion && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <span style={{ color: 'var(--accent)' }}>👑</span>
                <Flag team={r.champion} size={20} />
                <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{r.champion}</span>
              </div>
            )}
          </div>
          {r.finalists.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text3)', marginRight: 8 }}>Final:</span>
              {r.finalists.map(t => (
                <span key={t} style={{ fontSize: 12, color: 'var(--text2)', marginRight: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Flag team={t} size={14} />{t}
                </span>
              ))}
            </div>
          )}
          {r.semis.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text3)', marginRight: 8 }}>Semis:</span>
              {r.semis.map(t => (
                <span key={t} style={{ fontSize: 12, color: 'var(--text2)', marginRight: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Flag team={t} size={14} />{t}
                </span>
              ))}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
            Clasificados: {r.qualifiers.length / 2 | 0} grupos completados
          </div>
        </div>
      ))}
    </div>
  )
}

