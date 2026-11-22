/** Bus di eventi minimo: un ascoltatore che lancia non interrompe gli altri. */

/**
 * Crea un bus di eventi.
 * @param {{ error: Function }} log registro su cui annotare gli errori degli ascoltatori
 * @returns {{ on: (name: string, fn: Function) => (() => void), emit: (name: string, payload?: any) => void }}
 */
export function createEvents(log) {
  const map = new Map()
  return {
    /** Registra un ascoltatore; restituisce la funzione per disiscriversi. */
    on(name, fn) {
      if (!map.has(name)) map.set(name, new Set())
      map.get(name).add(fn)
      return () => map.get(name)?.delete(fn)
    },
    /** Chiama gli ascoltatori di `name`, catturando le loro eccezioni. */
    emit(name, payload) {
      const set = map.get(name)
      if (!set) return
      for (const fn of [...set]) {
        try {
          fn(payload)
        } catch (e) {
          log.error(`ascoltatore di "${name}":`, e)
        }
      }
    },
  }
}
