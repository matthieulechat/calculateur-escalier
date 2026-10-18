// Moteur de calcul d'escalier béton. Toutes les valeurs (longueurs, épaisseurs, niveaux) en cm.

export type StairType = 'droit' | 'quart' | 'demi'
export type Sens = 'gauche' | 'droite'
export type Level = 'ok' | 'bad'

export interface StairInput {
  type: StairType
  sens: Sens
  orientation?: number // degrés sens trigo : rotation du plan dans l'export DXF (0, 90, 180, 270)
  largeur: number // emmarchement de la volée de départ (seule volée si droit)
  largeur2: number // emmarchement de la volée d'arrivée
  jour: number // quart : rayon du jour arrondi ; demi : largeur du jour
  jourArrondi: boolean // false = jour droit (angles vifs)
  volee1: number // de la 1re contremarche au mur du fond (longueur de foulée si droit)
  volee2: number // du nez du palier d'arrivée au mur du fond
  nfBas: number // niveau fini départ
  nfHaut: number // niveau fini arrivée
  finSolBas: number // épaisseur de finition du sol au départ
  finSolHaut: number // épaisseur de finition du palier d'arrivée
  finMarche: number // épaisseur de finition sur le dessus des marches
  finContremarche: number // épaisseur de finition sur les contremarches
  paillasse: number // épaisseur de la paillasse béton (perpendiculaire)
  dalleHaut: number // épaisseur de la dalle du palier d'arrivée
  dalleBas: number // épaisseur du plancher de départ
  nbContremarches: number // 0 = automatique
  nbBalancees: number // marches balancées de chaque côté de la ligne de séparation
}

export interface Pt {
  x: number
  y: number
}

export interface Riser {
  j: number // index du nez (0 = départ, n-1 = arrivée)
  s: number // abscisse sur la ligne de foulée
  u: number // abscisse au collet (jour)
  inner: Pt // contremarche finie
  foulee: Pt
  outer: Pt
  brutInner: Pt // contremarche brute (décalée de la finition de contremarche)
  brutOuter: Pt
  outerLen: number // abscisse le long du mur extérieur
  balanced: boolean
}

export interface Row {
  cm: number // n° de contremarche (1..n)
  hFini: number
  hBrut: number
  nf: number // niveau fini du dessus (marche ou palier)
  nb: number // niveau brut du dessus
  giron?: number
  collet?: number
  gironExt?: number
}

export interface HersePoint {
  j: number // index du nez
  x: number // abscisse sur AC (foulée)
  collet: number // collet cumulé lu sur AD
}

export interface HerseData {
  cote: 'départ' | 'arrivée'
  a: number // AC : foulée à balancer
  c: number // AB : collet à balancer
  points: HersePoint[]
}

export interface Check {
  label: string
  value: string
  range: string
  level: Level
}

export interface StairResult {
  input: StairInput
  n: number
  h: number
  g: number
  f: number // distance de la ligne de foulée au collet, volée de départ
  f2: number // idem, volée d'arrivée
  lf: number // longueur développée de la ligne de foulée
  theta: number
  nbBas: number
  nbHaut: number
  risers: Riser[]
  innerLine: Pt[]
  outerLine: Pt[]
  fouleeLine: Pt[]
  separation?: [Pt, Pt]
  herses: HerseData[]
  rows: Row[]
  checks: Check[]
  warnings: string[]
  encombrement: { x: number; y: number }
}

const EPS = 1e-6

// Méthode de la herse : AB = collet à balancer (c), AC = foulée à balancer (a).
// D sur BC tel que AD = AB ; le collet cumulé du giron x est l'intersection de (B, x) avec (AD).
export const herse = (a: number, c: number, x: number): number => {
  const t = (2 * c * c) / (a * a + c * c)
  const ux = (a * t) / c
  const uy = 1 - t
  return (c * x) / (x * uy + c * ux)
}

const cross = (a: Pt, b: Pt): number => a.x * b.y - a.y * b.x

// Prolonge la droite (p, q) au-delà de p + tMin·(q - p) jusqu'au contour `line`.
const hitPolyline = (p: Pt, q: Pt, line: Pt[], tMin = 1): { pt: Pt; len: number; t: number } => {
  const d = { x: q.x - p.x, y: q.y - p.y }
  let best = { t: Infinity, pt: q, len: 0 }
  let acc = 0
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]
    const e = { x: line[i + 1].x - a.x, y: line[i + 1].y - a.y }
    const den = cross(d, e)
    if (Math.abs(den) > EPS) {
      const ap = { x: a.x - p.x, y: a.y - p.y }
      const t = cross(ap, e) / den
      const s = cross(ap, d) / den
      if (t > tMin - EPS && s > -EPS && s < 1 + EPS && t < best.t) {
        best = { t, pt: { x: p.x + t * d.x, y: p.y + t * d.y }, len: acc + s * Math.hypot(e.x, e.y) }
      }
    }
    acc += Math.hypot(e.x, e.y)
  }
  return best
}

// Règles du bureau : h ≤ 18, g ≥ 24, 60 < 2h + g < 64.
export const RULES = { hMax: 18, gMin: 24, blondelMin: 60, blondelMax: 64 }

const autoN = (H: number, lf: number): number => {
  let bestN = 3
  let bestScore = Infinity
  for (let n = 3; n <= 80; n++) {
    const h = H / n
    const g = lf / (n - 1)
    const b = 2 * h + g
    const ko = (h > RULES.hMax ? 1 : 0) + (g < RULES.gMin ? 1 : 0) + (b <= RULES.blondelMin || b >= RULES.blondelMax ? 1 : 0)
    const score = ko * 100 + Math.abs(b - (RULES.blondelMin + RULES.blondelMax) / 2)
    if (score < bestScore) {
      bestScore = score
      bestN = n
    }
  }
  return bestN
}

type Seg = { kind: 'line'; L: number } | { kind: 'arc'; a: number; r: number }

// Distance au jour d'une ligne parallèle : [début, fin], variable dans le tournant si les emmarchements diffèrent.
type Off = [number, number]

// Longueur à distance d du jour ; dans un arc, d varie linéairement avec l'angle de dA à dB.
const segLen = (sg: Seg, [dA, dB]: Off): number => (sg.kind === 'line' ? sg.L : sg.a * (sg.r + (dA + dB) / 2))

// Distance au jour au début et à la fin de chaque segment : d1 sur la volée de départ, d2 sur l'arrivée,
// interpolée selon l'angle tourné.
const offsets = (segs: Seg[], [d1, d2]: Off): Off[] => {
  const theta = segs.reduce((acc, sg) => acc + (sg.kind === 'arc' ? sg.a : 0), 0)
  const dAt = (phi: number) => (theta > 0 ? d1 + ((d2 - d1) * phi) / theta : d1)
  let phi = 0
  return segs.map((sg) => {
    const a = dAt(phi)
    if (sg.kind === 'arc') phi += sg.a
    return [a, dAt(phi)]
  })
}

// Foulée : milieu de l'emmarchement, à 50 cm du collet au-delà de 1 m.
const fouleeOf = (W: number): number => (W <= 100 ? W / 2 : 50)

// Tracé du jour : volée, tournant (angles vifs ou arrondi), volée.
const buildSegs = (input: StairInput, L1: number, L2: number): Seg[] => {
  const { type, jour, jourArrondi } = input
  if (type === 'droit') return [{ kind: 'line', L: L1 }]
  const turn: Seg[] =
    type === 'quart'
      ? [{ kind: 'arc', a: Math.PI / 2, r: jourArrondi ? jour : 0 }]
      : jourArrondi
        ? [{ kind: 'arc', a: Math.PI, r: jour / 2 }]
        : [{ kind: 'arc', a: Math.PI / 2, r: 0 }, { kind: 'line', L: jour }, { kind: 'arc', a: Math.PI / 2, r: 0 }]
  return [{ kind: 'line', L: L1 }, ...turn, { kind: 'line', L: L2 }]
}

export const computeStair = (input: StairInput): StairResult | { error: string } => {
  const { type } = input
  const W1 = input.largeur
  const W2 = type === 'droit' ? W1 : input.largeur2
  // Volées cotées jusqu'au mur du fond : on retire la profondeur de la zone tournante et le rayon du jour
  // arrondi pour obtenir la partie droite au jour. Quart : le mur du fond d'une volée borde l'autre volée.
  // Demi : mur du fond commun, à la distance du plus large des deux emmarchements.
  const rj = input.jourArrondi ? (type === 'demi' ? input.jour / 2 : input.jour) : 0
  const back1 = type === 'quart' ? W2 : Math.max(W1, W2)
  const back2 = type === 'quart' ? W1 : Math.max(W1, W2)
  const L1 = type === 'droit' ? input.volee1 : input.volee1 - back1 - rj
  const L2 = type === 'droit' ? 0 : input.volee2 - back2 - rj
  const segs = buildSegs(input, L1, L2)
  const theta = segs.reduce((acc, sg) => acc + (sg.kind === 'arc' ? sg.a : 0), 0)
  const f = fouleeOf(W1)
  const f2 = fouleeOf(W2)
  const F: Off = [f, f2]
  const Z: Off = [0, 0]
  const offF = offsets(segs, F)
  const H = input.nfHaut - input.nfBas
  const turnF = segs.slice(1, -1).reduce((acc, sg, i) => acc + segLen(sg, offF[i + 1]), 0)
  const turnU = segs.slice(1, -1).reduce((acc, sg) => acc + segLen(sg, Z), 0)
  const lf = L1 + turnF + L2

  if (W1 <= 0 || W2 <= 0 || input.jour < 0) return { error: 'Dimensions invalides.' }
  if (L1 < 0 || L2 < 0) return { error: 'Volée plus courte que l’emmarchement + le jour : vérifier les longueurs jusqu’au mur du fond.' }
  if (H <= 0) return { error: 'Le niveau fini haut doit être au-dessus du niveau fini bas.' }
  if (lf <= 0) return { error: 'Longueur de foulée nulle.' }

  const n = input.nbContremarches >= 3 ? Math.round(input.nbContremarches) : autoN(H, lf)
  const h = H / n
  const g = lf / (n - 1)
  const warnings: string[] = []

  // Point de la ligne à la distance D du jour, à l'abscisse `along` mesurée sur cette ligne (le tournant est à gauche).
  const at = (D: Off, along: number): Pt => {
    const offs = offsets(segs, D)
    let x = 0
    let y = 0
    let hd = 0
    let d = offs[0][0]
    let rem = along
    const off = () => ({ x: x + d * Math.sin(hd), y: y - d * Math.cos(hd) })
    for (let i = 0; i < segs.length; i++) {
      const sg = segs[i]
      const [dA, dB] = offs[i]
      const len = segLen(sg, offs[i])
      const last = i === segs.length - 1
      const inside = last || rem <= len
      const step = inside ? rem : len
      if (sg.kind === 'line') {
        x += step * Math.cos(hd)
        y += step * Math.sin(hd)
      } else {
        // Longueur parcourue à l'angle phi : (r + dA)·phi + k·phi², d variant de dA à dB sur l'arc.
        // Angle vif (longueur nulle) : on ne tourne qu'une fois le coin franchi.
        const b = sg.r + dA
        const k = (dB - dA) / (2 * sg.a)
        const phi =
          len > 0
            ? Math.abs(k) < EPS
              ? step / b
              : Math.min(sg.a, (-b + Math.sqrt(Math.max(0, b * b + 4 * k * step))) / (2 * k))
            : inside && rem <= 0
              ? 0
              : sg.a
        const cx = x - sg.r * Math.sin(hd)
        const cy = y + sg.r * Math.cos(hd)
        hd += phi
        d = dA + ((dB - dA) * phi) / sg.a
        x = cx + sg.r * Math.sin(hd)
        y = cy - sg.r * Math.cos(hd)
      }
      if (inside) return off()
      rem -= len
    }
    return off()
  }

  const sample = (D: Off): Pt[] => {
    const offs = offsets(segs, D)
    const pts: Pt[] = []
    let acc = 0
    segs.forEach((sg, i) => {
      const len = segLen(sg, offs[i])
      const k = sg.kind === 'arc' && len > 0 ? 24 : 1
      for (let j = 0; j < k; j++) pts.push(at(D, acc + (len * j) / k))
      acc += len
    })
    pts.push(at(D, acc))
    return pts
  }

  const innerLine = sample(Z)
  const E = at(Z, L1 + turnU) // départ de la volée d'arrivée, côté jour
  const xBack = Math.max(...innerLine.map((pt) => pt.x)) + back1
  const outerLine: Pt[] =
    type === 'droit'
      ? [{ x: 0, y: -W1 }, { x: L1, y: -W1 }]
      : type === 'quart'
        ? [{ x: 0, y: -W1 }, { x: E.x + W2, y: -W1 }, { x: E.x + W2, y: E.y + L2 }]
        : [{ x: 0, y: -W1 }, { x: xBack, y: -W1 }, { x: xBack, y: E.y + W2 }, { x: E.x - L2, y: E.y + W2 }]

  // Abscisses des nez sur la foulée, et au collet par défaut (marches rayonnantes).
  const sTurn1 = L1 + turnF
  const herses: HerseData[] = []
  const s = Array.from({ length: n }, (_, j) => j * g)
  const u = s.map((sj) => (sj <= L1 + EPS ? sj : sj >= sTurn1 - EPS ? sj - (turnF - turnU) : NaN))
  const balanced = s.map(() => false)

  if (theta > 0) {
    const k = Math.max(1, Math.round(input.nbBalancees))
    const sSep = L1 + turnF / 2
    const uSep = L1 + turnU / 2
    const jLast = s.reduce((acc, sj, j) => (sj <= sSep + EPS ? j : acc), 0)

    // Première moitié : balancée sur la volée de départ.
    let i0 = jLast - k
    if (i0 < 0) {
      i0 = 0
      warnings.push('Volée de départ trop courte : balancement limité à la première marche.')
    }
    while (i0 > 0 && s[i0] > L1 + EPS) i0--
    if (s[i0] > L1 + EPS) return { error: 'Volée de départ trop courte pour balancer le tournant.' }
    if (i0 < jLast - k) warnings.push(`Côté départ : ${jLast - i0} marches balancées (minimum pour sortir du tournant).`)
    const h1: HerseData = { cote: 'départ', a: sSep - s[i0], c: uSep - u[i0], points: [] }
    for (let j = i0 + 1; j <= jLast; j++) {
      const x = s[j] - s[i0]
      const collet = herse(h1.a, h1.c, x)
      u[j] = u[i0] + collet
      balanced[j] = true
      h1.points.push({ j, x, collet })
    }
    herses.push(h1)

    // Seconde moitié : balancée sur la volée d'arrivée.
    // Un nez posé sur la séparation compte pour les deux moitiés : on garde la symétrie.
    const jFirst = jLast + 1
    const kEnd = Math.abs(s[jLast] - sSep) < 1e-3 ? k - 1 : k
    let iEnd = jFirst + kEnd
    if (iEnd > n - 1) {
      iEnd = n - 1
      warnings.push('Volée d’arrivée trop courte : balancement limité à la dernière marche.')
    }
    while (iEnd < n - 1 && s[iEnd] < sTurn1 - EPS) iEnd++
    if (s[iEnd] < sTurn1 - EPS) return { error: 'Volée d’arrivée trop courte pour balancer le tournant.' }
    if (iEnd > jFirst + kEnd) warnings.push(`Côté arrivée : ${iEnd - jFirst} marches balancées (minimum pour sortir du tournant).`)
    const h2: HerseData = { cote: 'arrivée', a: s[iEnd] - sSep, c: u[iEnd] - uSep, points: [] }
    for (let j = iEnd - 1; j >= jFirst; j--) {
      const x = s[iEnd] - s[j]
      const collet = herse(h2.a, h2.c, x)
      u[j] = u[iEnd] - collet
      balanced[j] = true
      h2.points.push({ j, x, collet })
    }
    herses.push(h2)
  }

  const risers: Riser[] = s.map((sj, j) => {
    const inner = at(Z, u[j])
    const foulee = at(F, sj)
    const hit = hitPolyline(inner, foulee, outerLine)
    // Face brute : parallèle à la face finie, reculée de la finition dans le sens de la montée.
    const d = { x: hit.pt.x - inner.x, y: hit.pt.y - inner.y }
    const len = Math.hypot(d.x, d.y)
    const t0 = at(F, sj - 0.5)
    const t1 = at(F, sj + 0.5)
    let nx = -d.y / len
    let ny = d.x / len
    if (nx * (t1.x - t0.x) + ny * (t1.y - t0.y) < 0) [nx, ny] = [-nx, -ny]
    const e = input.finContremarche
    const shift = (p: Pt): Pt => ({ x: p.x + e * nx, y: p.y + e * ny })
    const fb = shift(foulee)
    const bo = hitPolyline(fb, { x: fb.x + d.x, y: fb.y + d.y }, outerLine, 0)
    const bi = hitPolyline(fb, { x: fb.x - d.x, y: fb.y - d.y }, innerLine, 0)
    return {
      j,
      s: sj,
      u: u[j],
      inner,
      foulee,
      outer: hit.pt,
      outerLen: hit.len,
      brutInner: bi.t < Infinity ? bi.pt : shift(inner),
      brutOuter: bo.t < Infinity ? bo.pt : shift(hit.pt),
      balanced: balanced[j],
    }
  })

  let separation: [Pt, Pt] | undefined
  if (theta > 0) {
    const a = at(Z, L1 + turnU / 2)
    const b = at(F, L1 + turnF / 2)
    separation = [a, hitPolyline(a, b, outerLine).pt]
  }

  // Niveaux bruts : la finition des marches est constante, seules la 1re et la dernière contremarche brute changent.
  const { finSolBas: eBas, finSolHaut: eHaut, finMarche: eM } = input
  const nbBas = input.nfBas - eBas
  const nbHaut = input.nfHaut - eHaut
  const rows: Row[] = Array.from({ length: n }, (_, k) => {
    const cm = k + 1
    const last = cm === n
    const hBrut = cm === 1 ? h - eM + eBas : last ? h - eHaut + eM : h
    const nf = input.nfBas + cm * h
    const row: Row = { cm, hFini: h, hBrut, nf, nb: last ? nbHaut : nf - eM }
    if (!last) {
      row.giron = g
      row.collet = risers[cm].u - risers[cm - 1].u
      row.gironExt = risers[cm].outerLen - risers[cm - 1].outerLen
    }
    return row
  })

  const treads = rows.filter((r) => r.collet !== undefined)
  const blondel = 2 * h + g
  const fmt = (v: number) => v.toFixed(1).replace('.', ',')

  const checks: Check[] = [
    { label: 'Hauteur de marche', value: `${fmt(h)} cm`, range: `≤ ${RULES.hMax} cm`, level: h <= RULES.hMax + EPS ? 'ok' : 'bad' },
    { label: 'Giron (foulée)', value: `${fmt(g)} cm`, range: `≥ ${RULES.gMin} cm`, level: g >= RULES.gMin - EPS ? 'ok' : 'bad' },
    {
      label: 'Blondel 2h + g',
      value: `${fmt(blondel)} cm`,
      range: `${RULES.blondelMin} < 2h + g < ${RULES.blondelMax} cm`,
      level: blondel > RULES.blondelMin && blondel < RULES.blondelMax ? 'ok' : 'bad',
    },
  ]
  // Remarque de la méthode de la herse (calcul-escaliers.web4me.fr).
  if (treads.some((r) => (r.collet ?? 0) > g + EPS))
    warnings.push('Un collet dépasse le giron : réduire la longueur de volée balancée (moins de marches balancées).')

  const all = [...outerLine, ...risers.map((r) => r.inner), ...innerLine]
  const xs = all.map((p) => p.x)
  const ys = all.map((p) => p.y)

  return {
    input,
    n,
    h,
    g,
    f,
    f2,
    lf,
    theta,
    nbBas,
    nbHaut,
    risers,
    innerLine,
    outerLine,
    fouleeLine: sample(F),
    separation,
    herses,
    rows,
    checks,
    warnings,
    encombrement: { x: Math.max(...xs) - Math.min(...xs), y: Math.max(...ys) - Math.min(...ys) },
  }
}


// Lignes de coupe : une par mur extérieur, à `offset` cm à l'intérieur, regard vers le jour (n).
export interface CutLine {
  name: string
  a: Pt // départ, à l'aplomb du début du mur
  d: Pt // direction du mur (sens de la montée)
  n: Pt // normale vers le jour
  len: number
}

export const CUT = 20 // distance des lignes de coupe au mur extérieur (cm)
export const PLANCHER = 100 // longueur de plancher représentée au départ et à l'arrivée des coupes (cm)

export const cutLines = (r: StairResult, offset = CUT): CutLine[] =>
  r.outerLine.slice(0, -1).map((a, i) => {
    const b = r.outerLine[i + 1]
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const d = { x: (b.x - a.x) / len, y: (b.y - a.y) / len }
    const n = { x: -d.y, y: d.x } // le jour est à gauche du mur parcouru
    return { name: String.fromCharCode(65 + i), a: { x: a.x + n.x * offset, y: a.y + n.y * offset }, d, n, len }
  })

// Profils de la coupe (t le long de la ligne, z depuis le NF départ) : fini, brut, sous-face de paillasse.
// Même convention que la coupe développée et la 3D : sous-face constante le long de chaque contremarche brute.
export const cutProfile = (r: StairResult, c: CutLine): { fini: Pt[]; brut: Pt[]; sousFace: Pt[]; ends: [Pt, Pt][] } => {
  const { n, h, g, input } = r
  const { finSolBas: eBas, finSolHaut: eHaut, finMarche: eM } = input
  const H = n * h
  // Abscisse de la traversée d'une contremarche [p, q] sur la ligne de coupe (prolongée : la CM brute
  // d'arrivée d'un escalier droit dépasse le bout du mur de la finition de contremarche).
  const hit = (p: Pt, q: Pt): number | undefined => {
    const e = { x: q.x - p.x, y: q.y - p.y }
    const den = cross(c.d, e)
    if (Math.abs(den) < EPS) return undefined
    const w = { x: p.x - c.a.x, y: p.y - c.a.y }
    const t = cross(w, e) / den
    const k = cross(w, c.d) / den
    return k >= -EPS && k <= 1 + EPS ? t : undefined
  }
  const fz = (j: number) => (j < 0 ? 0 : j >= n - 1 ? H : (j + 1) * h) // dessus fini après la CM j
  const bz = (j: number) => (j < 0 ? -eBas : j >= n - 1 ? H - eHaut : (j + 1) * h - eM)
  const off = input.paillasse * Math.hypot(1, h / g)
  const sz = (j: number) => Math.min(Math.max(j * h - eM - off, -eBas), H - eHaut - input.dalleHaut)

  // Emprise de la coupe : le mur, plus PLANCHER cm de sol au départ et de palier à l'arrivée s'ils sont coupés.
  const hits = (side: (x: Riser) => [Pt, Pt]) =>
    r.risers.flatMap((x) => {
      const t = hit(...side(x))
      return t === undefined ? [] : [{ j: x.j, t }]
    })
  const all = [...hits((x) => [x.inner, x.outer]), ...hits((x) => [x.brutInner, x.brutOuter])]
  const tFirst = Math.min(0, ...all.filter((x) => x.j === 0).map((x) => x.t - PLANCHER))
  const tLast = Math.max(c.len, ...all.map((x) => (x.j === n - 1 ? x.t + PLANCHER : x.t)))

  const steps = (z: (j: number) => number, side: (x: Riser) => [Pt, Pt]): Pt[] => {
    const xs = hits(side)
    const j0 = xs.length ? xs[0].j - 1 : -1
    const pts: Pt[] = [{ x: tFirst, y: z(j0) }]
    xs.forEach(({ j, t }) => pts.push({ x: t, y: z(j - 1) }, { x: t, y: z(j) }))
    pts.push({ x: tLast, y: z(xs.length ? xs[xs.length - 1].j : j0) })
    return pts
  }
  const fini = steps(fz, (x) => [x.inner, x.outer])
  const brut = steps(bz, (x) => [x.brutInner, x.brutOuter])
  // Sous-face : sous le plancher de départ s'il est coupé, puis la paillasse, puis sous la dalle du palier.
  // ponytail: prolongée à plat avant/après les contremarches traversées (exact en volée droite).
  const sf = hits((x) => [x.brutInner, x.brutOuter]).map(({ j, t }) => ({ x: t, y: sz(j) }))
  if (!sf.length) return { fini, brut, sousFace: [], ends: [] }
  const zPlancher = -eBas - input.dalleBas
  const depart = all.some((x) => x.j === 0)
  // Au départ, la sous-face de paillasse est prolongée jusqu'au dessous du plancher : béton monolithe, sans joint.
  const k = sf.findIndex((p, i) => i + 1 < sf.length && p.y > -eBas + EPS && sf[i + 1].y > p.y + EPS)
  const pente = k < 0 ? 0 : (sf[k + 1].x - sf[k].x) / (sf[k + 1].y - sf[k].y)
  const xJonction = k < 0 ? sf[0].x : Math.max(tFirst, sf[k].x + (zPlancher - sf[k].y) * pente)
  const sousFace = [
    ...(depart ? [{ x: tFirst, y: zPlancher }, { x: xJonction, y: zPlancher }] : [{ x: tFirst, y: sf[0].y }]),
    ...(depart && k >= 0 ? sf.slice(k) : sf),
    { x: tLast, y: sf[sf.length - 1].y },
  ]
  // Traits de fin de coupe : du dessous du béton jusqu'au-dessus de la finition.
  const ends: [Pt, Pt][] = [
    [sousFace[0], fini[0]],
    [sousFace[sousFace.length - 1], fini[fini.length - 1]],
  ]
  return { fini, brut, sousFace, ends }
}
