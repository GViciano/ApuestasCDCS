import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import MatchCard from './MatchCard.jsx'

export default function Jornada({ jornadaId, jornadas, ligaId, user, points, isAdmin, onJornadaUpdated }) {
  const [partidos, setPartidos] = useState([])
  const [bets, setBets] = useState({})
  const [allBets, setAllBets] = useState({})
  const [allProfiles, setAllProfiles] = useState({})
  const [jornadaMap, setJornadaMap] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [jornadaId, ligaId, user?.id])

  const load = async () => {
    setLoading(true); setError('')
    try {
      // Get all jornadas for this liga
      const { data: ligaJornadas } = await supabase
        .from('liga_jornadas').select('id, label').eq('liga_id', ligaId)
      const ligaJornadaIds = (ligaJornadas || []).map(j => j.id)
      const jMap = {}
      ;(ligaJornadas || []).forEach(j => { jMap[j.id] = j.label })
      setJornadaMap(jMap)

      if (!ligaJornadaIds.length) { setPartidos([]); setLoading(false); return }

      // Load partidos
      let data
      if (jornadaId) {
        // Specific jornada — all partidos sorted by date
        const res = await supabase.from('liga_partidos').select('*')
          .eq('jornada_id', jornadaId).order('match_date')
        data = res.data || []
      } else {
        // Próximos — all pending from all jornadas, sorted by date
        const res = await supabase.from('liga_partidos').select('*')
          .in('jornada_id', ligaJornadaIds).order('match_date')
        data = (res.data || []).filter(p => p.home_goals === null || p.home_goals === undefined)
      }
      setPartidos(data)

      if (!data.length) { setLoading(false); return }
      const ids = data.map(p => p.id)

      // Load bets paginated
      let allBetsData = [], from = 0
      while (true) {
        const { data: bd, error: be } = await supabase.from('liga_bets')
          .select('*').in('partido_id', ids).range(from, from + 999)
        if (be || !bd?.length) break
        allBetsData = allBetsData.concat(bd)
        if (bd.length < 1000) break
        from += 1000
      }

      // Load profiles
      const { data: profilesData } = await supabase.from('profiles')
        .select('id, username, display_name').eq('is_admin', false)

      const betsMap = {}, allBetsMap = {}, profilesMap = {}
      allBetsData.forEach(b => {
        if (b.user_id === user.id) betsMap[b.partido_id] = b
        if (!allBetsMap[b.partido_id]) allBetsMap[b.partido_id] = []
        allBetsMap[b.partido_id].push(b)
      })
      profilesData?.forEach(p => { profilesMap[p.id] = p.display_name || p.username })

      setBets(betsMap); setAllBets(allBetsMap); setAllProfiles(profilesMap)
    } catch (e) {
      setError(e.message || 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div style={{ color:'var(--text3)', textAlign:'center', padding:40 }}>Cargando…</div>
  if (error) return (
    <div style={{ color:'var(--red)', padding:20 }}>
      ⚠️ {error}
      <button onClick={load} style={{ marginLeft:8, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Reintentar</button>
    </div>
  )
  if (!partidos.length) return (
    <div style={{ color:'var(--text3)', textAlign:'center', padding:40 }}>
      {jornadaId ? 'No hay partidos en esta jornada.' : 'No hay próximos partidos.'}
      {isAdmin && ' Añádelos en Config.'}
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {partidos.map(p => (
        <MatchCard key={p.id} partido={p} jornadaLabel={jornadaMap[p.jornada_id]}
          ligaId={ligaId} user={user} myBet={bets[p.id]}
          allBets={allBets[p.id] || []} allProfiles={allProfiles}
          points={points} isAdmin={isAdmin} onSaved={load} />
      ))}
    </div>
  )
}
