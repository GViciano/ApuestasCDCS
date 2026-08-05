import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import MatchCard from './MatchCard.jsx'

export default function Jornada({ jornadaId, jornadas, ligaId, user, points, isAdmin, onJornadaUpdated }) {
  const [pending, setPending] = useState([])   // todos los pendientes de todas las jornadas
  const [played, setPlayed] = useState([])     // jugados de la jornada seleccionada
  const [bets, setBets] = useState({})
  const [allBets, setAllBets] = useState({})
  const [allProfiles, setAllProfiles] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Map partidoId -> jornada label
  const [jornadaMap, setJornadaMap] = useState({})

  useEffect(() => { load() }, [jornadaId, user])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      // Load ALL partidos from all jornadas
      const { data: jornadasData } = await supabase.from('liga_jornadas').select('id').eq('liga_id', ligaId)
      const ligaJornadaIds = (jornadasData || []).map(j => j.id)
      if (!ligaJornadaIds.length) { setPending([]); setPlayed([]); setLoading(false); return }
      const { data: allPartidos, error: pErr } = await supabase
        .from('liga_partidos').select('*').in('jornada_id', ligaJornadaIds).order('match_date')
      if (pErr) throw pErr

      // Build jornada label map
      const jMap = {}
      if (jornadas) {
        // Load all partidos per jornada to build map
        const { data: jData } = await supabase.from('liga_jornadas').select('id, label')
        if (jData) {
          const allP = allPartidos || []
          allP.forEach(p => {
            const j = jData.find(j => j.id === p.jornada_id)
            if (j) jMap[p.id] = j.label
          })
        }
      }
      setJornadaMap(jMap)

      // Split: pending = no result, played = has result
      const pendingPartidos = (allPartidos || []).filter(p => p.home_goals === null || p.home_goals === undefined)
      // Played: only from selected jornada
      const playedPartidos = (allPartidos || []).filter(p =>
        p.jornada_id === jornadaId &&
        p.home_goals !== null && p.home_goals !== undefined
      )
      // Sort pending by date asc, played by date desc
      pendingPartidos.sort((a, b) => new Date(a.match_date) - new Date(b.match_date))
      playedPartidos.sort((a, b) => new Date(b.match_date) - new Date(a.match_date))

      setPending(pendingPartidos)
      setPlayed(playedPartidos)

      const allIds = [...pendingPartidos, ...playedPartidos].map(p => p.id)
      if (!allIds.length) { setLoading(false); return }

      // Paginated bets
      let allBetsData = []
      let from = 0
      while (true) {
        const { data, error } = await supabase.from('liga_bets').select('*').in('partido_id', allIds).range(from, from + 999)
        if (error) throw error
        if (!data || data.length === 0) break
        allBetsData = allBetsData.concat(data)
        if (data.length < 1000) break
        from += 1000
      }

      const { data: profilesData } = await supabase.from('profiles').select('id, username, display_name').eq('is_admin', false)

      const betsMap = {}
      const allBetsMap = {}
      allBetsData.forEach(b => {
        if (b.user_id === user.id) betsMap[b.partido_id] = b
        if (!allBetsMap[b.partido_id]) allBetsMap[b.partido_id] = []
        allBetsMap[b.partido_id].push(b)
      })

      const profilesMap = {}
      profilesData?.forEach(p => { profilesMap[p.id] = p.display_name || p.username })

      setBets(betsMap)
      setAllBets(allBetsMap)
      setAllProfiles(profilesMap)
    } catch (e) {
      setError(e.message || 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 40 }}>Cargando…</div>
  if (error) return <div style={{ color: 'var(--red)', padding: 20 }}>⚠️ {error} <button onClick={load} style={{ marginLeft: 8, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Reintentar</button></div>

  const renderCard = (p) => (
    <MatchCard
      key={p.id}
      partido={p}
      jornadaLabel={jornadaMap[p.id]}
      ligaId={ligaId}
      user={user}
      myBet={bets[p.id]}
      allBets={allBets[p.id] || []}
      allProfiles={allProfiles}
      points={points}
      isAdmin={isAdmin}
      onSaved={load}
    />
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Pending — all jornadas */}
      {pending.length === 0 && played.length === 0 && (
        <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 40 }}>
          {isAdmin ? 'No hay partidos. Añádelos en Config.' : 'No hay partidos disponibles.'}
        </div>
      )}
      {pending.map(renderCard)}

      {/* Divider */}
      {pending.length > 0 && played.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>Ya jugados</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>
      )}
      {played.map(renderCard)}
    </div>
  )
}
