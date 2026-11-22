/** Voci di `ctx.registry.lamps` per un arredo con `light`. */

/**
 * @param {object} item voce di `furnishing.items`
 * @param {{x: number, z: number}[]} tableLamps posizione in pianta delle lampade da tavolo sul mobile
 * @returns {{ id: string, room: string, type: string, prio: number, position: number[] }[]}
 */
export function lampEntries(item, tableLamps) {
  const { light } = item
  if (!light) return []
  const base = { room: item.room, prio: light.prio }
  const one = (id, type, x, z) => ({ id, ...base, type, position: [x, light.y, z] })
  if (item.mount !== 'floor') return [one(item.id, item.type, item.at[0], item.at[1])]
  if (tableLamps.length) return tableLamps.map((l, i) => one(i ? `${item.id}#${i + 1}` : item.id, 'table_lamp', l.x, l.z))
  const r = item.rect
  if (item.type === 'floor_lamp') return [one(item.id, 'floor_lamp', (r[0] + r[2]) / 2, (r[1] + r[3]) / 2)]
  return [one(item.id, 'sconce', item.at[0], item.at[1])] // applique sopra lo specchio del lavabo
}
