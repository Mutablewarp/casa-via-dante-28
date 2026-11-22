/** Utilità di disegno comuni ai quadri (generatore con seme, curve, cornici). */

/**
 * Generatore pseudo-casuale mulberry32 con seme derivato da una stringa.
 * @param {string} seed stringa di seme
 * @returns {() => number} funzione che restituisce numeri in [0, 1)
 */
export function rng(seed) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Indice dei nove soggetti, usato per variare le composizioni. */
export const SUBJECTS = ['manifesto_iris', 'manifesto_glicine', 'manifesto_ninfee', 'manifesto_pavone',
  'glicine_orizzontale', 'conca_doro', 'veduta_palermo', 'natura_morta_agrumi', 'dama_liberty']

/**
 * Riempie e/o contorna il tracciato corrente.
 * @param {CanvasRenderingContext2D} g contesto
 * @param {string|CanvasGradient|null} fill riempimento (null = nessuno)
 * @param {string|null} line colore del contorno (null = nessuno)
 * @param {number} lw spessore del contorno
 */
export function paint(g, fill, line, lw) {
  if (fill) { g.fillStyle = fill; g.fill() }
  if (line) { g.strokeStyle = line; g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke() }
}

/**
 * Petalo o foglia: due curve di Bézier da una base a una punta.
 * @param {CanvasRenderingContext2D} g contesto
 * @param {number} x base x
 * @param {number} y base y
 * @param {number} len lunghezza
 * @param {number} wid larghezza massima (metà)
 * @param {number} ang direzione in radianti
 * @param {string|null} fill riempimento
 * @param {string|null} line contorno
 * @param {number} lw spessore contorno
 * @param {number} [bend] curvatura laterale della punta (frusta)
 */
export function petal(g, x, y, len, wid, ang, fill, line, lw, bend = 0) {
  const c = Math.cos(ang), s = Math.sin(ang)
  const p = (a, b) => [x + c * a - s * b, y + s * a + c * b]
  const tip = p(len, bend * len)
  const c1 = p(len * 0.3, wid), c2 = p(len * 0.8 + 0, wid * 0.7 + bend * len * 0.6)
  const d1 = p(len * 0.3, -wid), d2 = p(len * 0.8, -wid * 0.7 + bend * len * 0.6)
  g.beginPath()
  g.moveTo(x, y)
  g.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], tip[0], tip[1])
  g.bezierCurveTo(d2[0], d2[1], d1[0], d1[1], x, y)
  g.closePath()
  paint(g, fill, line, lw)
}

/**
 * Tratto spesso con contorno: curva cubica tracciata due volte (scura sotto, colore sopra).
 * @param {CanvasRenderingContext2D} g contesto
 * @param {number[]} p otto numeri: x0 y0 c1x c1y c2x c2y x1 y1
 * @param {number} width spessore del colore
 * @param {string} color colore
 * @param {string|null} line colore del contorno
 * @param {number} lw spessore del contorno (per lato)
 */
export function stroke(g, p, width, color, line, lw) {
  g.lineCap = 'round'
  const run = (wd, col) => {
    g.beginPath(); g.moveTo(p[0], p[1]); g.bezierCurveTo(p[2], p[3], p[4], p[5], p[6], p[7])
    g.strokeStyle = col; g.lineWidth = wd; g.stroke()
  }
  if (line) run(width + lw * 2, line)
  run(width, color)
}

/**
 * Ellisse piena con contorno.
 * @param {CanvasRenderingContext2D} g contesto
 * @param {number} x centro x
 * @param {number} y centro y
 * @param {number} rx raggio x
 * @param {number} ry raggio y
 * @param {string|null} fill riempimento
 * @param {string|null} line contorno
 * @param {number} lw spessore
 * @param {number} [rot] rotazione
 */
export function oval(g, x, y, rx, ry, fill, line, lw, rot = 0) {
  g.beginPath()
  g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2)
  paint(g, fill, line, lw)
}

/**
 * Cornice: disegna il bordo e restituisce l'area interna, già impostata come ritaglio
 * (chiamare g.restore() a fine disegno).
 * @param {CanvasRenderingContext2D} g contesto
 * @param {number} w larghezza
 * @param {number} h altezza
 * @param {'liberty'|'moderno'|'scandinavo'} kind tipo di cornice
 * @param {{ arch?: boolean, mat?: string }} [o] arco in alto (Liberty) o colore del passe-partout
 * @returns {{ x: number, y: number, w: number, h: number, u: number }} area interna e unità (lato corto)
 */
export function openFrame(g, w, h, kind, o = {}) {
  const m = Math.min(w, h)
  let t, mat = 0
  if (kind === 'liberty') t = m * 0.06
  else if (kind === 'moderno') t = Math.max(2, m * 0.022)
  else { t = m * 0.045; mat = m * 0.1 }
  g.save()
  if (kind === 'liberty') {
    const gr = g.createLinearGradient(0, 0, w, h)
    gr.addColorStop(0, '#e6c566'); gr.addColorStop(0.5, '#b78a2a'); gr.addColorStop(1, '#e0b950')
    g.fillStyle = gr; g.fillRect(0, 0, w, h)
    g.strokeStyle = '#5a3d10'; g.lineWidth = Math.max(1.5, m * 0.008)
    g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth)
    g.strokeStyle = '#f3dd95'; g.lineWidth = Math.max(1, t * 0.18)
    g.strokeRect(t * 0.32, t * 0.32, w - t * 0.64, h - t * 0.64)
    g.strokeStyle = '#6a4a14'; g.lineWidth = Math.max(1, t * 0.1)
    g.strokeRect(t * 0.7, t * 0.7, w - t * 1.4, h - t * 1.4)
  } else if (kind === 'moderno') {
    g.fillStyle = '#16181a'; g.fillRect(0, 0, w, h)
  } else {
    g.fillStyle = '#d9b98a'; g.fillRect(0, 0, w, h)
    g.strokeStyle = 'rgba(120,85,45,0.35)'; g.lineWidth = 1
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(0, t * i / 4); g.lineTo(w, t * i / 4); g.stroke() }
    g.fillStyle = o.mat || '#fbf8f1'; g.fillRect(t, t, w - 2 * t, h - 2 * t)
  }
  const x = t + mat, y = t + mat, iw = w - 2 * (t + mat), ih = h - 2 * (t + mat)
  g.beginPath()
  if (kind === 'liberty' && o.arch && iw < ih) {
    const r = iw / 2
    g.moveTo(x, y + r); g.arc(x + r, y + r, r, Math.PI, 0); g.lineTo(x + iw, y + ih); g.lineTo(x, y + ih)
  } else g.rect(x, y, iw, ih)
  g.closePath()
  if (kind === 'liberty') { g.fillStyle = '#3a2a10'; g.fill() }
  g.clip()
  return { x, y, w: iw, h: ih, u: m }
}
