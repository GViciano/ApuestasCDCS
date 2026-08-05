// LaLiga EA Sports 2026/27 — fallback si la BD no está disponible
export const LALIGA_TEAMS = [
  'Athletic Club','Atlético de Madrid','Celta de Vigo','Deportivo de La Coruña',
  'Elche','Espanyol','FC Barcelona','Getafe','Las Palmas','Leganés','Málaga CF',
  'Osasuna','Racing de Santander','Rayo Vallecano','Real Betis','Real Madrid',
  'Real Sociedad','Sevilla','Valencia','Villarreal',
]

export const DEF_PTS = {
  exact: 3,      // resultado exacto
  diff: 2,       // diferencia de goles exacta (implica ganador)
  sign: 1,       // solo ganador/empate
  scorer: 2,     // goleador
  minute: 1,     // tramo de minuto
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
