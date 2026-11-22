/** Comandi dell'utente: tastiera, mouse, blocco del puntatore, touch, rotella e pizzico. */
import { createJoystick } from './input-joystick.js'

const LOOK_LOCKED = 0.0022 // rad per pixel con mouse bloccato
const LOOK_DRAG = 0.005 // rad per pixel trascinando
const CLICK_SLOP = 4 // oltre questi pixel un clic è un trascinamento
const TAP_SLOP = 10 // pixel di tolleranza per un tocco
const DOUBLE_TAP_MS = 350
const DOUBLE_TAP_PX = 30
const ARROWS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])
const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', ...ARROWS])
const BUTTON_LIKE = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'image', 'color', 'file'])
const ZERO = Object.freeze({ forward: 0, right: 0, run: false })

/**
 * Vero se il tasto `code` va lasciato all'elemento che ha il fuoco.
 * @param {Element|null} el elemento che riceve il tasto
 * @param {string} code codice del tasto
 */
function keyBelongsToElement(el, code) {
  if (!el || !el.tagName) return false
  const tag = el.tagName
  if (el.isContentEditable || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag === 'INPUT') {
    const type = (el.type || 'text').toLowerCase()
    if (type === 'range') return ARROWS.has(code)
    if (BUTTON_LIKE.has(type)) return code === 'Enter' || code === 'Space'
    return true
  }
  if (tag === 'BUTTON') return code === 'Enter' || code === 'Space'
  return false
}

/**
 * Collega tastiera, puntatori e joystick a `host`.
 * @param {object} ctx contesto condiviso
 * @param {{ view: () => string, locked: () => boolean, busy: () => boolean, look: Function, orbit: Function, zoom: Function, pan: Function, dblclick: Function, toggleView: Function, userInput: Function }} host azioni della navigazione
 * @returns {{ read: () => {forward:number,right:number,run:boolean}, joystick: object, reset: () => void }}
 */
export function createInput(ctx, host) {
  const { canvas } = ctx
  const keys = new Set()
  const ptrs = new Map()
  let shift = false
  let moved = 0
  let pinch = null
  let lastTap = null

  canvas.style.touchAction = 'none'
  const joystick = createJoystick({ onUse: () => { if (host.locked()) host.userInput('joystick') } })

  const free = () => !host.locked() && !host.busy()
  const pointerLocked = () => document.pointerLockElement === canvas

  // --- tastiera ---
  window.addEventListener('keydown', (e) => {
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shift = true
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (MOVE_KEYS.has(e.code)) {
      if (keyBelongsToElement(e.target, e.code)) return
      if (host.locked()) {
        if (!e.repeat) host.userInput('key')
        return
      }
      keys.add(e.code)
      e.preventDefault()
    } else if (e.code === 'KeyM' && !e.repeat) {
      if (keyBelongsToElement(e.target, e.code)) return
      if (host.locked()) host.userInput('view')
      else host.toggleView()
    }
  })
  window.addEventListener('keyup', (e) => {
    keys.delete(e.code)
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shift = false
  })
  window.addEventListener('blur', () => { keys.clear(); shift = false })

  // --- blocco del puntatore ---
  function requestLock() {
    try {
      const p = canvas.requestPointerLock?.()
      if (p && p.catch) p.catch((err) => ctx.log.debug('blocco del puntatore rifiutato:', err?.message))
    } catch (err) {
      ctx.log.debug('blocco del puntatore non disponibile:', err?.message)
    }
  }
  document.addEventListener('mousemove', (e) => {
    if (pointerLocked() && host.view() === 'fps' && free()) host.look(e.movementX, e.movementY, LOOK_LOCKED)
  })
  document.addEventListener('pointerlockchange', () => ptrs.clear())

  // --- puntatori sul canvas ---
  const pair = () => [...ptrs.values()].slice(0, 2)
  const measure = () => {
    const [a, b] = pair()
    return { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (pointerLocked() || (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2)) return
    try { canvas.setPointerCapture(e.pointerId) } catch (err) { /* puntatore già concluso */ }
    if (!ptrs.size) moved = 0
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button, type: e.pointerType })
    pinch = ptrs.size === 2 ? measure() : null
  })

  canvas.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId)
    if (!p || pointerLocked()) return
    const dx = e.clientX - p.x
    const dy = e.clientY - p.y
    p.x = e.clientX
    p.y = e.clientY
    if (ptrs.size === 1) moved += Math.abs(dx) + Math.abs(dy)
    if (!free()) return
    const view = host.view()
    if (view === 'fps' && ptrs.size === 1 && p.button !== 2) host.look(dx, dy, LOOK_DRAG)
    else if (view === 'dollhouse' && ptrs.size === 1) {
      if (p.button === 2) host.pan(dx, dy)
      else host.orbit(dx, dy)
    } else if (view === 'dollhouse' && ptrs.size === 2 && pinch) {
      const now = measure()
      host.zoom(pinch.dist / now.dist)
      host.pan(now.cx - pinch.cx, now.cy - pinch.cy)
      pinch = now
    }
  })

  const end = (e) => {
    const p = ptrs.get(e.pointerId)
    if (!p) return
    ptrs.delete(e.pointerId)
    pinch = ptrs.size === 2 ? measure() : null
    // doppio tocco: il doppio clic del mouse arriva da solo con l'evento dblclick
    if (e.type !== 'pointerup' || p.type !== 'touch' || moved > TAP_SLOP || ptrs.size) return
    const now = performance.now()
    if (lastTap && now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < DOUBLE_TAP_PX) {
      lastTap = null
      host.dblclick(e.clientX, e.clientY)
    } else lastTap = { t: now, x: e.clientX, y: e.clientY }
  }
  canvas.addEventListener('pointerup', end)
  canvas.addEventListener('pointercancel', end)

  canvas.addEventListener('click', (e) => {
    if (e.pointerType === 'touch' || e.detail > 1 || moved > CLICK_SLOP) return
    if (host.view() === 'fps' && free() && !pointerLocked()) requestLock()
  })
  canvas.addEventListener('dblclick', (e) => host.dblclick(e.clientX, e.clientY))
  canvas.addEventListener('contextmenu', (e) => e.preventDefault())
  canvas.addEventListener('wheel', (e) => {
    if (host.view() !== 'dollhouse') return
    e.preventDefault()
    if (!free()) return
    const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
    host.zoom(Math.exp(Math.max(-300, Math.min(300, px)) * 0.0012))
  }, { passive: false })

  return {
    joystick,
    /** Comandi di movimento correnti: da tastiera e joystick, nulli quando non valgono. */
    read() {
      if (host.view() !== 'fps' || !free()) return ZERO
      const has = (...c) => c.some((k) => keys.has(k))
      const j = joystick.read()
      let forward = (has('KeyW', 'ArrowUp') ? 1 : 0) - (has('KeyS', 'ArrowDown') ? 1 : 0) - j.y
      let right = (has('KeyD', 'ArrowRight') ? 1 : 0) - (has('KeyA', 'ArrowLeft') ? 1 : 0) + j.x
      const len = Math.hypot(forward, right)
      if (len > 1) {
        forward /= len
        right /= len
      }
      return { forward, right, run: shift && len > 0 }
    },
    /** Azzera tasti, puntatori e joystick. */
    reset() {
      keys.clear()
      ptrs.clear()
      pinch = null
      joystick.release()
    },
  }
}
