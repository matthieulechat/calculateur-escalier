import Field from './Field.tsx'
import { boxOf, rotate } from '../svg.ts'
import type { NumKey, SaisieProps } from './types.ts'

interface Spot {
  k: NumKey
  label: string
  x: number // coordonnées du schéma (viewBox 400 × 300)
  y: number
  dim: [number, number, number, number] // ligne de cote x1 y1 x2 y2
}

// Schéma de principe (pas à l'échelle) : tourne à gauche, inversé si « tourne à droite », puis tourné selon l'orientation.
const PlanSchema = ({ value, onChange }: SaisieProps) => {
  const { type, jourArrondi: round, sens } = value
  const flip = type !== 'droit' && sens === 'droite'

  let outer = ''
  let inner = ''
  let foulee = ''
  let spots: Spot[] = []
  let cx = 200 // centre horizontal du dessin de l'escalier
  if (type === 'droit') {
    outer = 'M50,100 L350,100 M50,220 L350,220'
    inner = 'M50,100 L50,220 M350,100 L350,220'
    foulee = value.orientation && value.orientation >= 180 ? 'M350,160 L50,160' : 'M50,160 L350,160'
    spots = [
      { k: 'volee1', label: 'Longueur (foulée)', x: 200, y: 75, dim: [50, 88, 350, 88] },
      { k: 'largeur', label: 'Emmarchement', x: 0, y: 160, dim: [38, 100, 38, 220] },
    ]
  } else if (type === 'quart') {
    outer = 'M40,260 L340,260 L340,30'
    inner = round ? 'M40,170 L210,170 A40,40 0 0 0 250,130 L250,30' : 'M40,170 L250,170 L250,30'
    foulee = round ? 'M40,215 L210,215 A85,85 0 0 0 295,130 L295,35' : 'M40,215 L295,215 L295,35'
    cx = 190
    spots = [
      { k: 'volee1', label: 'Volée départ (→ mur du fond)', x: 190, y: 283, dim: [40, 270, 340, 270] },
      { k: 'volee2', label: 'Volée arrivée (→ mur du fond)', x: 385, y: 145, dim: [352, 30, 352, 260] },
      { k: 'largeur', label: 'Emmarchement départ', x: 0, y: 215, dim: [30, 170, 30, 260] },
      { k: 'largeur2', label: 'Emmarchement arrivée', x: 295, y: 5, dim: [250, 18, 340, 18] },
      ...(round ? [{ k: 'jour' as const, label: 'Rayon du jour', x: 195, y: 110, dim: [210, 130, 238, 158] as Spot['dim'] }] : []),
    ]
  } else {
    outer = 'M40,260 L370,260 L370,40 L40,40'
    inner = round ? 'M40,190 L270,190 A40,40 0 0 0 270,110 L40,110' : 'M40,190 L270,190 L270,110 L40,110'
    foulee = round ? 'M40,225 L270,225 A75,75 0 0 0 270,75 L45,75' : 'M40,225 L305,225 L305,75 L45,75'
    cx = 205
    spots = [
      { k: 'volee1', label: 'Volée départ (1re marche → mur du fond)', x: 205, y: 283, dim: [40, 270, 370, 270] },
      { k: 'volee2', label: 'Volée arrivée (palier → mur du fond)', x: 205, y: 17, dim: [40, 30, 370, 30] },
      { k: 'jour', label: 'Largeur du jour', x: 200, y: 150, dim: [262, 110, 262, 190] },
      { k: 'largeur', label: 'Emmarchement départ', x: 0, y: 225, dim: [30, 190, 30, 260] },
      { k: 'largeur2', label: 'Emmarchement arrivée', x: 0, y: 75, dim: [30, 40, 30, 110] },
      { k: 'profondeur', label: 'Profondeur du tournant', x: 320, y: 150, dim: [270, 150, 370, 150] },
    ]
  }
  // Repère du dessin (480 × 300) → repère affiché : symétrie, puis rotation autour du centre du cadre.
  // Droit : 180° / 270° gardent la présentation de 0° / 90°, seule la flèche de montée s'inverse (ci-dessus).
  const rot = type === 'droit' ? (value.orientation ?? 0) % 180 : (value.orientation ?? 0)
  const C = { x: 200, y: 150 }
  const T = (x: number, y: number) => rotate({ x, y: flip ? 300 - y : y }, rot, C)
  const vb = boxOf([T(-40, 0), T(440, 0), T(-40, 300), T(440, 300)])
  const [vw, vh] = [vb.maxX - vb.minX, vb.maxY - vb.minY]

  return (
    <div>
      {/* Même échelle qu'en paysage : en portrait (90° / 270°) le cadre est plus étroit et plus haut, le dessin garde sa taille. */}
      <div className="relative mx-auto w-full" style={{ aspectRatio: `${vw} / ${vh}`, maxWidth: `${(vw / 480) * 100}%` }}>
        <svg viewBox={`${vb.minX} ${vb.minY} ${vw} ${vh}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
          <g transform={`rotate(${-rot} ${C.x} ${C.y})${flip ? ' translate(0 300) scale(1 -1)' : ''}`}>
            <path d={outer} fill="none" stroke="#0f172a" strokeWidth={3} />
            <path d={inner} fill="none" stroke="#0f172a" strokeWidth={3} />
            <path d={foulee} fill="none" stroke="#dc2626" strokeWidth={1.2} strokeDasharray="6 4" markerEnd="url(#arrow)" />
            {spots.map((s) => (
              <line key={s.k} x1={s.dim[0]} y1={s.dim[1]} x2={s.dim[2]} y2={s.dim[3]} stroke="#7c3aed" strokeWidth={1} markerStart="url(#tick)" markerEnd="url(#tick)" />
            ))}
          </g>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={12} markerHeight={12} markerUnits="userSpaceOnUse" orient="auto">
              <path d="M0,0 L10,5 L0,10 Z" fill="#dc2626" />
            </marker>
            <marker id="tick" viewBox="-5 -5 10 10" markerWidth={8} markerHeight={8} orient="auto">
              <line x1={-3} y1={3} x2={3} y2={-3} stroke="#7c3aed" strokeWidth={1.5} />
            </marker>
          </defs>
        </svg>
        {spots.map((s) => {
          // Cote verticale à l'écran (hors jour) : champ tourné, collé à la cote du côté de son étiquette, donc hors du dessin.
          const [a, b] = [T(s.dim[0], s.dim[1]), T(s.dim[2], s.dim[3])]
          const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
          const label = T(s.x, s.y)
          const side = label.x < mid.x ? 'left' : 'right'
          const vertical = s.k !== 'jour' && Math.abs(b.x - a.x) < Math.abs(b.y - a.y) ? side : undefined
          const at = vertical ? { x: mid.x + (side === 'left' ? -4 : 4), y: mid.y } : label
          return <Field key={s.k} k={s.k} label={s.label} x={((at.x - vb.minX) / vw) * 100} y={((at.y - vb.minY) / vh) * 100} vertical={vertical} value={value} onChange={onChange} />
        })}
      </div>
      <p className="mt-6 text-center text-[11px] text-red-600" style={{ transform: `translateX(${((T(cx, 150).x - vb.minX) / vw - 0.5) * 100}%)` }}>Pointillé rouge : ligne de foulée, la flèche indique le sens de montée</p>
    </div>
  )
}

export default PlanSchema
