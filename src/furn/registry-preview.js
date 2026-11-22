/** Anteprime di prova per gli agenti degli arredi: `ctx.debug.previewTypes`, `previewProp`, `clearPreview`. */

const TABLE = { x: 17.2, z: 13.2, w: 1.6, d: 0.9, top: 0.76, thick: 0.04 }

/**
 * Aggiunge a `ctx.debug` le anteprime. Richiede `ctx.furn` già pronto.
 * @param {object} ctx contesto condiviso
 */
export function createPreview(ctx) {
  const { THREE } = ctx
  const rad = (deg) => (deg * Math.PI) / 180
  const holders = {}
  let rows = 0

  /** Gruppo di anteprima vuoto con quel nome, dentro `groups.furniture`. */
  const fresh = (name) => {
    clear(name)
    const g = new THREE.Group()
    g.name = `preview-${name}`
    ctx.groups.furniture.add(g)
    holders[name] = g
    return g
  }
  const clear = (name) => {
    const g = holders[name]
    if (!g) return
    g.traverse((o) => o.geometry?.dispose())
    g.removeFromParent()
    delete holders[name]
  }

  /** Posa l'oggetto dove dice la voce (pavimento, parete, soffitto). */
  const placeItem = (g, item) => {
    const [x, z] = item.at ?? [(item.rect[0] + item.rect[2]) / 2, (item.rect[1] + item.rect[3]) / 2]
    const y = item.mount === 'wall' ? item.y : item.mount === 'ceiling' ? ctx.plan.meta.ceilingHeight : 0
    g.position.set(x, y, z)
    g.rotation.y = rad(item.rot ?? 0)
  }

  /**
   * Costruisce nella loro posizione reale tutte le voci dei tipi richiesti (anche quelle che li ricevono per `retype`),
   * senza oggetti d'appoggio né collisioni; salta le tende e le voci omesse nello stile corrente.
   * @param {string[]} types @returns {{created: number, placeholders: number, ids: string[]}}
   */
  ctx.debug.previewTypes = (types) => {
    const want = new Set(types)
    const ov = ctx.furnishing.styleOverrides?.[ctx.state.style] ?? {}
    const omit = new Set(ov.omit ?? [])
    const holder = fresh('types')
    const ids = []
    let placeholders = 0
    for (const item of ctx.furnishing.items) {
      if (item.mount === 'opening' || omit.has(item.id)) continue
      if (!want.has(ov.retype?.[item.id] ?? item.type)) continue
      const g = ctx.furn.create(item)
      placeItem(g, item)
      holder.add(g)
      ids.push(item.id)
      if (g.userData.placeholder) placeholders++
    }
    return { created: ids.length, placeholders, ids }
  }

  /**
   * Costruisce `count` copie dell'oggetto d'appoggio in fila su un piano di prova di 1,6 x 0,9 m a quota 0,76,
   * appoggiato a terra sulla terrazza. Le chiamate successive aggiungono file parallele (3 al massimo, poi si ricomincia)
   * sullo stesso piano, finché non si chiama `clearPreview`.
   * @param {string} name @param {number} [count=1] @returns {{placeholder: boolean}}
   */
  ctx.debug.previewProp = (name, count = 1) => {
    const row = rows++ % 3
    const renew = row === 0 || !holders.prop
    const holder = renew ? fresh('prop') : holders.prop
    if (renew) addTable(holder)
    const top = { y: TABLE.top, w: TABLE.w, d: TABLE.d }
    let placeholder = false
    for (let i = 0; i < count; i++) {
      const g = ctx.furn.prop(name, { item: { id: 'preview' }, top, index: i, count })
      g.position.set(TABLE.x + ((i + 1) / (count + 1) - 0.5) * TABLE.w, TABLE.top, TABLE.z + (row - 1) * TABLE.d / 3)
      holder.add(g)
      placeholder ||= g.userData.placeholder === true
    }
    return { placeholder }
  }

  /** Piano di prova su quattro gambe. */
  const addTable = (holder) => {
    const mat = new THREE.MeshStandardMaterial({ color: 0xb8a58a, roughness: 0.7 })
    const slab = new THREE.Mesh(new THREE.BoxGeometry(TABLE.w, TABLE.thick, TABLE.d), mat)
    slab.position.set(TABLE.x, TABLE.top - TABLE.thick / 2, TABLE.z)
    holder.add(slab)
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const h = TABLE.top - TABLE.thick
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, h, 0.05), mat)
        leg.position.set(TABLE.x + sx * (TABLE.w / 2 - 0.06), h / 2, TABLE.z + sz * (TABLE.d / 2 - 0.06))
        holder.add(leg)
      }
    }
  }

  /** Toglie tutte le anteprime. */
  ctx.debug.clearPreview = () => { Object.keys(holders).forEach(clear); rows = 0 }
}
