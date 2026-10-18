import { DownloadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadDxf } from '../dxf.ts'
import { CollapsibleCard } from './Section.tsx'
import { CUT, cutLines, type Pt, type StairResult } from '../stair.ts'
import { Dim, Labels } from './Annot.tsx'
import { boxOf, dimSegs, num, rotate, viewBox, type Label } from './svg.ts'

// Aperçu en plan : contremarches brutes en trait plein, finies en pointillé.
const Plan = ({ r }: { r: StairResult }) => {
  const flip = r.input.sens === 'gauche' ? -1 : 1
  const map = (p: Pt): Pt => rotate({ x: p.x, y: flip * p.y }, r.input.orientation ?? 0)
  const path = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${map(p).x},${map(p).y}`).join(' ')

  const box = boxOf([...r.outerLine, ...r.innerLine, ...r.risers.map((x) => x.outer)].map(map))
  const fs = Math.max(box.maxX - box.minX, box.maxY - box.minY) / 40
  const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

  const { risers, n } = r
  const o = r.outerLine
  const end = r.fouleeLine[r.fouleeLine.length - 1]
  const bal = risers.findIndex((x) => x.balanced)
  const r2 = risers[Math.min(2, n - 1)]
  const cIdx = Math.min(bal + 2, n - 2)
  const turnMid = r.innerLine[Math.floor(r.innerLine.length / 2)]
  // Bout du jour (demi) : milieu des points les plus avancés vers le mur du fond.
  const xTip = Math.max(...r.innerLine.map((p) => p.x))
  const tips = r.innerLine.filter((p) => p.x > xTip - 1e-6)
  const jourTip: Pt = { x: xTip, y: tips.reduce((acc, p) => acc + p.y, 0) / tips.length }
  const dash = `${fs / 2} ${fs / 3}`
  const lerp = (a: Pt, b: Pt, k: number): Pt => map({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k })
  // Débord au-delà des cotes (décalées de 2 à 2,5 fs), sous la marge du viewBox (5 fs).
  const cuts = cutLines(r, CUT).map((c) => {
    const ext = fs * 3.5
    const pt = (t: number, k = 0): Pt => map({ x: c.a.x + c.n.x * k + c.d.x * t, y: c.a.y + c.n.y * k + c.d.y * t })
    const [t0, t1] = [-ext, c.len + ext]
    return { name: c.name, p: pt(t0), q: pt(t1), pa: pt(t0, fs * 1.5), qa: pt(t1, fs * 1.5), pl: pt(t0, fs * 2.3), ql: pt(t1, fs * 2.3) }
  })
  const labels: Label[] = [
    { at: map(risers[0].foulee), text: 'Départ (1re contremarche)' },
    { at: map(end), text: `Arrivée (${n}e CM = nez de palier)` },
    { at: lerp(risers[0].foulee, risers[1].foulee, 0.5), text: `Ligne de foulée (à ${r.f === r.f2 ? num(r.f) : `${num(r.f)} puis ${num(r.f2)}`} du jour)`, color: '#dc2626', side: 'left' },
    { at: map(mid(r.outerLine[0], r.outerLine[1])), text: 'Mur / limon extérieur' },
    // Cibles près du mur extérieur : lignes de rappel courtes, hors de la zone des cotes.
    { at: lerp(risers[1].brutInner, risers[1].brutOuter, 0.85), text: 'Contremarche brute (trait plein)', side: 'left' },
    { at: lerp(risers[1].inner, risers[1].outer, 0.95), text: 'Contremarche finie (pointillé)', side: 'left' },
  ]
  if (r.theta > 0) {
    labels.push({ at: map(turnMid), text: 'Jour (limon intérieur / collet)' })
    if (r.separation) labels.push({ at: map(r.separation[1]), text: 'Ligne de séparation', color: '#a855f7' })
    if (bal > 0) {
      labels.push({ at: map(mid(risers[bal].foulee, risers[bal + 1].foulee)), text: 'Marche balancée (bleu)', color: '#0284c7' })
      labels.push({ at: map(mid(risers[cIdx].inner, risers[cIdx + 1].inner)), text: 'Collet (giron au jour)', color: '#0284c7' })
    }
  }

  const dims = [
    { a: map(risers[0].inner), b: map(risers[0].outer), text: `Emmarchement${r.theta > 0 ? ' départ' : ''} ${num(r.input.largeur)}`, offset: -fs * 2 * flip },
    ...(r.theta > 0 ? [{ a: map(risers[n - 1].inner), b: map(risers[n - 1].outer), text: `Emmarchement arrivée ${num(r.input.largeur2)}`, offset: fs * 2 * flip }] : []),
    { a: map(o[0]), b: map(o[1]), text: `${r.theta > 0 ? 'Volée départ' : 'Longueur'} ${num(r.input.volee1)}`, offset: -flip * fs * 2.5 },
    ...(r.theta > 0 ? [{ a: map(o[o.length - 1]), b: map(o[o.length - 2]), text: `Volée arrivée ${num(r.input.volee2)}`, offset: flip * fs * 2.5 }] : []),
    { a: map(risers[1].foulee), b: map(r2.foulee), text: `g ${num(r.g)}`, offset: fs * 1.2 },
    ...(r.input.type === 'demi' ? [{ a: map(jourTip), b: map({ x: o[1].x, y: jourTip.y }), text: `Profondeur ${num(r.input.profondeur)}`, offset: fs * 1.5 }] : []),
  ]
  // Tout ce qui est tracé : les cartes d'étiquettes se posent à côté, jamais dessus.
  const segs = (pts: Pt[]): [Pt, Pt][] => pts.slice(1).map((p, i) => [map(pts[i]), map(p)])
  const near = (p: Pt): [Pt, Pt][] => [[{ x: p.x - fs / 2, y: p.y - fs / 2 }, { x: p.x + fs / 2, y: p.y + fs / 2 }]]
  const obstacles: [Pt, Pt][] = [
    ...segs(r.outerLine),
    ...segs(r.innerLine),
    ...segs(r.fouleeLine),
    ...(r.separation ? segs(r.separation) : []),
    ...risers.flatMap((x) => [...segs([x.inner, x.outer]), ...segs([x.brutInner, x.brutOuter])]),
    ...cuts.flatMap((c): [Pt, Pt][] => [[c.p, c.q], [c.p, c.pa], [c.q, c.qa], ...near(c.pl), ...near(c.ql)]),
    ...dims.flatMap((d) => dimSegs(d.a, d.b, d.offset, fs)),
  ]
  // Emprise : en demi-tournant, le contour extérieur fermé englobe aussi le jour (sinon c'est une encoche hors polygone).
  const forbid = (r.input.type === 'demi' ? r.outerLine : [...r.outerLine, ...[...r.innerLine].reverse()]).map(map)
  const area = { minX: box.minX - fs * 18, maxX: box.maxX + fs * 18, minY: box.minY - fs * 5, maxY: box.maxY + fs * 5 }

  return (
    <CollapsibleCard
      defaultOpen
      title="Plan"
      action={
        <Button variant="outline" size="sm" onClick={() => downloadDxf(r)} title="Tracés seuls, dans l'orientation choisie en configuration. Ouvrir dans AutoCAD puis Enregistrer sous DWG.">
          <DownloadIcon aria-hidden="true" />
          Export DXF
        </Button>
      }
      legend={
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <span>━ brut (béton)</span>
          <span>┄ fini (après finition de {num(r.input.finContremarche)} cm en contremarche)</span>
          <span className="text-sky-700">bleu : marches balancées</span>
          <span className="text-red-600">rouge : ligne de foulée</span>
          <span className="text-emerald-600">vert : lignes de coupe à {CUT} cm du mur</span>
          <span>Cotes en cm.</span>
        </p>
      }
    >
      <svg viewBox={viewBox(box, fs, 18)} className="h-auto w-full" role="img" aria-label="Vue en plan annotée de l'escalier">
        <path d={path(r.outerLine)} fill="none" stroke="#0f172a" strokeWidth={fs / 4} />
        <path d={path(r.innerLine)} fill="none" stroke="#0f172a" strokeWidth={fs / 4} />
        {risers.map((x) => {
          const color = x.balanced ? '#0284c7' : '#334155'
          return (
            <g key={x.j}>
              <path d={path([x.inner, x.outer])} stroke={color} strokeWidth={fs / 12} strokeDasharray={dash} />
              <path d={path([x.brutInner, x.brutOuter])} stroke={color} strokeWidth={fs / 7} />
            </g>
          )
        })}
        {r.separation && <path d={path(r.separation)} stroke="#a855f7" strokeWidth={fs / 10} strokeDasharray={`${fs} ${fs / 3} ${fs / 6} ${fs / 3}`} />}
        <defs>
          <marker id="plan-arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={fs * 1.2} markerHeight={fs * 1.2} markerUnits="userSpaceOnUse" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="#dc2626" />
          </marker>
        </defs>
        <defs>
          <marker id="plan-cut-arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={fs} markerHeight={fs} markerUnits="userSpaceOnUse" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="#059669" />
          </marker>
        </defs>
        {cuts.map((c) => (
          <g key={c.name} stroke="#059669" fill="#059669">
            <line x1={c.p.x} y1={c.p.y} x2={c.q.x} y2={c.q.y} strokeWidth={fs / 10} strokeDasharray={`${fs * 1.5} ${fs / 3} ${fs / 6} ${fs / 3}`} />
            <line x1={c.p.x} y1={c.p.y} x2={c.pa.x} y2={c.pa.y} strokeWidth={fs / 6} markerEnd="url(#plan-cut-arrow)" />
            <line x1={c.q.x} y1={c.q.y} x2={c.qa.x} y2={c.qa.y} strokeWidth={fs / 6} markerEnd="url(#plan-cut-arrow)" />
            {[c.pl, c.ql].map((l, k) => (
              <text key={k} x={l.x} y={l.y} stroke="none" fontSize={fs} fontWeight={700} textAnchor="middle" dominantBaseline="middle">
                {c.name}
              </text>
            ))}
          </g>
        ))}
        <path d={path(r.fouleeLine)} fill="none" stroke="#dc2626" strokeWidth={fs / 10} strokeDasharray={`${fs} ${fs / 2}`} markerEnd="url(#plan-arrow)" />
        {risers.slice(0, -1).map((x, i) => {
          const p = mid(map(x.foulee), map(risers[i + 1].foulee))
          return (
            <text key={x.j} x={p.x} y={p.y} dy={-fs / 3} fontSize={fs * 0.8} textAnchor="middle" fill="#0f172a">
              {i + 1}
            </text>
          )
        })}

        {dims.map((d) => (
          <Dim key={d.text} a={d.a} b={d.b} text={d.text} fs={fs} offset={d.offset} />
        ))}
        <Labels items={labels} box={box} fs={fs} gapX={5} obstacles={obstacles} area={area} forbid={forbid} />
      </svg>
    </CollapsibleCard>
  )
}

export default Plan
