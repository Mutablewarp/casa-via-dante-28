/** Joystick virtuale per i dispositivi touch: un piccolo elemento dentro #ui. */

const SIZE = 132 // diametro della base (px)
const THUMB = 56 // diametro del pomello (px)
const RADIUS = 44 // corsa massima del pomello (px)

/** Vero sui dispositivi con schermo tattile. */
function isTouchDevice() {
  return (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0
}

/**
 * Crea il joystick. Si mostra solo su dispositivi touch (o dopo il primo tocco).
 * @param {{ onUse: () => void }} hooks `onUse` è chiamata a ogni nuova pressione
 * @returns {{ el: HTMLElement, read: () => {x:number,y:number}, setVisible: (on: boolean) => void, release: () => void }}
 */
export function createJoystick({ onUse }) {
  const el = document.createElement('div')
  el.dataset.testid = 'joystick'
  el.setAttribute('aria-hidden', 'true')
  el.style.cssText = `position:absolute;left:16px;bottom:calc(var(--toolbar-h, 0px) + 16px);width:${SIZE}px;height:${SIZE}px;`
    + 'border-radius:50%;background:rgba(255,255,255,.14);border:2px solid rgba(255,255,255,.45);'
    + 'box-sizing:border-box;touch-action:none;pointer-events:auto;user-select:none;-webkit-user-select:none;display:none'
  const thumb = document.createElement('div')
  thumb.style.cssText = `position:absolute;left:50%;top:50%;width:${THUMB}px;height:${THUMB}px;margin:${-THUMB / 2}px 0 0 ${-THUMB / 2}px;`
    + 'border-radius:50%;background:rgba(255,255,255,.55);pointer-events:none'
  el.appendChild(thumb)
  ;(document.getElementById('ui') ?? document.body).appendChild(el)

  const vec = { x: 0, y: 0 }
  let pointerId = null
  let touchSeen = isTouchDevice()
  let wanted = true

  const refresh = () => { el.style.display = touchSeen && wanted ? 'block' : 'none' }

  const move = (e) => {
    const r = el.getBoundingClientRect()
    let dx = e.clientX - (r.left + r.width / 2)
    let dy = e.clientY - (r.top + r.height / 2)
    const len = Math.hypot(dx, dy)
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS
      dy = (dy / len) * RADIUS
    }
    vec.x = dx / RADIUS
    vec.y = dy / RADIUS
    thumb.style.transform = `translate(${dx}px, ${dy}px)`
  }

  const release = () => {
    pointerId = null
    vec.x = 0
    vec.y = 0
    thumb.style.transform = ''
  }

  el.addEventListener('pointerdown', (e) => {
    if (pointerId !== null) return
    pointerId = e.pointerId
    try { el.setPointerCapture(e.pointerId) } catch (err) { /* il puntatore può essere già concluso */ }
    e.preventDefault()
    onUse()
    move(e)
  })
  el.addEventListener('pointermove', (e) => { if (e.pointerId === pointerId) move(e) })
  for (const type of ['pointerup', 'pointercancel']) {
    el.addEventListener(type, (e) => { if (e.pointerId === pointerId) release() })
  }
  // un primo tocco in qualunque punto rivela il joystick su dispositivi ibridi
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' && !touchSeen) {
      touchSeen = true
      refresh()
    }
  }, { capture: true, passive: true })

  refresh()
  return {
    el,
    /** Spostamento corrente: x a destra, y in basso, da -1 a 1. */
    read: () => ({ x: vec.x, y: vec.y }),
    /** Mostra o nasconde il joystick (solo se il dispositivo è touch). */
    setVisible(on) { wanted = on; refresh() },
    release,
  }
}
