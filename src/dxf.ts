// Export DXF (R12 ASCII) des tracés du plan. Ouvrable dans AutoCAD, puis Enregistrer sous… DWG.
import { cutLines, cutProfile, type Pt, type StairResult } from './stair.ts'
import { hitsBox } from './components/svg.ts'

// Calques du gabarit du bureau (noms exacts pour fusionner avec ceux du DWG cible).
const VU = 'ABAK_BC-COFFRAGE-VU'
const FIN = 'ABAK_BC-COFFRAGE-FIN'
const CACHE = 'ABAK_BC-COFFRAGE-CA'
const COTA = 'ABAK_A-COTA'
const NUM = 'ABAK_A-ANNOT'
const COUPE = VU // béton coupé (brut et sous-face des coupes)
const AXE = 'ABAK_A-AXES' // lignes de coupe et traits de fin de coupe
const BLACK = 7 // blanc/noir AutoCAD
// Style des numéros de marches du gabarit (EXEMPLE ESCALIER.dwg) : Tahoma, oblique 20°, hauteur 6 cm.
const NUM_STYLE = 'ABAK_ANNO_RESA'
const NUM_H = 6
// Extrémités des lignes de coupe (même exemple) : triangle plein sur les hachures, lettre Arial gras italique.
const HACH = 'ABAK_A-HACHURES'
const CUT_STYLE = 'ABAK_COUPE'
const CUT_H = 6
// Cotes du gabarit (style ABAK_BA de l'exemple, annotatif à 1:20) : texte Tahoma 5 posé à 4,6 au-dessus de la ligne,
// trait oblique de 2,6, lignes d'attache de longueur fixe (10 côté objet, 3 au-delà), rangées tous les 16.
const DIM_STYLE = 'ABAK_BA'
const DIM_H = 5
const DIM_ROW = 16
// Cotes de giron de l'exemple (style ABAK_BA-RESA) : texte ABAK_RESA (Tahoma oblique 20°) de 4 posé à 4,1 au-dessus,
// trait oblique de 2, lignes d'attache de 9 (6 côté objet, 3 au-delà), ligne de cote à 12 du limon, dans l'escalier.
const GIR_STYLE = 'ABAK_BA-RESA'
const GIR_TXT = 'ABAK_RESA'
const GIR_H = 4
const GIR_OFF = 12
interface DimLook { style: string; font: string; h: number; gap: number; ext: [number, number]; tick: number }
const BA: DimLook = { style: DIM_STYLE, font: DIM_STYLE, h: DIM_H, gap: 4.6, ext: [10, 3], tick: 1.3 }
const RESA: DimLook = { style: GIR_STYLE, font: GIR_TXT, h: GIR_H, gap: 4.1, ext: [6, 3], tick: 1 }

// Une vue tournée de `rotation` degrés (sens trigo) autour du centre de l'escalier, puis décalée de (dx, dy).
// Les textes restent horizontaux. `brut` : sans la couche de finition (contremarches finies).
// `blocks` reçoit les blocs anonymes *D1, *D2… des cotes.
const view = (r: StairResult, rotation: number, blocks: string[], dx: number, dy = 0, brut = false): string[] => {
  const [cos, sin] = [Math.cos((rotation * Math.PI) / 180), Math.sin((rotation * Math.PI) / 180)]
  const flip = r.input.sens === 'gauche' ? -1 : 1
  // Repère écran (comme Plan.tsx), puis Y inversé : le SVG a l'axe Y vers le bas, le DXF vers le haut.
  const scr = (p: Pt): Pt => ({ x: p.x, y: flip * p.y })
  const all = [...r.outerLine, ...r.innerLine].map(scr)
  const span = (k: 'x' | 'y') => Math.max(...all.map((p) => p[k])) - Math.min(...all.map((p) => p[k]))
  const mid = (k: 'x' | 'y') => (Math.max(...all.map((p) => p[k])) + Math.min(...all.map((p) => p[k]))) / 2
  const out = (p: Pt): Pt => {
    const [x, y] = [p.x - mid('x'), mid('y') - p.y]
    return { x: x * cos - y * sin + dx, y: x * sin + y * cos + dy }
  }
  const size = Math.max(span('x'), span('y')) / 40 // même échelle de texte qu'à l'écran

  const ents: string[] = []
  const drawn: [Pt, Pt][] = [] // segments tracés (repère DXF), pour que les numéros les évitent
  const color = (c?: number) => (c ? ['62', `${c}`] : [])
  // seg/segs : points déjà dans le repère écran ; line/poly : points du moteur.
  // raw : points déjà dans le repère DXF.
  const raw = (layer: string, p: Pt, q: Pt, c?: number) => {
    if (Math.hypot(q.x - p.x, q.y - p.y) < 1e-6) return // points doubles du contour (angle vif du jour)
    drawn.push([p, q])
    ents.push('0', 'LINE', '8', layer, ...color(c), '10', `${p.x}`, '20', `${p.y}`, '30', '0', '11', `${q.x}`, '21', `${q.y}`, '31', '0')
  }
  const seg = (layer: string, a: Pt, b: Pt, c?: number) => raw(layer, out(a), out(b), c)
  const segs = (layer: string, pts: Pt[]) => pts.slice(1).forEach((p, i) => seg(layer, pts[i], p))
  const line = (layer: string, a: Pt, b: Pt, c?: number) => seg(layer, scr(a), scr(b), c)
  const poly = (layer: string, pts: Pt[]) => segs(layer, pts.map(scr))

  // Limons prolongés jusqu'à la dernière contremarche brute, quand elle dépasse le nez de palier fini : escalier fermé.
  const last = r.risers[r.risers.length - 1]
  const toEnd = (pts: Pt[], end: Pt): Pt[] => {
    const [a, b] = [pts[pts.length - 2], pts[pts.length - 1]]
    return (end.x - b.x) * (b.x - a.x) + (end.y - b.y) * (b.y - a.y) > 1e-6 ? [...pts, end] : pts
  }
  // Au départ, le limon commence à la 1re contremarche brute : le bout devant (épaisseur de finition) est en finition
  // sur la vue finie, absent de la vue brute.
  const first = r.risers[0]
  const outer = toEnd([first.brutOuter, ...r.outerLine.slice(1)], last.brutOuter)
  const inner = toEnd([first.brutInner, ...r.innerLine.slice(1)], last.brutInner)
  poly(VU, outer)
  poly(VU, inner)
  if (!brut) {
    line(CACHE, r.outerLine[0], first.brutOuter)
    line(CACHE, r.innerLine[0], first.brutInner)
  }
  r.risers.forEach((x, i) => {
    const edge = i === 0 || i === r.risers.length - 1
    // Vue brute : contremarches intermédiaires en couleur du calque FIN.
    line(edge ? VU : FIN, x.brutInner, x.brutOuter, edge || brut ? undefined : BLACK)
    if (!brut) line(CACHE, x.inner, x.outer)
  })

  // Ligne de foulée (calque cotation, absente de la vue brute) : double ligne au départ, flèche ouverte à l'arrivée, croquis du bureau.
  const h = NUM_H // hauteur des numéros, sert d'unité aux symboles (cotes de l'exemple du bureau)
  const unit = (p: Pt, q: Pt): Pt => {
    const l = Math.hypot(q.x - p.x, q.y - p.y) || 1
    return { x: (q.x - p.x) / l, y: (q.y - p.y) / l }
  }
  const at = (p: Pt, d: Pt, k: number, n = 0): Pt => ({ x: p.x + d.x * k - d.y * n, y: p.y + d.y * k + d.x * n })
  const f = r.fouleeLine.map(scr)
  const d0 = unit(f[0], f[1])
  const start = at(f[0], d0, -1.1 * h)
  if (!brut) {
    segs(COTA, [start, ...f])
    for (const side of [-0.3 * h, 0.3 * h]) seg(COTA, at(f[0], d0, -1.1 * h, side), at(f[0], d0, 0.45 * h, side))
    const end = f[f.length - 1]
    const d1 = unit(f[f.length - 2], end)
    for (const side of [-0.45 * h, 0.45 * h]) seg(COTA, end, at(end, d1, -1.5 * h, side))
  }

  // Lignes de coupe (calque axe), cotes de l'exemple du bureau : à chaque bout, triangle plein côté vue
  // (base 10 posée à 1 de la ligne et finissant à son extrémité, hauteur 3, couleur 18), puis la lettre
  // posée sur la ligne, côté vue, à 1 au-delà de l'extrémité. Lettre horizontale comme les autres textes.
  for (const c of cutLines(r)) {
    const pt = (t: number, k = 0): Pt => scr({ x: c.a.x + c.n.x * k + c.d.x * t, y: c.a.y + c.n.y * k + c.d.y * t })
    const ext = brut ? 2 * size : 2 * DIM_ROW + 10 // au-delà des cotes globales, comme l'exemple
    const ends = [-ext, c.len + ext]
    seg(AXE, pt(ends[0]), pt(ends[1]))
    for (const [t, dir] of [[ends[0], 1], [ends[1], -1]]) {
      const [a, b, apex] = [out(pt(t, 1)), out(pt(t + dir * 10, 1)), out(pt(t + dir * 5, 4))]
      ents.push('0', 'SOLID', '8', HACH, '62', '18', '10', `${a.x}`, '20', `${a.y}`, '30', '0', '11', `${b.x}`, '21', `${b.y}`, '31', '0',
        '12', `${apex.x}`, '22', `${apex.y}`, '32', '0', '13', `${apex.x}`, '23', `${apex.y}`, '33', '0')
      // Boîte du texte (≈ 0,94 h × h, mesurée sur l'exemple) collée à la ligne et à 1 de son bout, repère DXF.
      const E = out(pt(t))
      const [D, N] = [unit(E, out(pt(t - dir))), unit(E, out(pt(t, 1)))]
      const [tw, th] = [0.47 * CUT_H, 0.5 * CUT_H]
      const along = Math.abs(D.x) * tw + Math.abs(D.y) * th
      const across = Math.abs(N.x) * tw + Math.abs(N.y) * th
      const l = at(at(E, D, 1 + along), N, across)
      ents.push('0', 'TEXT', '8', NUM, '7', CUT_STYLE, '10', `${l.x}`, '20', `${l.y}`, '30', '0', '40', `${CUT_H}`, '1', c.name,
        '72', '1', '73', '2', '11', `${l.x}`, '21', `${l.y}`, '31', '0')
    }
  }

  // Numéros 01, 02… comme l'exemple du bureau : côté jour, le texte longe la foulée (à 0,4 h)
  // et commence à 1 h de la contremarche de départ. S'il touche un trait (marches balancées), recherche
  // au plus près, sans toucher aucun trait. « 05 » en Tahoma ≈ 1,75 h de large.
  const [tw, th] = [0.875 * h, 0.5 * h] // demi-largeur / demi-hauteur du texte
  const [hw, hh] = [tw + 0.2 * h, th + 0.2 * h] // marge comprise
  const free = (c: Pt) => drawn.every(([a, b]) => !hitsBox(a, b, c.x - hw, c.x + hw, c.y - hh, c.y + hh))
  if (!brut) r.risers.slice(0, -1).forEach((x, i) => {
    const [p, q, jour] = [scr(x.foulee), scr(r.risers[i + 1].foulee), scr(x.inner)]
    const d = unit(p, q)
    const side = Math.sign(-d.y * (jour.x - p.x) + d.x * (jour.y - p.y)) || 1
    const giron = Math.hypot(q.x - p.x, q.y - p.y)
    const tries: { a: number; s: number }[] = []
    for (let a = 0.3 * h; a < giron; a += 0.2 * h) for (let s = 0.5 * h; s < 6 * h; s += 0.2 * h) tries.push({ a, s })
    tries.sort((u, v) => u.a + u.s - (v.a + v.s))
    // Place préférée, dans le repère DXF (le texte reste horizontal quelle que soit l'orientation de la vue).
    const P = out(p)
    const [D, N] = [unit(P, out(at(p, d, 1))), unit(P, out(at(p, d, 0, side)))]
    const ea = Math.abs(D.x) * tw + Math.abs(D.y) * th
    const es = Math.abs(N.x) * tw + Math.abs(N.y) * th
    const pref = at(at(P, D, h + ea), N, 0.4 * h + es)
    const best = [pref, ...tries.map(({ a, s }) => out(at(p, d, a, side * s)))].find(free)
    // ponytail: recherche en grille (quelques milliers d'essais par marche), suffisant pour ~20 marches.
    const c = best ?? out(at(p, d, 1.6 * h, side * 1.4 * h))
    ents.push('0', 'TEXT', '8', NUM, '10', `${c.x}`, '20', `${c.y}`, '30', '0', '40', `${h}`, '1', String(i + 1).padStart(2, '0'),
      '7', NUM_STYLE, '51', '20', '72', '1', '73', '2', '11', `${c.x}`, '21', `${c.y}`, '31', '0')
  })

  // Une vraie cote AutoCAD (linéaire, étirable) entre les angles v1 et v2 du contour : entité DIMENSION + bloc anonyme
  // qui la dessine comme l'exemple (lignes d'attache de longueur fixe, traits obliques, texte centré au-dessus).
  // `pos(v, d)` : projection de v sur la ligne de cote, décalée de d vers l'extérieur. `t` : sens de lecture, `up` : côté du texte.
  const dim = (v1: Pt, v2: Pt, pos: (v: Pt, d?: number) => Pt, t: Pt, up: Pt, look = BA) => {
    const name = `*D${blocks.length + 1}`
    const xy = (p: Pt) => ['10', `${p.x}`, '20', `${p.y}`, '30', '0']
    const lin = (p: Pt, q: Pt) => ['0', 'LINE', '8', COTA, ...xy(p), '11', `${q.x}`, '21', `${q.y}`, '31', '0']
    const pt = (p: Pt) => ['0', 'POINT', '8', 'DEFPOINTS', ...xy(p)]
    const [d1, d2] = [pos(v1), pos(v2)]
    const len = Math.hypot(d2.x - d1.x, d2.y - d1.y)
    const mid = at({ x: (d1.x + d2.x) / 2, y: (d1.y + d2.y) / 2 }, up, look.gap)
    const rot = Math.round((Math.atan2(t.y, t.x) * 180) / Math.PI * 1e6) / 1e6
    const k = look.tick
    const tick = (c: Pt) => lin(at(at(c, t, -k), up, -k), at(at(c, t, k), up, k)) // trait oblique à 45°
    blocks.push(['0', 'BLOCK', '8', '0', '2', name, '70', '1', '10', '0', '20', '0', '30', '0', '3', name,
      ...lin(d1, d2), ...lin(pos(v1, -look.ext[0]), pos(v1, look.ext[1])), ...lin(pos(v2, -look.ext[0]), pos(v2, look.ext[1])), ...tick(d1), ...tick(d2),
      // ponytail: texte toujours centré, il peut déborder d'une cote très courte (< 2 caractères de large).
      '0', 'TEXT', '8', COTA, '7', look.font, ...xy(mid), '40', `${look.h}`, '1', String(Math.round(len * 10) / 10),
      '50', `${rot}`, '72', '1', '73', '2', '11', `${mid.x}`, '21', `${mid.y}`, '31', '0',
      ...pt(v1), ...pt(v2), ...pt(d2), '0', 'ENDBLK', '8', '0'].join('\r\n'))
    ents.push('0', 'DIMENSION', '8', COTA, '2', name, '3', look.style, ...xy(d2), '11', `${mid.x}`, '21', `${mid.y}`, '31', '0',
      '70', '0', '1', '', '13', `${v1.x}`, '23', `${v1.y}`, '33', '0', '14', `${v2.x}`, '24', `${v2.y}`, '34', '0', '50', `${rot}`,
      // Surcharge DIMSCALE = 20 : le style ABAK_BA du gabarit (annotatif, DIMSCALE 1) l'emporte à l'insertion et
      // dessinerait sinon les cotes à l'échelle 1, minuscules.
      '1001', 'ACAD', '1000', 'DSTYLE', '1002', '{', '1070', '40', '1040', '20', '1002', '}')
  }

  // Cotes globales du contour béton (vue finie seulement, pour le maçon), droites, à l'extérieur des 4 côtés du contour : sur chaque côté, les angles
  // du contour visibles depuis l'extérieur donnent une chaîne (ex. 90 / 10 / 90), puis la cote totale au-delà.
  if (!brut) {
    const turn = (a: Pt, v: Pt, b: Pt) => {
      const [u, w] = [unit(a, v), unit(v, b)]
      return Math.abs(u.x * w.y - u.y * w.x)
    }
    // Contour béton fermé (limons tracés, de la 1re à la dernière CM brute), sans points doubles ni alignés.
    const ring = [...outer, ...[...inner].reverse()].map((p) => out(scr(p)))
      .filter((v, i, all) => Math.hypot(v.x - all[(i + all.length - 1) % all.length].x, v.y - all[(i + all.length - 1) % all.length].y) > 1e-6)
      .filter((v, i, all) => turn(all[(i + all.length - 1) % all.length], v, all[(i + 1) % all.length]) > 1e-9)
    const corners = ring.filter((v, i) => turn(ring[(i + ring.length - 1) % ring.length], v, ring[(i + 1) % ring.length]) > Math.sin(Math.PI / 9)) // > 20° : pas les points d'un arc
    const segsRing = ring.map((p, i): [Pt, Pt] => [p, ring[(i + 1) % ring.length]])
    const dot = (p: Pt, d: Pt) => p.x * d.x + p.y * d.y
    for (const nrm of [{ x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 }]) {
      const t = { x: Math.abs(nrm.y), y: Math.abs(nrm.x) } // sens de lecture de la cote (gauche → droite, bas → haut)
      const up = { x: -t.y, y: t.x } // côté du texte
      const edge = Math.max(...ring.map((p) => dot(p, nrm)))
      // Angle visible : la demi-droite vers l'extérieur ne rencontre aucun autre côté du contour.
      const seen = (v: Pt) => segsRing.every(([a, b]) => {
        if (Math.hypot(a.x - v.x, a.y - v.y) < 1e-6 || Math.hypot(b.x - v.x, b.y - v.y) < 1e-6) return true
        const [sa, sb, s] = [dot(a, t), dot(b, t), dot(v, t)]
        if (s < Math.min(sa, sb) - 1e-6 || s > Math.max(sa, sb) + 1e-6) return true
        const depth = Math.abs(sb - sa) < 1e-6 ? Math.max(dot(a, nrm), dot(b, nrm)) : dot(a, nrm) + ((s - sa) / (sb - sa)) * (dot(b, nrm) - dot(a, nrm))
        return depth <= dot(v, nrm) + 1e-6
      })
      // L'angle doit border un côté du contour tourné vers l'extérieur.
      const faces = (v: Pt) => segsRing.some(([a, b]) => (a === v || b === v)
        && Math.abs(dot(unit(a, b), nrm)) < 0.01
        && seen({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }))
      const vs = corners.filter((v) => seen(v) && faces(v)).sort((a, b) => dot(a, t) - dot(b, t))
        .filter((v, i, all) => i === 0 || dot(v, t) - dot(all[i - 1], t) > 0.05)
      const rows = vs.length > 2 ? [vs, [vs[0], vs[vs.length - 1]]] : [vs]
      rows.forEach((row, k) => {
        const o = edge + DIM_ROW * (k + 1)
        const pos = (v: Pt, d = 0): Pt => ({ x: t.x * dot(v, t) + nrm.x * (o + d), y: t.y * dot(v, t) + nrm.y * (o + d) })
        row.slice(1).forEach((v2, i) => dim(row[i], v2, pos, t, up))
      })
    }

    // Cotes de giron (intérieur et extérieur), comme l'exemple : sur chaque partie droite d'un limon, chaîne des
    // points où les contremarches brutes le rencontrent, de bout en bout, ligne de cote dans l'escalier.
    for (const [limon, end] of [[outer, 'brutOuter'], [inner, 'brutInner']] as const) {
      const L = limon.map((p) => out(scr(p)))
      const hits = r.risers.map((x) => ({ p: out(scr(x[end])), m: out(scr({ x: (x.brutInner.x + x.brutOuter.x) / 2, y: (x.brutInner.y + x.brutOuter.y) / 2 })) }))
      // Parties droites : segments consécutifs alignés fusionnés.
      const runs: [Pt, Pt][] = []
      L.slice(1).forEach((b, i) => {
        const a = L[i]
        if (Math.hypot(b.x - a.x, b.y - a.y) < 1e-6) return
        const last = runs[runs.length - 1]
        if (last && Math.abs(turn(last[0], last[1], b)) < 1e-9) last[1] = b
        else runs.push([a, b])
      })
      for (const [A, B] of runs) {
        const len = Math.hypot(B.x - A.x, B.y - A.y)
        // ponytail: les parties de moins de 15 (arcs du jour échantillonnés, bout de jour) ne sont pas cotées, comme l'exemple.
        if (len < 15) continue
        let t = unit(A, B)
        if (t.x < -1e-9 || (Math.abs(t.x) < 1e-9 && t.y < 0)) t = { x: -t.x, y: -t.y } // lecture gauche → droite, bas → haut
        const up = { x: -t.y, y: t.x }
        const on = hits.filter(({ p }) => Math.abs(dot({ x: p.x - A.x, y: p.y - A.y }, up)) < 0.01)
          .map((h) => ({ ...h, s: dot({ x: h.p.x - A.x, y: h.p.y - A.y }, unit(A, B)) }))
          .filter(({ s }) => s > 0.05 && s < len - 0.05)
        if (!on.length) continue
        // Côté escalier : celui du milieu de la contremarche.
        const m = on[0].m
        const into = dot({ x: m.x - A.x, y: m.y - A.y }, up) > 0 ? up : { x: -up.x, y: -up.y }
        const pos = (v: Pt, d = 0): Pt => at(v, into, GIR_OFF + d)
        const row = [A, ...on.map(({ p }) => p), B].sort((a, b) => dot(a, t) - dot(b, t))
        row.slice(1).forEach((v2, i) => dim(row[i], v2, pos, t, up, RESA))
      }
    }
  }

  return ents
}

const text = (x: number, y: number, h: number, s: string) =>
  ['0', 'TEXT', '8', NUM, '10', `${x}`, '20', `${y}`, '30', '0', '40', `${h}`, '1', s, '72', '1', '11', `${x}`, '21', `${y}`, '31', '0']

// Coupes A, B… alignées sur une ligne sous les plans, z vers le haut depuis le NF départ.
// Vue vers le jour : en sens « droite », la montée va de droite à gauche.
const sections = (r: StairResult, x0: number, yTop: number, gap: number, h: number): string[] => {
  const ents: string[] = []
  const mirror = r.input.sens === 'droite'
  let x = x0
  for (const c of cutLines(r)) {
    const { fini, brut, sousFace, ends, closes, marches } = cutProfile(r, c)
    const x0c = Math.min(...brut.map((p) => p.x))
    const w = Math.max(...fini.map((p) => p.x), ...brut.map((p) => p.x)) - x0c
    const top = Math.max(...brut.map((p) => p.y), ...fini.map((p) => p.y))
    const out = (p: Pt): Pt => ({ x: x + (mirror ? w - (p.x - x0c) : p.x - x0c), y: yTop - top + p.y })
    const drawn: [Pt, Pt][] = [] // traits de la coupe (repère DXF), que les numéros ne doivent pas toucher
    const segs = (layer: string, pts: Pt[]) =>
      pts.slice(1).forEach((p, i) => {
        const [a, b] = [out(pts[i]), out(p)]
        drawn.push([a, b])
        if (Math.hypot(b.x - a.x, b.y - a.y) > 1e-6)
          ents.push('0', 'LINE', '8', layer, '10', `${a.x}`, '20', `${a.y}`, '30', '0', '11', `${b.x}`, '21', `${b.y}`, '31', '0')
      })
    segs(CACHE, fini)
    segs(COUPE, brut)
    segs(COUPE, sousFace)
    ends.forEach((e) => segs(AXE, e))
    closes.forEach((e) => segs(COUPE, e))
    // Numéros au-dessus de chaque marche, côté nez, comme le plan (italique ABAK_ANNO_RESA).
    // S'il touche un trait (marche entamée courte), recherche au plus près au-dessus de la marche, vers l'extérieur.
    const [hw, hh] = [1.075 * NUM_H, 0.7 * NUM_H] // demi-largeur / demi-hauteur du texte, marge comprise
    const free = (c: Pt) => drawn.every(([a, b]) => !hitsBox(a, b, c.x - hw, c.x + hw, c.y - hh, c.y + hh))
    const tries: Pt[] = []
    for (let dx = -6 * NUM_H; dx <= 6 * NUM_H; dx += 0.2 * NUM_H)
      for (let dy = 0; dy <= 4 * NUM_H; dy += 0.2 * NUM_H) tries.push({ x: dx, y: dy })
    // Vers l'extérieur de l'escalier d'abord (côté départ de la coupe, dehors au bord), l'intérieur en dernier recours.
    const cost = (d: Pt) => Math.hypot(d.x, d.y) + (d.x > 0 ? 100 * NUM_H : 0)
    tries.sort((u, v) => cost(u) - cost(v))
    for (const { num, p } of marches) {
      const pref = { x: p.x + 1.3 * NUM_H, y: p.y + 0.9 * NUM_H }
      // ponytail: recherche en grille (~1000 essais par marche), suffisant pour ~20 marches.
      const m = tries.map((d) => out({ x: pref.x + d.x, y: pref.y + d.y })).find(free) ?? out(pref)
      const box: Pt[] = [{ x: m.x - hw, y: m.y - hh }, { x: m.x + hw, y: m.y - hh }, { x: m.x + hw, y: m.y + hh }, { x: m.x - hw, y: m.y + hh }]
      box.forEach((b, i) => drawn.push([b, box[(i + 1) % 4]])) // les numéros suivants l'évitent aussi
      ents.push('0', 'TEXT', '8', NUM, '10', `${m.x}`, '20', `${m.y}`, '30', '0', '40', `${NUM_H}`, '1', String(num).padStart(2, '0'),
        '7', NUM_STYLE, '51', '20', '72', '1', '73', '2', '11', `${m.x}`, '21', `${m.y}`, '31', '0')
    }
    const bottom = Math.min(...brut.map((p) => p.y), ...sousFace.map((p) => p.y))
    const t = out({ x: x0c + w / 2, y: bottom })
    ents.push(...text(t.x, t.y - 2.5 * h, 1.5 * h, `COUPE ${c.name}-${c.name}`))
    x += w + gap
  }
  return ents
}

// La vue tournée selon l'orientation choisie en configuration, à droite la même en brut, dessous les coupes.
export const planDxf = (r: StairResult): string => {
  const rotation = r.input.orientation ?? 0
  const pts = [...r.outerLine, ...r.innerLine]
  const diag = Math.hypot(
    Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x)),
    Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y)),
  )
  const blocks: string[] = []
  const ents = [...view(r, rotation, blocks, 0), ...view(r, rotation, blocks, diag * 1.3, 0, true)]
  ents.push(...sections(r, -diag / 2, -diag * 0.75, diag * 0.3, diag / 50))
  // Tables : styles de texte (numéros, lettres de coupe, cotes) et style de cote. Les calques restent ceux du gabarit
  // à l'insertion (BDR-006) ; un style déjà présent dans le dessin cible garde sa définition.
  const def = (name: string, h: number, oblique: number, font: string) =>
    ['0', 'STYLE', '2', name, '70', '0', '40', '0', '41', '1', '50', `${oblique}`, '71', '0', '42', `${h}`, '3', font, '4', '']
  const style = ['0', 'TABLE', '2', 'STYLE', '70', '4', ...def(NUM_STYLE, NUM_H, 20, 'tahoma.ttf'),
    ...def(CUT_STYLE, CUT_H, 0, 'arialbi.ttf'), ...def(DIM_STYLE, DIM_H, 0, 'tahoma.ttf'), ...def(GIR_TXT, GIR_H, 20, 'tahoma.ttf'), '0', 'ENDTAB']
  // Style de cote ABAK_BA de l'exemple, en R12 (non annotatif) : échelle 20, traits obliques (DIMTSZ), texte au-dessus,
  // arrondi au mm (DIMRND) sans zéros inutiles (DIMZIN 8).
  const dimVars: [string, string][] = [['3', ''], ['4', ''], ['5', ''], ['6', ''], ['7', ''], ['40', '20'], ['41', '0.13'],
    ['42', '0.2'], ['43', '0'], ['44', '0.15'], ['45', '0.1'], ['46', '0'], ['47', '0'], ['48', '0'], ['140', '0.25'], ['141', '0'],
    ['142', '0.13'], ['143', '25.4'], ['144', '1'], ['145', '0'], ['146', '1'], ['147', '0.1'], ['71', '0'], ['72', '0'], ['73', '0'],
    ['74', '0'], ['75', '0'], ['76', '0'], ['77', '1'], ['78', '8'], ['170', '0'], ['171', '2'], ['172', '1'], ['173', '0'],
    ['174', '1'], ['175', '0'], ['176', '0'], ['177', '0'], ['178', '0']]
  // Cotes de giron (ABAK_BA-RESA) : texte 0,2 et trait oblique 0,1 au lieu de 0,25 et 0,13.
  const resaVars = dimVars.map(([c, v]): [string, string] => [c, c === '140' ? '0.2' : c === '41' || c === '142' ? '0.1' : v])
  const dimstyle = ['0', 'TABLE', '2', 'DIMSTYLE', '70', '2', '0', 'DIMSTYLE', '2', DIM_STYLE, '70', '0', ...dimVars.flat(),
    '0', 'DIMSTYLE', '2', GIR_STYLE, '70', '0', ...resaVars.flat(), '0', 'ENDTAB']
  const appid = ['0', 'TABLE', '2', 'APPID', '70', '1', '0', 'APPID', '2', 'ACAD', '70', '0', '0', 'ENDTAB'] // pour la surcharge des cotes
  return ['0', 'SECTION', '2', 'TABLES', ...style, ...appid, ...dimstyle, '0', 'ENDSEC',
    '0', 'SECTION', '2', 'BLOCKS', ...blocks, '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES', ...ents, '0', 'ENDSEC', '0', 'EOF', '']
    .join('\r\n')
}

export const downloadDxf = (r: StairResult) => {
  const url = URL.createObjectURL(new Blob([planDxf(r)], { type: 'application/dxf' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: 'escalier-plan.dxf' })
  a.click()
  URL.revokeObjectURL(url)
}
