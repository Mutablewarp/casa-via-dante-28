/** Minimappa: pianta disegnata da `plan`, stanza corrente evidenziata, punto e cono del visitatore. */

const W = 220 // dimensioni in pixel CSS
const H = 120
const PAD = 8
const FPS_MS = 100
const FOV_HALF = (35 * Math.PI) / 180
const ZONES = {
  comune: 'rgba(160, 150, 130, 0.55)', giorno: 'rgba(200, 170, 100, 0.55)', notte: 'rgba(120, 150, 140, 0.55)',
  servizi: 'rgba(130, 160, 170, 0.55)', ala_studio: 'rgba(160, 130, 160, 0.5)',
}
const OUTDOOR = 'rgba(110, 160, 110, 0.5)'
const ACCENT = 'rgba(47, 93, 80, 0.8)'

/**
 * Crea la minimappa ed espone `ctx.debug.minimapPx`.
 * @param {object} ctx contesto condiviso
 * @param {object} ui servizi dell'interfaccia
 * @returns {{ el: HTMLCanvasElement }}
 */
export function createMinimap(ctx, ui) {
  const { h, call } = ui
  const { plan, grid, state, events, registry } = ctx
  const canvas = h('canvas', {
    class: 'k-panel k-minimap', testid: 'minimap', role: 'img', 'aria-label': 'Pianta della casa: clicca una stanza per andarci',
  })
  canvas.style.width = `${W}px`
  canvas.style.height = `${H}px`

  // estensione di impronta e spazi esterni, trasformazione fissa uguale alla vista zenitale
  const rects = [...plan.footprint, ...plan.outdoor.flatMap((o) => o.rects)]
  const xmin = Math.min(...rects.map((r) => r[0]))
  const xmax = Math.max(...rects.map((r) => r[2]))
  const zmin = Math.min(...rects.map((r) => r[1]))
  const zmax = Math.max(...rects.map((r) => r[3]))
  const s = Math.min((W - 2 * PAD) / (xmax - xmin), (H - 2 * PAD) / (zmax - zmin))
  const toPx = (x, z) => ({ x: PAD + (x - xmin) * s, y: PAD + (z - zmin) * s })

  const base = document.createElement('canvas')
  let dpr = 0
  const spaces = [...plan.rooms, ...plan.outdoor]
  const rectPath = (g, r) => {
    const a = toPx(r[0], r[1])
    g.rect(a.x, a.y, (r[2] - r[0]) * s, (r[3] - r[1]) * s)
  }

  /** Disegna la parte fissa: stanze per zona e aperture percorribili. */
  function drawBase() {
    base.width = Math.round(W * dpr)
    base.height = Math.round(H * dpr)
    const g = base.getContext('2d')
    g.scale(dpr, dpr)
    for (const sp of spaces) {
      g.fillStyle = sp.zone ? (ZONES[sp.zone] ?? ZONES.comune) : OUTDOOR
      g.beginPath()
      for (const r of sp.rects) rectPath(g, r)
      g.fill()
    }
    g.fillStyle = 'rgba(255, 252, 240, 0.95)'
    for (const o of plan.openings) {
      if (!o.walk) continue
      g.beginPath()
      const [x0, z0, x1, z1] = o.rect
      const a = toPx(x0, z0)
      const w = Math.max((x1 - x0) * s, 2)
      const hh = Math.max((z1 - z0) * s, 2)
      g.rect(a.x - (w - (x1 - x0) * s) / 2, a.y - (hh - (z1 - z0) * s) / 2, w, hh)
      g.fill()
    }
  }

  const g2 = canvas.getContext('2d')
  let lastKey = ''
  let lastDraw = 0
  /** Ridisegna se qualcosa è cambiato, al massimo 10 volte al secondo. */
  function draw() {
    const now = performance.now()
    if (now - lastDraw < FPS_MS || !canvas.offsetWidth) return
    lastDraw = now
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const pose = typeof ctx.api.getPose === 'function' ? ctx.api.getPose() : null
    const key = `${ratio}|${state.room}|${pose ? `${pose.x.toFixed(2)},${pose.z.toFixed(2)},${pose.yaw.toFixed(2)}` : ''}`
    if (key === lastKey) return
    lastKey = key
    if (ratio !== dpr) {
      dpr = ratio
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      drawBase()
    }
    g2.setTransform(dpr, 0, 0, dpr, 0, 0)
    g2.clearRect(0, 0, W, H)
    g2.drawImage(base, 0, 0, W, H)
    const cur = spaces.find((sp) => sp.id === state.room)
    if (cur) {
      g2.beginPath()
      for (const r of cur.rects) rectPath(g2, r)
      g2.fillStyle = 'rgba(47, 93, 80, 0.35)'
      g2.fill()
      g2.strokeStyle = ACCENT
      g2.lineWidth = 1.5
      g2.stroke()
    }
    if (!pose) return
    const p = toPx(pose.x, pose.z)
    const a = Math.PI / 2 - pose.yaw // direzione (sin yaw, cos yaw) nel piano del canvas
    g2.beginPath()
    g2.moveTo(p.x, p.y)
    g2.arc(p.x, p.y, 18, a - FOV_HALF, a + FOV_HALF)
    g2.closePath()
    g2.fillStyle = 'rgba(184, 150, 74, 0.55)'
    g2.fill()
    g2.beginPath()
    g2.arc(p.x, p.y, 4, 0, Math.PI * 2)
    g2.fillStyle = '#B8964A'
    g2.fill()
    g2.lineWidth = 1.5
    g2.strokeStyle = '#2A2622'
    g2.stroke()
  }
  registry.updaters.push(draw)
  events.on('room:changed', () => { lastKey = '' })
  events.on('ready', () => { lastKey = '' })

  /** Coordinate di finestra del punto pianta (x, z): serve al collaudo. */
  ctx.debug.minimapPx = (x, z) => {
    const r = canvas.getBoundingClientRect()
    const p = toPx(x, z)
    return { x: r.left + (p.x * r.width) / W, y: r.top + (p.y * r.height) / H }
  }

  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect()
    const px = ((e.clientX - r.left) * W) / r.width
    const py = ((e.clientY - r.top) * H) / r.height
    const x = xmin + (px - PAD) / s
    const z = zmin + (py - PAD) / s
    const space = grid.spaceAt(x, z)
    if (!space) return
    call('teleport', grid.isWalkable(x, z) ? { x, z } : space.id)
  })
  return { el: canvas }
}
