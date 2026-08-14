// LaLiga EA Sports 2026/27 — fallback si la BD no está disponible
export const LALIGA_TEAMS = [
  'Athletic Club','Atlético de Madrid','Celta de Vigo','Deportivo de La Coruña',
  'Elche','Espanyol','FC Barcelona','Getafe','Las Palmas','Leganés','Málaga CF',
  'Osasuna','Racing de Santander','Rayo Vallecano','Real Betis','Real Madrid',
  'Real Sociedad','Sevilla','Valencia','Villarreal',
]

export const DEF_PTS = {
  exact: 3,
  diff: 2,
  sign: 1,
  scorer: 2,
  minute: 1,
  advanced: false,
}

export const MINUTE_RANGES = [
  { value: '1-15',    label: "1-15'" },
  { value: '16-30',   label: "16-30'" },
  { value: '31-45+',  label: "31-45+'" },
  { value: '46-60',   label: "46-60'" },
  { value: '61-75',   label: "61-75'" },
  { value: '76-90+',  label: "76-90+'" },
]

// Madrid timezone parser
function parseMadrid(iso) {
  if (!iso) return new Date(NaN)
  if (iso.includes('Z') || /[+-]\d\d:\d\d$/.test(iso)) return new Date(iso)
  const [datePart, timePart = '00:00'] = iso.split('T')
  const [yr, mon, day] = datePart.split('-').map(Number)
  const [hr, mn = 0] = timePart.split(':').map(Number)
  const offsetHours = (mon >= 3 && mon <= 10) ? 2 : 1
  return new Date(Date.UTC(yr, mon - 1, day, hr - offsetHours, mn, 0))
}

export function fmtDate(iso) {
  const d = parseMadrid(iso)
  const day = d.toLocaleDateString('es-ES', { weekday:'short', day:'2-digit', month:'2-digit', year:'2-digit', timeZone:'Europe/Madrid' })
  const time = d.toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit', hour12:false, timeZone:'Europe/Madrid' })
  return `${day} ${time}h`
}

export function isOpen(iso) {
  return new Date() < new Date(parseMadrid(iso).getTime() - 60000)
}

export function timeLeft(iso) {
  const diff = parseMadrid(iso) - new Date() - 60000
  if (diff <= 0) return null
  const days = Math.floor(diff / 86400000)
  const hrs = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (days > 0) return `${days}d ${hrs}h`
  if (hrs > 0) return `${hrs}h ${mins}m`
  return `${mins}m`
}

export function getSign(hg, ag) {
  return hg > ag ? 'H' : hg < ag ? 'A' : 'D'
}

export function getDiff(hg, ag) {
  return Math.abs(Number(hg) - Number(ag))
}

export function calcPoints(bet, result, pts) {
  if (!bet || !result || result.home_goals === undefined) return null
  const bh = +bet.home_goals, ba = +bet.away_goals
  const rh = +result.home_goals, ra = +result.away_goals
  let p = 0
  if (bh === rh && ba === ra) {
    p += pts.exact
  } else if (getDiff(bh, ba) === getDiff(rh, ra) && getSign(bh, ba) === getSign(rh, ra)) {
    p += pts.diff
  } else if (getSign(bh, ba) === getSign(rh, ra)) {
    p += pts.sign
  }
  if (bet.scorer && result.scorer && bet.scorer === result.scorer) p += pts.scorer
  if (bet.minute && result.minute && bet.minute === result.minute) p += pts.minute
  return p
}

export function calcPointsBreakdown(bet, result, pts) {
  if (!bet || !result || result.home_goals === undefined) return null
  const bh = +bet.home_goals, ba = +bet.away_goals
  const rh = +result.home_goals, ra = +result.away_goals
  let resultPts = 0
  let resultType = null
  if (bh === rh && ba === ra) {
    resultPts = pts.exact; resultType = 'exact'
  } else if (getDiff(bh, ba) === getDiff(rh, ra) && getSign(bh, ba) === getSign(rh, ra)) {
    resultPts = pts.diff; resultType = 'diff'
  } else if (getSign(bh, ba) === getSign(rh, ra)) {
    resultPts = pts.sign; resultType = 'sign'
  }
  return {
    result: resultPts,
    resultType,
    scorer: (bet.scorer && result.scorer && bet.scorer === result.scorer) ? pts.scorer : 0,
    minute: (bet.minute && result.minute && bet.minute === result.minute) ? pts.minute : 0,
  }
}

// ── Puntuación avanzada ───────────────────────────────────────────────────────
// Para cada partido, calcula los puntos avanzados de todos los jugadores
// basándose en cuántos acertaron cada concepto
export function calcAdvancedPoints(bets, result, basePts, nPlayers) {
  if (!result || result.home_goals === null) return {}

  // Classify each bet
  const exacto = [], diff = [], sign1x2 = [], goleador = [], tramo = []

  bets.forEach(b => {
    const bd = calcPointsBreakdown(b, result, basePts)
    if (!bd) return
    if (bd.resultType === 'exact') exacto.push(b.user_id)
    else if (bd.resultType === 'diff') diff.push(b.user_id)
    else if (bd.resultType === 'sign') sign1x2.push(b.user_id)
    if (bd.scorer > 0) goleador.push(b.user_id)
    if (bd.minute > 0) tramo.push(b.user_id)
  })

  // Pools always based on nPlayers
  const poolExacto  = basePts.exact  * nPlayers
  const poolDiff    = basePts.diff   * nPlayers
  const pool1x2     = basePts.sign   * nPlayers
  const poolGol     = basePts.scorer * nPlayers
  const poolTramo   = basePts.minute * nPlayers

  // Acertantes por pool (acumulativos):
  // exacto: solo los que aciertan exacto
  // diff: exacto + diff
  // 1x2: exacto + diff + 1x2
  const acertDiff  = [...exacto, ...diff]
  const acert1x2   = [...exacto, ...diff, ...sign1x2]

  const ptsExacto  = exacto.length   > 0 ? Math.round((poolExacto  / exacto.length)   * 100) / 100 : 0
  const ptsDiff    = acertDiff.length > 0 ? Math.round((poolDiff    / acertDiff.length) * 100) / 100 : 0
  const pts1x2     = acert1x2.length  > 0 ? Math.round((pool1x2     / acert1x2.length)  * 100) / 100 : 0
  const ptsGol     = goleador.length  > 0 ? Math.round((poolGol     / goleador.length)  * 100) / 100 : 0
  const ptsTramo   = tramo.length     > 0 ? Math.round((poolTramo   / tramo.length)     * 100) / 100 : 0

  // Build result map: userId -> points breakdown
  const result_map = {}
  bets.forEach(b => {
    const uid = b.user_id
    let pts = 0, breakdown = { result: 0, resultType: null, scorer: 0, minute: 0 }

    if (exacto.includes(uid)) {
      // Exacto: entra en los 3 pools
      const r = ptsExacto + ptsDiff + pts1x2
      pts += r; breakdown.result = r; breakdown.resultType = 'exact'
    } else if (diff.includes(uid)) {
      // Diferencia: entra en pool diff + pool 1x2
      const r = ptsDiff + pts1x2
      pts += r; breakdown.result = r; breakdown.resultType = 'diff'
    } else if (sign1x2.includes(uid)) {
      // 1X2: solo pool 1x2
      pts += pts1x2; breakdown.result = pts1x2; breakdown.resultType = 'sign'
    }
    if (goleador.includes(uid)) { pts += ptsGol; breakdown.scorer = ptsGol }
    if (tramo.includes(uid))    { pts += ptsTramo; breakdown.minute = ptsTramo }

    result_map[uid] = { total: pts, breakdown }
  })

  return result_map
}
