/*
 * Kit degli arredi: funzioni pure che restituiscono THREE.Mesh o THREE.Group (nessun ctx).
 *
 * CONVENZIONE UNICA
 *  - L'origine di ogni forma è al CENTRO DELLA BASE; `at.y` è la quota della base da terra.
 *  - `at = { x, y, z, ry }` posiziona la forma nel suo contenitore (tutti facoltativi, `ry` in radianti).
 *  - Fronte +z, larghezza lungo x, profondità lungo z, altezza lungo y. `item.size = [larghezza, profondità, altezza]`.
 *  - `tube`, `rng`, `texMat`, `mergeByMaterial`, `finalize` non hanno `at`: i punti di `tube` sono già nello spazio dell'oggetto.
 *  - Materiali solo da `env.mat('token')` o `kit.texMat(texture)`: mai `new Material` per oggetto.
 *  - Ultima riga di ogni costruttore: `return kit.finalize(g, item)` (fonde per materiale e calcola l'ingombro).
 *
 * ESEMPIO: comodino liberty con cassetto e pomolo in ottone (item.size = [0.45, 0.45, 0.6]).
 *   register('nightstand', (item, env) => {
 *     const { kit, mat, shape } = env
 *     const [w, d, h] = item.size
 *     const wood = mat('wood.primary'), brass = mat('metal.accent')
 *     const g = new THREE.Group()
 *     const lh = 0.2                                   // altezza delle gambe
 *     g.add(kit.legs4(shape.legs, w, d, lh, wood, 0.04))
 *     g.add(kit.rbox(w, h - lh - 0.03, d, 0.01, wood, { y: lh }))                // cassa
 *     g.add(kit.rbox(w + 0.03, 0.03, d + 0.03, 0.01, mat('stone.top'), { y: h - 0.03 })) // piano
 *     g.add(kit.panel(w - 0.06, 0.16, 0.02, wood, { y: lh + 0.06, z: d / 2 }, brass))   // cassetto
 *     g.userData.top = { y: h, w, d }                  // piano utile per gli oggetti d'appoggio
 *     return kit.finalize(g, item)
 *   })
 */
export { place, box, rbox, cyl, sphere, lathe, extrude, tube, rng } from './kit-base.js'
export { leg, legs4, crest, cushion, panel } from './kit-parts.js'
export { texMat, disposeTexMats, mergeByMaterial, finalize } from './kit-merge.js'
