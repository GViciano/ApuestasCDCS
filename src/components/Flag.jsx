// Todos los SVGs vienen de flagicons.lipis.dev (funciona en GitHub Pages sin problemas de CORS)
const CODES = {
  "México":"mx","Sudáfrica":"za","Corea del Sur":"kr","Chequia":"cz",
  "Canadá":"ca","Suiza":"ch","Qatar":"qa","Bosnia":"ba",
  "Brasil":"br","Marruecos":"ma","Haití":"ht","Escocia":"gb-sct",
  "EE.UU.":"us","Paraguay":"py","Australia":"au","Turquía":"tr",
  "Alemania":"de","Curazao":"cw","Costa de Marfil":"ci","Ecuador":"ec",
  "Países Bajos":"nl","Japón":"jp","Túnez":"tn","Suecia":"se",
  "Bélgica":"be","Egipto":"eg","Irán":"ir","Nueva Zelanda":"nz",
  "España":"es","Cabo Verde":"cv","Arabia Saudí":"sa","Uruguay":"uy",
  "Francia":"fr","Senegal":"sn","Noruega":"no","Irak":"iq",
  "Argentina":"ar","Argelia":"dz","Austria":"at","Jordania":"jo",
  "Portugal":"pt","Colombia":"co","Uzbekistán":"uz","RD Congo":"cd",
  "Inglaterra":"gb-eng","Croacia":"hr","Ghana":"gh","Panamá":"pa",
}

export default function Flag({ team, size = 32, style: extraStyle }) {
  const code = CODES[team]
  if (!code) return null

  const url = `https://flagicons.lipis.dev/flags/4x3/${code}.svg`

  return (
    <img
      src={url}
      alt={team}
      title={team}
      style={{
        width: size,
        height: Math.round(size * 0.75),
        objectFit: 'cover',
        borderRadius: 3,
        display: 'inline-block',
        flexShrink: 0,
        ...extraStyle,
      }}
      onError={e => { e.target.style.display = 'none' }}
    />
  )
}
