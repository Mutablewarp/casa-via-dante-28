/** Grafo Web Audio e pianificazione delle note (usa score.js per le scelte musicali). */
import {
  BAR, BEAT, SLOTS_PER_BAR, HARP_TRIANGLE_MAX, chordAt, harpAt, midiToFreq,
} from './score.js'

const MASTER_GAIN = 0.16
const FADE_IN = 3
const FADE_OUT = 0.6
const TICK_MS = 100
const LOOKAHEAD = 0.5
const REVERB_SECONDS = 2.5
const WET = 0.3
const SLOT = BAR / SLOTS_PER_BAR // mezza battuta (2 tempi)

/** Risposta all'impulso generata: rumore con decadimento esponenziale. */
function makeImpulse(ac) {
  const len = Math.floor(ac.sampleRate * REVERB_SECONDS)
  const buf = ac.createBuffer(2, len, ac.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp((-6.9 * i) / len) // -60 dB a fine coda
  }
  return buf
}

/**
 * Crea il motore audio. Nessun nodo viene costruito finché non si chiama `ensure()`.
 * @returns {object} motore con ensure, fadeIn, fadeOut, startClock, stopClock, status
 */
export function createEngine() {
  let ac = null
  let master = null
  let padBus = null
  let dry = null
  let send = null
  let timer = null
  let nextSlot = 0 // indice assoluto della prossima mezza battuta
  let nextTime = 0
  let voices = 0
  let scheduled = 0

  /** Costruisce il grafo audio (una sola volta). @returns {AudioContext|null} */
  function ensure() {
    if (ac) return ac
    const Ctor = window.AudioContext || window.webkitAudioContext
    if (!Ctor) return null
    ac = new Ctor()
    master = ac.createGain()
    master.gain.value = 0
    const comp = ac.createDynamicsCompressor()
    comp.threshold.value = -20
    comp.knee.value = 24
    comp.ratio.value = 3
    comp.attack.value = 0.02
    comp.release.value = 0.4
    master.connect(comp).connect(ac.destination)

    dry = ac.createGain()
    dry.gain.value = 1 - WET
    dry.connect(master)
    send = ac.createGain()
    send.gain.value = WET
    const conv = ac.createConvolver()
    conv.buffer = makeImpulse(ac)
    send.connect(conv).connect(master)

    // Tappeto: filtro passa-basso a 900 Hz che respira (LFO lentissimo)
    padBus = ac.createBiquadFilter()
    padBus.type = 'lowpass'
    padBus.frequency.value = 900
    padBus.Q.value = 0.3
    const lfo = ac.createOscillator()
    const lfoAmt = ac.createGain()
    lfo.frequency.value = 0.07
    lfoAmt.gain.value = 250
    lfo.connect(lfoAmt).connect(padBus.frequency)
    lfo.start()
    const padGain = ac.createGain()
    padGain.gain.value = 1
    padBus.connect(padGain)
    connectVoice(padGain)
    return ac
  }

  /** Collega un nodo di voce alla via diretta e alla mandata del riverbero. */
  function connectVoice(node) {
    node.connect(dry)
    node.connect(send)
  }

  /** Avvia un oscillatore pianificato; libera i nodi alla fine. */
  function osc(type, freq, t0, t1, out, detune = 0) {
    const o = ac.createOscillator()
    o.type = type
    o.frequency.value = freq
    o.detune.value = detune
    o.connect(out)
    voices++
    o.onended = () => {
      voices--
      o.disconnect()
      out.disconnect()
    }
    o.start(t0)
    o.stop(t1)
  }

  /** Inviluppo con attacco lineare, tenuta e rilascio lineare. Restituisce il guadagno già collegato. */
  function envGain(t0, attack, hold, release, peak, target) {
    const g = ac.createGain()
    g.gain.setValueAtTime(0, t0)
    g.gain.linearRampToValueAtTime(peak, t0 + attack)
    g.gain.setValueAtTime(peak, t0 + hold)
    g.gain.linearRampToValueAtTime(0, t0 + hold + release)
    if (target) g.connect(target)
    return g
  }

  /** Tappeto e basso di un accordo (due battute). */
  function playChord(chord, t) {
    const hold = BAR * 2
    for (const m of chord.pad) {
      const f = midiToFreq(m)
      // un guadagno per oscillatore: ogni coppia di onde si libera da sola
      for (const cents of [-4, 4]) {
        osc('triangle', f, t, t + hold + 3.05, envGain(t, 2, hold, 3, 0.11, padBus), cents)
      }
    }
    const bassG = envGain(t, 0.4, hold, 2, 0.22, null)
    connectVoice(bassG)
    osc('sine', midiToFreq(chord.bass), t, t + hold + 2.05, bassG)
    scheduled++
  }

  /** Una nota d'arpa: seno, più triangolare all'ottava solo fino al La4. */
  function playHarp(midi, t) {
    const f = midiToFreq(midi)
    const g = ac.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.3, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0005, t + 1.8)
    g.gain.linearRampToValueAtTime(0, t + 1.85)
    connectVoice(g)
    osc('sine', f, t, t + 1.9, g)
    if (midi <= HARP_TRIANGLE_MAX) {
      const g2 = ac.createGain()
      g2.gain.value = 0.22
      g2.connect(g)
      osc('triangle', f * 2, t, t + 1.9, g2)
    }
    scheduled++
  }

  /** Prepara le note che cadono nei prossimi LOOKAHEAD secondi. */
  function tick() {
    while (nextTime < ac.currentTime + LOOKAHEAD) {
      const bar = Math.floor(nextSlot / SLOTS_PER_BAR)
      const slot = nextSlot % SLOTS_PER_BAR
      const chord = chordAt(bar)
      if (slot === 0 && chord.start) playChord(chord, nextTime)
      const n = harpAt(bar, slot)
      if (n) playHarp(n.midi, nextTime)
      nextSlot++
      nextTime += SLOT
    }
  }

  return {
    ensure,
    /** Dissolvenza in entrata di 3 s con rampa lineare. */
    fadeIn() {
      const now = ac.currentTime
      master.gain.cancelScheduledValues(now)
      master.gain.setValueAtTime(master.gain.value, now)
      master.gain.linearRampToValueAtTime(MASTER_GAIN, now + FADE_IN)
    },
    /** Dissolvenza in uscita di 0,6 s con rampa lineare. */
    fadeOut() {
      const now = ac.currentTime
      master.gain.cancelScheduledValues(now)
      master.gain.setValueAtTime(master.gain.value, now)
      master.gain.linearRampToValueAtTime(0, now + FADE_OUT)
    },
    /** Avvia il programmatore (ogni 100 ms), riprendendo dalla mezza battuta successiva. */
    startClock() {
      if (timer) return
      nextTime = Math.max(nextTime, ac.currentTime + 0.1)
      timer = setInterval(tick, TICK_MS)
      tick()
    },
    stopClock() {
      clearInterval(timer)
      timer = null
    },
    fadeOutSeconds: FADE_OUT,
    /** @returns {{ state: string, gain: number, voices: number, scheduledNotes: number }} */
    status() {
      if (!ac) return { state: 'none', gain: 0, voices: 0, scheduledNotes: 0 }
      return { state: ac.state, gain: master.gain.value, voices, scheduledNotes: scheduled }
    },
    get ac() { return ac },
  }
}
