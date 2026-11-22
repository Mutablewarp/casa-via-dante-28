/** Registro: debug e info scrivono solo con ?debug nell'indirizzo; è l'unico file di src/ che usa console. */

/**
 * Crea il registro.
 * @param {boolean} verbose se vero, debug e info scrivono in console
 * @returns {{ debug: Function, info: Function, warn: Function, error: Function }}
 */
export function createLog(verbose) {
  const sink = {
    debug: (...a) => { if (verbose) console.log('[casa]', ...a) },
    info: (...a) => { if (verbose) console.info('[casa]', ...a) },
    warn: (...a) => console.warn('[casa]', ...a),
    error: (...a) => console.error('[casa]', ...a),
  }
  return sink
}
