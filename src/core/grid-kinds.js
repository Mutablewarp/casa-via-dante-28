/** Tipi di cella della griglia (vedi spec/02-CONTRATTO.md, sezione 6). */
export const K = Object.freeze({ OUTSIDE: 0, WALL: 1, ROOM: 2, OPENING: 3, OUTDOOR: 4, SOLID: 5, BUILTIN: 6, STAIRS: 7, CONTEXT: 8 })

/** Vero se y cade in uno degli intervalli pieni [y0, y1). */
export function solidAtY(spans, y) {
  if (!spans) return false
  for (const s of spans) if (y >= s[0] && y < s[1]) return true
  return false
}
