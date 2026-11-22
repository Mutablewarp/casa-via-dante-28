/** Musica generata dal codice: stato, API pubblica e preferenza dell'utente. */
import { createEngine } from './engine.js'

const KEY = 'casa.music'

/** Legge la preferenza salvata: true, false oppure null. */
function readPref() {
  try {
    const v = localStorage.getItem(KEY)
    return v === '1' ? true : v === '0' ? false : null
  } catch (e) {
    return null
  }
}

/** @param {boolean} on */
function savePref(on) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch (e) {
    /* archivio non disponibile: si ignora */
  }
}

/** @param {object} ctx contesto condiviso */
export function init(ctx) {
  const engine = createEngine()
  let token = 0 // annulla le accensioni superate da uno spegnimento

  ctx.debug.audio = () => engine.status()
  ctx.api.musicPreference = readPref

  /** Accende o spegne la musica con dissolvenza. @param {boolean} on @returns {Promise<void>} */
  ctx.api.setMusic = async (on) => {
    on = !!on
    const mine = ++token
    const changed = ctx.state.music !== on
    ctx.state.music = on
    savePref(on)
    if (changed) ctx.events.emit('music:changed', { on })
    if (on) {
      const ac = engine.ensure()
      if (!ac) return
      try {
        if (ac.state === 'suspended' && !document.hidden) await ac.resume()
      } catch (e) {
        ctx.log.warn('audio: resume fallito', e)
      }
      if (mine !== token) return
      engine.fadeIn()
      engine.startClock()
      return
    }
    const ac = engine.ac
    if (!ac) return
    engine.fadeOut()
    await new Promise((r) => setTimeout(r, engine.fadeOutSeconds * 1000 + 50))
    if (mine !== token) return
    engine.stopClock()
    try {
      await ac.suspend()
    } catch (e) {
      ctx.log.warn('audio: suspend fallito', e)
    }
  }
  ctx.api.toggleMusic = () => ctx.api.setMusic(!ctx.state.music)

  // Scheda nascosta: sospende; al ritorno riprende solo se la musica è accesa.
  document.addEventListener('visibilitychange', () => {
    const ac = engine.ac
    if (!ac) return
    if (document.hidden) {
      engine.stopClock()
      ac.suspend().catch(() => {})
    } else if (ctx.state.music) {
      ac.resume().then(() => engine.startClock()).catch(() => {})
    }
  })
}
