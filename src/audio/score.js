/** Armonia e scelta delle note (pura: nessuna Web Audio, usabile anche in Node). */

export const BPM = 56
export const BEAT = 60 / BPM
export const BAR = BEAT * 4
export const FORM_BARS = 32
/** Battute dopo le quali la scelta delle note dell'arpa si ripete. */
export const HARP_PERIOD = 64
export const SLOTS_PER_BAR = 2
export const HARP_MIN = 50 // Re3
export const HARP_MAX = 74 // Re5
export const HARP_TRIANGLE_MAX = 69 // La4: sopra suona il solo seno
export const PASSING = 68 // Sol#4, nota di passaggio lidia
const SEED = 0x5a17d0

// Accordi: pad (midi), basso (midi). Tonalità Re maggiore.
const CHORDS = {
  Dmaj7: { pad: [50, 54, 57, 61], bass: 38 },
  Bm7: { pad: [47, 50, 54, 57], bass: 47 },
  Gmaj7: { pad: [55, 59, 62, 66], bass: 43 },
  A7sus4: { pad: [57, 62, 64, 67], bass: 45 },
  F: { pad: [54, 57, 61, 64], bass: 42 },
  Em9: { pad: [52, 55, 59, 62, 66], bass: 40 },
}
CHORDS['F#m7'] = CHORDS.F
delete CHORDS.F

const PHRASE_A = ['Dmaj7', 'Bm7', 'Gmaj7', 'A7sus4']
const PHRASE_B = ['Dmaj7', 'F#m7', 'Gmaj7', 'Em9']
// Forma A A B A, 8 battute per frase, 2 battute per accordo.
const FORM = [PHRASE_A, PHRASE_A, PHRASE_B, PHRASE_A]

const NAMES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si']

/** @param {number} midi @returns {number} frequenza in Hz */
export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/** @param {number} midi @returns {string} nome con ottava, per esempio «Fa#4» */
export function noteName(midi) {
  return NAMES[midi % 12] + (Math.floor(midi / 12) - 1)
}

/**
 * Accordo della battuta `bar` (indice assoluto, la forma si ripete ogni 32).
 * @param {number} bar
 * @returns {{ name: string, pad: number[], bass: number, pcs: number[], start: boolean }}
 *   `start` è vero alla prima delle due battute dell'accordo.
 */
export function chordAt(bar) {
  const b = ((bar % FORM_BARS) + FORM_BARS) % FORM_BARS
  const name = FORM[Math.floor(b / 8)][Math.floor((b % 8) / 2)]
  const c = CHORDS[name]
  return { name, pad: c.pad, bass: c.bass, pcs: [...new Set(c.pad.map((m) => m % 12))], start: b % 2 === 0 }
}

/** Generatore con seme (mulberry32). @param {number} a @returns {() => number} */
function rng(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Nota dell'arpa per la battuta e la mezza battuta date; `null` = pausa (30 %).
 * Stessa risposta a ogni chiamata, sequenza che si ripete ogni 64 battute.
 * Il Sol# di passaggio compare al più una volta ogni 8 battute: solo nella
 * seconda battuta del primo accordo di ogni frase, seconda mezza battuta.
 * @param {number} bar @param {number} slot 0 o 1
 * @returns {{ midi: number, passing: boolean } | null}
 */
export function harpAt(bar, slot) {
  const k = ((bar % HARP_PERIOD) + HARP_PERIOD) % HARP_PERIOD
  const r = rng(SEED ^ Math.imul(k + 1, 7919) ^ Math.imul(slot + 1, 104729))
  r(); r() // scarta i primi valori, troppo correlati al seme
  const rest = r() < 0.3
  const pick = r()
  const pass = r() < 0.5
  if (rest) return null
  const b = k % FORM_BARS
  if (b % 8 === 1 && slot === 1 && pass) return { midi: PASSING, passing: true }
  const tones = []
  const pcs = chordAt(bar).pcs
  for (let m = HARP_MIN; m <= HARP_MAX; m++) if (pcs.includes(m % 12)) tones.push(m)
  return { midi: tones[Math.floor(pick * tones.length)], passing: false }
}
