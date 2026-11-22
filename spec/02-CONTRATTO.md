# 02 · Contratto tecnico

Questo documento è vincolante per tutti gli agenti. Definisce strumenti, cartelle, chi possiede quali file e le interfacce tra i moduli. Un modulo può cambiare tutto ciò che è privato; **non può cambiare nomi, firme o significati scritti qui**.

## 1. Strumenti (già provati su questa macchina)

| Cosa | Versione | Uso |
|---|---|---|
| Node | 24 | build e test |
| `three` | **0.187.0** (esatta) | motore 3D; incluso nel file finale |
| `esbuild` | 0.28.2 | unisce i moduli in un solo script |
| `playwright-core` | 1.65.1 | test nel browser, con `chromium.launch({ channel: 'chrome', headless: true })` |

Prova eseguita dall'orchestratore: una scena Three.js con ombre e texture da canvas, unita da esbuild in un `index.html` di 540 KB, gira in Chrome headless su questo Mac (ANGLE Metal, Apple M1 Pro) senza errori.

Regole sugli strumenti:

- Nessun'altra dipendenza. Gli addon si importano da `three/addons/...` (per esempio `three/addons/utils/BufferGeometryUtils.js`) e finiscono nel bundle.
- **Prima di usare una API di Three.js, verificala nel sorgente installato**: `node_modules/three/src/` e `node_modules/three/examples/jsm/`. Fatti già verificati per la 0.187.0:
  - non esistono `useLegacyLights` né `physicallyCorrectLights`: le intensità delle luci sono sempre fisiche;
  - esistono `SRGBColorSpace`, `ACESFilmicToneMapping`, `PCFShadowMap`, `VSMShadowMap`, `THREE.Timer`, `RoundedBoxGeometry` (addon), `sheen` su `MeshPhysicalMaterial`, `renderer.shadowMap.autoUpdate` e `needsUpdate`;
  - **non usare `PCFSoftShadowMap`**: è stato rimosso, scrive un avviso in console e ripiega su `PCFShadowMap`, che in questa versione ha già il bordo morbido;
  - **non usare `THREE.Clock`**: è deprecata e scrive un avviso; usa `THREE.Timer` (`timer.update()` a ogni fotogramma, poi `timer.getDelta()`);
  - con `scene.environment` attiva, `material.envMapIntensity` vale solo se il materiale ha una propria `envMap`; altrimenti conta `scene.environmentIntensity`.
- Nessuna richiesta di rete a runtime: niente CDN, niente font remoti, niente immagini o audio esterni.

## 2. Comandi

| Comando | Cosa fa |
|---|---|
| `npm run build` | `node tools/build.mjs`: esbuild unisce `src/main.js` (formato `iife`, minificato, target `es2020`, `.json` come JSON, `.css` come testo) e inserisce il risultato in `src/index.template.html` al posto di `<!--BUNDLE-->`. Scrive `index.html` nella radice. Nel bundle ogni `</script` va scritto `<\/script`. |
| `npm run check:spec` | `python3 tools/genera_spec.py`: rigenera i JSON e ricontrolla geometria, arredo e percorso. Deve stampare solo `OK`. |
| `npm run test:unit` | `node tests/unit.mjs`: logica pura, senza browser. |
| `npm run check -- <file...>` | `node tools/build.mjs --check <file...>`: compila i file indicati senza scrivere nulla. Trova errori di sintassi e import mancanti, non nomi di funzione sbagliati: quelli emergono solo dalla build privata aperta nel browser. |
| `npm run build -- --out <file>` | Come `build`, ma scrive in `<file>` (per esempio `out/B/index.html`) e non tocca `index.html` della radice. È la **build privata** di ogni agente. |
| `npm run test:smoke` | `node tests/smoke.mjs`: apre `index.html` in Chrome headless ed esegue le asserzioni delle fasi 1, 2 e 3 presenti. `node tests/smoke.mjs <n>` esegue le fasi da 1 a `n`. Con `--html <file>` prova un'altra build. La fase 4 si esegue solo con `node tests/smoke.mjs 4` e non fa parte di `npm test`. |
| `npm test` | build, poi unit, poi smoke. |
| `npm run shots -- <serie>` | `node tests/shots.mjs <serie>`: salva PNG 1280×720 in `out/shots/<serie>/`. |

`out/`, `node_modules/` e i file di orchestrazione (`agenti/`, `workflows/`, `AVVIO.md`, `task_plan.md`, `notes.md`, `RAPPORTO-FASE-*.md`, `graphify-out/`, `.graphifyignore`, `spec/riferimenti/`, `spec/plan-overlay.png`) non vanno in git. Nei file tracciati non compaiono percorsi assoluti della macchina.

## 3. Cartelle e proprietà dei file

Ogni file ha **un solo proprietario**. Un agente scrive solo nei file che possiede. Se serve una modifica altrove, la chiede nel rapporto finale alla voce `requests`.

| Percorso | Proprietario | Contenuto |
|---|---|---|
| `package.json`, `tools/build.mjs`, `.gitignore`, `README.md` | S0 | strumenti |
| `src/index.template.html`, `src/main.js` | S0 | pagina e avvio |
| `src/core/context.js`, `events.js`, `log.js`, `debug.js` | S0 | contesto condiviso |
| `src/core/grid.js`, `src/core/grid-*.js`, `tests/unit.mjs` | S1 | griglia della pianta e test di logica |
| `src/core/quality.js` | Q (stub di S0) | qualità adattiva |
| `src/mat/` | A1 | materiali e superfici |
| `src/tex/index.js`, `rugs.js`, `tiles.js`, `glass.js`, `draw.js` | A2 | tappeti, piastrelle decorate, tessuto floreale, vetrata, dorsi dei libri |
| `src/tex/art.js`, `src/tex/art-*.js` | A2b (stub di S0) | quadri |
| `src/arch/shell.js`, `src/arch/common.js` | B | muri, pavimenti, soffitti, vano scala |
| `src/arch/openings.js`, `src/arch/details.js` | C | serramenti, battiscopa, cornici |
| `src/arch/exterior.js`, `src/arch/city.js` | D | terrazza, ringhiere, città |
| `src/nav/` | H | prima persona, vista dall'alto |
| `src/furn/kit.js`, `src/furn/registry.js` | E0 | attrezzi e registro degli arredi |
| `src/furn/seating.js`, `src/furn/tables.js` | E1 | sedute e tavoli |
| `src/furn/beds.js`, `storage.js`, `bath.js` | E2 | letti, contenitori, bagno |
| `src/furn/kitchen.js`, `outdoor.js`, `plants.js`, `piano.js` | E3 | cucina, esterni, piante, pianoforte |
| `src/furn/lamps.js`, `decor.js` | E4 | luci, tende, quadri, specchi, tappeti |
| `src/furn/props.js` | E5 | oggetti d'appoggio |
| `src/furn/layout.js` | F | allestimento e cambio di stile |
| `src/light/` | G | sole, cielo, lampade |
| `src/tour/` | I | tour guidato |
| `src/audio/` | J | musica |
| `src/ui/` | K | interfaccia |
| `tests/smoke.mjs`, `tests/shots.mjs`, `tests/series.mjs`, `tests/lib.mjs`, `tests/phases/fase<n>.mjs` | S0 crea, i collaudatori estendono | test nel browser: `smoke.mjs` è solo il lanciatore, le asserzioni di ogni fase stanno in `tests/phases/` |
| `spec/`, `agenti/`, `workflows/`, `tools/genera_spec.py`, `tools/specgen/` | orchestratore | **sola lettura per tutti** |

Regole sui file:

- Massimo 400 righe per file. Oltre, si divide: chi possiede `nome.js` può creare accanto file ausiliari `nome-*.js` (per esempio `seating-sofa.js`, `props-table.js`), importati solo dal proprio file.
- Moduli ES2020, `const` e `let`, nessuna variabile globale tranne `window.CASA`.
- Ogni funzione esportata ha un commento JSDoc con parametri e ritorno.
- Identificatori in inglese, commenti in italiano e brevi.
- Niente `console.log`: si usa `ctx.log.debug|info|warn|error`. `debug` e `info` scrivono solo se l'indirizzo contiene `?debug`.
- Gli errori si catturano dove si può rimediare, con il tipo specifico; mai un `catch` vuoto.
- Nessun numero magico di progetto nel codice: misure, colori, testi e tempi vengono dai JSON di `spec/`.

## 4. Coordinate e unità

- Metri. `+x` corre lungo via Dante verso i monti, `-x` verso il Politeama. `+z` va verso via Dante (la facciata con la terrazza), `-z` verso il retro (cucina, camere, balconi al sole). `y` in alto. Pavimento a `y = 0`, soffitto a `y = plan.meta.ceilingHeight` (3.00).
- **Le direzioni si indicano sempre con gli assi, mai con i punti cardinali.** La facciata su via Dante guarda a nord-nord-ovest e il retro a sud-sud-est (`plan.meta.orientation`): «sud» non è `+z`.
- Rettangolo in pianta: `[x0, z0, x1, z1]`.
- `rot` in gradi attorno a Y: `rotation.y = rot * Math.PI / 180`. Con `rot = 0` il fronte dell'oggetto guarda `+z`; con 90 guarda `+x`.
- **Posa della camera**: `yaw` e `pitch` in radianti. Con `yaw = 0` si guarda verso `+z`; `yaw` positivo ruota verso `+x`; la direzione di sguardo in pianta è `(sin(yaw), cos(yaw))`. `pitch` positivo guarda in alto. Sulla camera: `rotation.order = 'YXZ'`, `rotation.y = yaw + Math.PI`, `rotation.x = pitch`. Da un punto `p` a un bersaglio `t`: `yaw = atan2(t.x - p.x, t.z - p.z)`, `pitch = atan2(t.y - p.y, distanza in pianta)`.
- Colori esadecimali in sRGB. `renderer.outputColorSpace = SRGBColorSpace`; le texture di colore hanno `colorSpace = SRGBColorSpace`.

## 5. Il contesto `ctx`

`src/core/context.js` crea un solo oggetto e lo passa a ogni modulo.

```js
ctx = {
  THREE,                       // namespace three
  renderer, scene, camera,     // WebGLRenderer, Scene, PerspectiveCamera (fov 70, near 0.05, far 1500: il fondale dei monti sta a 900 m)
  canvas,                      // elemento <canvas id="view">
  plan, furnishing, tour, styles, lighting,   // i JSON di spec/, congelati con Object.freeze profondo
  currentStyle,                // funzione: restituisce styles.styles[state.style], cioè l'oggetto dello stile corrente
  grid,                        // vedi sezione 6
  events,                      // on(name, fn) -> funzione per disiscriversi; emit(name, payload)
  log,                         // debug, info, warn, error
  state: {                     // unico stato condiviso; si legge liberamente, si scrive solo tramite ctx.api
    ready: false, style: 'liberty', hour: 10, hourTarget: 10, night: 0,
    view: 'fps', tour: 'idle', tourStop: -1, music: false, quality: 'high', room: null, timeScale: 1
  },
  groups: {                    // THREE.Group già aggiunti alla scena da S0
    architecture, ceilings, openings, exterior, city, furniture, lights, sky
  },
  registry: {
    colliders: [],             // F: [{ id, rect:[x0,z0,x1,z1] }] arredi che bloccano il passo
    lamps: [],                 // F: [{ id, room, type, prio, position:[x,y,z] }]
    nightMaterials: [],        // D, C: materiali la cui emissiveIntensity segue state.night
    glass: [],                 // C: materiali dei vetri
    updaters: []               // funzioni (dt, t) chiamate a ogni fotogramma, nell'ordine di inserimento
  },
  api: {},                     // funzioni pubbliche, vedi sezione 8
  debug: { errors: [] },       // creato in context.js prima delle init; ogni modulo vi aggiunge le proprie voci (sezione 9)
  nav: {}, mat: {}, tex: {}, furn: {}   // riempiti dai moduli proprietari
}
```

`groups.ceilings` contiene **tutto ciò che va nascosto nella vista dall'alto**: soffitti, cornici, travi, rosoni, soffitti della terrazza e piano superiore dell'edificio.

**Come si legge uno stile.** Il file `styles.json` ha le chiavi `default`, `order`, `fixed`, `exterior`, `styles`. I tre stili stanno in `ctx.styles.styles.liberty`, `.moderno`, `.scandinavo`. Nei documenti la scrittura `styles.<stile>.x` significa sempre **`ctx.currentStyle().x`**; `styles.exterior` e `styles.fixed` sono `ctx.styles.exterior` e `ctx.styles.fixed`.

### Ciclo di vita di un modulo

Ogni modulo esporta `init(ctx)`, sincrona o `async`. `main.js` le chiama **in quest'ordine** e aspetta ognuna:

`core/quality` → `mat` → `tex` → `arch/shell` → `arch/common` → `arch/openings` → `arch/details` → `arch/exterior` → `arch/city` → `furn/registry` (che importa i file degli arredi) → `furn/layout` → `light` → `nav` → `tour` → `audio` → `ui`

Poi imposta `state.ready = true`, emette `ready` e avvia il ciclo con `renderer.setAnimationLoop`. A ogni fotogramma: `timer.update()`, `dt = min(timer.getDelta(), 0.1) * state.timeScale`, poi tutti gli `updaters`, poi `renderer.render(scene, camera)`. `main.js` non usa `await` al livello più esterno: l'avvio sta dentro una funzione `async`.

Un modulo che vuole lavorare a ogni fotogramma fa `ctx.registry.updaters.push((dt, t) => { ... })`.

Se una `init` lancia un errore, `main.js` lo registra in `CASA.debug.errors`, mostra un riquadro leggibile sopra la scena e prosegue con il modulo successivo.

## 6. La griglia `ctx.grid` (S1)

La pianta è fatta solo di rettangoli allineati agli assi. La griglia la divide in celle usando tutte le coordinate distinte; ogni cella ha un tipo. Da qui derivano muri, collisioni e minimappa, senza operazioni booleane.

```js
import { buildGrid, K } from './core/grid.js'
K = { OUTSIDE: 0, WALL: 1, ROOM: 2, OPENING: 3, OUTDOOR: 4, SOLID: 5, BUILTIN: 6, STAIRS: 7, CONTEXT: 8 }

grid.xs, grid.zs          // Float64Array ordinati; nx = xs.length - 1, nz = zs.length - 1
grid.kind                 // Uint8Array(nx * nz), indice = j * nx + i
grid.ref                  // Int16Array(nx * nz): indice in plan.rooms, plan.openings, plan.outdoor, plan.solids, plan.builtins, plan.context.blocks secondo il tipo; -1 se non serve
grid.cellAt(x, z)         // indice di cella, oppure -1 fuori griglia
grid.kindAt(x, z)         // K.*
grid.spaceAt(x, z)        // { type: 'room' | 'outdoor', id, index } oppure null
grid.openingAt(x, z)      // voce di plan.openings oppure null
grid.isWalkable(x, z)     // true in ROOM, OUTDOOR e OPENING con walk = true
grid.canStand(x, z, r)    // true se il centro e 8 punti sul cerchio di raggio r sono calpestabili
grid.solidSpans(cell)     // intervalli pieni in altezza: [[y0, y1], ...]
grid.faces()              // facce verticali da disegnare, vedi sotto
grid.caps()               // facce orizzontali dei pieni, vedi sotto
grid.roomEdges(spaceId, y)// segmenti del perimetro dello spazio che toccano un pieno alla quota y
grid.rectsOf(spaceId)     // rettangoli della stanza o dello spazio esterno
```

Regole esatte, identiche a quelle usate dall'orchestratore per calcolare `spec/oracle.json`:

- **Assi**: `xs` e `zs` sono i valori distinti e ordinati di tutte le x e z dei rettangoli di `footprint`, `rooms[].rects`, `outdoor[].rects`, `openings[].rect`, `solids[].rect`, `builtins[].rect`, `stairs.rect`, `context.blocks[].rects`, arrotondati a 3 decimali.
- **Tipo di cella**, valutato nel centro, con questa priorità: `solids` → `openings` → `builtins` → `rooms` → `stairs.rect` → `outdoor` → dentro `footprint` (WALL) → `context.blocks` → OUTSIDE.
- **Intervalli pieni**: WALL, BUILTIN, CONTEXT: `[[0, H]]`. SOLID: `[[0, h]]`. OPENING: `[[head, H]]` se `sill = 0`, altrimenti `[[0, sill], [head, H]]`. Tutti gli altri: nessuno. Per la griglia ogni apertura è un rettangolo fino a `head`: le aperture con `shape = "arco"` ricevono da C il riempimento tra l'imposta (`spring`) e `head`. Le travi di `plan.beams` non entrano nella griglia: le disegna B.
- **`faces()`**: per ogni coppia di celle adiacenti, la parte piena dell'una che non è piena nell'altra è una faccia visibile dal lato dell'altra. Ogni faccia è `{ x0, z0, x1, z1, y0, y1, nx, nz, solid: { kind, ref }, air: { kind, ref } }`, dove `(nx, nz)` è la normale unitaria che punta verso il lato `air`. Le facce contigue, complanari, con stessi `y0`, `y1`, `solid` e `air` vanno fuse in una sola. Anche il bordo della griglia conta come aria di tipo OUTSIDE.
- **`caps()`**: per ogni cella piena, le facce orizzontali: `{ rect: [x0, z0, x1, z1], y, up: true | false, solid: { kind, ref } }`. `up = true` è un piano superiore (sommità dei muri a `y = H`, davanzali a `y = sill`); `up = false` è il sotto di un architrave a `y = head`. Rettangoli contigui con gli stessi dati vanno fusi lungo x.
- **`roomEdges(id, y)`**: `[{ x0, z0, x1, z1, nx, nz }]` con la normale verso l'interno dello spazio; serve a battiscopa (`y = 0.05`) e cornici (`y = 2.95`).

`tests/unit.mjs` confronta la griglia con `spec/oracle.json`: numero di celle per tipo, superfici, `wallRun` e `openRun` di ogni spazio devono coincidere entro 0,01.

## 7. Eventi

| Evento | Chi lo emette | Dati | Chi di solito ascolta |
|---|---|---|---|
| `ready` | main | nessuno | ui |
| `style:changed` | `api.setStyle` | `{ style }` | mat, furn/layout, arch/details, ui |
| `furnished` | furn/layout | `{ style, count }` | light, nav, debug |
| `time:changed` | light | `{ hour, night }` a ogni variazione visibile | ui |
| `view:changed` | nav | `{ view }`, a transizione finita e con `groups.ceilings.visible` già al valore definitivo; emesso a ogni cambio di `state.view`, anche senza animazione e quando è `teleport` a cambiare vista | ui, tour, light |
| `room:changed` | nav | `{ room }` id dello spazio o `null` | ui |
| `tour:state` | tour | `{ state, stopIndex, stopCount, stop }` con `state` tra `running`, `paused`, `finale`, `idle`; nel finale `stopIndex` vale `stopCount`. `stop` è `{ room, title, highlight, areaText }` durante una sosta, `{ title, highlight, areaText: '' }` nel finale, `null` in cammino e a tour fermo | ui, nav |
| `nav:userinput` | nav | `{ kind }` quando l'utente preme un tasto di movimento mentre i comandi sono bloccati | tour |
| `music:changed` | audio | `{ on }` | ui |
| `quality:changed` | core/quality | `{ quality }` | light, renderer |

Un ascoltatore non deve mai lanciare eccezioni verso chi emette: `events.emit` cattura l'errore, lo registra e passa all'ascoltatore successivo.

## 8. API pubblica `ctx.api`, esposta come `window.CASA.api`

| Funzione | Proprietario | Comportamento |
|---|---|---|
| `setStyle(id)` | S0 | Valida `id` su `styles.order`. Se lo stile è già quello corrente, restituisce una Promise già risolta. Altrimenti aggiorna `state.style`, emette `style:changed` e restituisce una Promise risolta al successivo `furnished`. |
| `setTime(hour, { immediate = false })` | G | Limita `hour` a `lighting.range`; fissa `state.hourTarget`. Se `immediate`, anche `state.hour` salta subito. |
| `setView(view, { animate = true, duration = 1.6 })` | H | `view` è `'fps'` o `'dollhouse'`; esiste anche `'top'` (zenitale, senza animazione), usata solo dagli scatti di prova. Restituisce una Promise risolta a transizione finita. |
| `teleport(target)` | H | `target` è l'`id` di una voce di `plan.rooms` o `plan.outdoor` (si arriva nel suo punto `spawn`, con lo sguardo invariato), oppure `{ x, z, yaw, pitch }` con `yaw` e `pitch` facoltativi in radianti. Se il punto non è libero si usa il punto libero più vicino **dentro lo stesso spazio**. Passa alla vista `fps`. |
| `getPose()` | H | `{ x, y, z, yaw, pitch }` della camera. |
| `startTour()`, `stopTour()`, `pauseTour()`, `resumeTour()`, `skipStop()` | I | Vedi `agenti/I-tour.md`. |
| `setMusic(on)`, `toggleMusic()` | J | Accende o spegne la musica con dissolvenza. Restituiscono una Promise risolta quando il contesto audio è avviato o sospeso. |
| `musicPreference()` | J | `true`, `false` oppure `null`: scelta salvata dall'utente, se esiste. |
| `setQuality(level)` | Q | Forza `'high' | 'medium' | 'low' | 'auto'`. |

Interfacce interne tra moduli:

| Interfaccia | Proprietario | Uso |
|---|---|---|
| `ctx.mat.get(token)` | A1 | Materiale condiviso per un token di `styles.<stile>.tokens` (per esempio `'wood.primary'`). Cambia con lo stile; non va clonato né modificato da chi lo riceve. |
| `ctx.mat.room(roomId)` | A1 | `{ wall, floor, ceiling, wainscot, skirting }`: materiali della stanza, **aggiornati sul posto** al cambio di stile, così l'architettura non va ricostruita. `wainscot` è `null` dove non previsto. |
| `ctx.mat.fixed(name)` | A1 | Colori e finiture secondo la tabella `styles.fixed`. Materiali che non dipendono dalla stanza: `facade`, `klinker`, `pillar`, `soffit`, `wallcap`, `common`, `context`, `trim`, `door`, `railing`, `handrail`, `verandaFrame`, `builtin`, `sill`, `glass`, `glassFrosted`, `outdoorFloor:<id>`. I colori delle parti condominiali vengono da `styles.exterior` e non cambiano con lo stile. |
| `ctx.tex.rug(pattern, aspect)`, `ctx.tex.art(artId, aspect)` | A2, A2b | `THREE.CanvasTexture` per lo stile corrente. `aspect` = larghezza diviso altezza del riquadro da coprire (lato X locale diviso lato Z per i tappeti, larghezza diviso altezza per i quadri): il disegno viene composto in quel rapporto, mai stirato. Cache per nome e rapporto arrotondato a 0,1. L'asse `u` del canvas corre lungo la X locale dell'oggetto. |
| `ctx.tex.tile(name)`, `ctx.tex.stainedGlass()`, `ctx.tex.bookSpines()` | A2 | `THREE.CanvasTexture` per lo stile corrente, con cache. |
| `ctx.furn.register(type, builder)` | E0 | `builder(item, env)` restituisce un `THREE.Object3D` con origine al centro dell'ingombro a pavimento, fronte verso `+z`, dimensioni `item.size`. `env = { ctx, style, shape, decor, mat, tex, kit }`. |
| `ctx.furn.create(item)` | E0 | Costruisce l'oggetto; se il tipo non è registrato restituisce un parallelepipedo neutro delle dimensioni giuste e segna `userData.placeholder = true`. |
| `ctx.furn.prop(name, opts)` | E0 (registro), E5 (costruttori) | Oggetto d'appoggio con origine sul piano d'appoggio. `opts = { item, top: { y, w, d }, index, count }`: il mobile che lo regge, il suo piano, il numero della copia (da 0) e la quantità. Ogni chiamata costruisce un solo oggetto; se il nome non è registrato restituisce un cubetto grigio con `userData.placeholder = true`. L'`env` lo costruisce il registro. |
| `ctx.nav.setPose(pose)`, `ctx.nav.lock(on)` | H | Usate dal tour: fissano la camera e bloccano i comandi dell'utente. |
| `ctx.nav.orbitBy(gradi, secondi)` | H | Nella vista dall'alto ruota la camera attorno al bersaglio; restituisce una Promise. |
| Riflessi | G | G è l'unico che assegna `material.envMap` e `envMapIntensity` (pavimenti lucidi e vetri). A1 e C non li toccano. |

## 9. `window.CASA.debug` (S0, con contributi)

Serve ai test. Ogni modulo aggiunge le proprie voci a `ctx.debug`.

| Voce | Proprietario | Ritorno |
|---|---|---|
| `errors` | S0 | elenco degli errori catturati |
| `stats()` | S0 | `{ fps, calls, triangles, geometries, textures, pointLights }` da `renderer.info` e dalla scena |
| `settle(frames = 30)` | S0 | Promise risolta dopo `frames` fotogrammi |
| `ctx` | S0 | il contesto, solo con `?debug` |
| `step(input, seconds)` | H | Simula i comandi `{ forward, right }` da -1 a 1 per `seconds` secondi di tempo simulato e restituisce la posa finale |
| `furniture()` | F | `[{ id, type, room, placeholder, bbox: [x0, y0, z0, x1, y1, z1], parts, props: [{ name, count, placeholder }] }]`: `bbox` è del solo mobile, senza oggetti d'appoggio; `parts` è il numero di mesh prima della fusione; `props[].placeholder` è vero se l'oggetto d'appoggio non ha un costruttore |
| `quality()`, `qualityFeed(ms)` | Q | stato della qualità; `qualityFeed` inserisce un tempo di fotogramma finto e fa avanzare di `ms` il tempo del misuratore |
| `lights()` | G | `{ sun: { intensity, elevation, castShadow }, hemi, lampOn, realLights, shadeEmissive, exposure, night }` |
| `tourLog()` | I | sequenza delle soste raggiunte con il tempo |
| `minimapPx(x, z)` | K | `{ x, y }`: coordinate nella finestra (`clientX`, `clientY`) del punto pianta `(x, z)` sulla minimappa |
| `audio()` | J | `{ state, gain, voices, scheduledNotes }`; prima della prima accensione `state` vale `'none'` e gli altri campi 0 |

## 10. Limiti di prestazione

Misurati con `debug.stats()` nel punto peggiore.

| Voce | Limite |
|---|---|
| Chiamate di disegno, prima persona | 650 |
| Chiamate di disegno, vista dall'alto | 900 |
| Triangoli in scena | 800 000 |
| Texture | 80, nessuna oltre 1024 × 1024, tranne il fondale dei monti (4096 × 512, una sola) |
| Luci puntiformi accese | 12 alta, 6 media, 3 bassa; nessuna proietta ombre |
| Luci con ombra | 1 (sole o luna) |
| `index.html` | 2,0 MB |
| Tempo fino a `ready` in Chrome headless su questo Mac | 6 s |
| Rapporto pixel | `min(devicePixelRatio, 1.5)` alta, 1.25 media, 1.0 bassa |

Come restare nei limiti:

- Geometria statica fusa per materiale (`mergeGeometries`), una mesh per materiale per stanza.
- **Ombre aggiornate solo quando serve**: la scena è ferma, quindi `renderer.shadowMap.autoUpdate = false` e `needsUpdate = true` solo quando il sole si sposta, dopo `furnished`, dopo `quality:changed` e dopo `view:changed` (i soffitti nascosti nella vista dall'alto non proiettano ombra: la mappa va rifatta a ogni cambio di vista). Lo gestisce G; nelle fasi 1 e 2 lo fa il segnaposto di S0. Oggetti d'appoggio, quadri, tende e foglie non proiettano ombra.
- Oggetti ripetuti (balaustre, libri, coperti, foglie) con `InstancedMesh` o fusi.
- Materiali condivisi tramite `ctx.mat.get`: mai un materiale nuovo per ogni oggetto. Dove serve un disegno (tappeti, quadri, piastrelle) si usa `kit.texMat(texture)`, che ne tiene uno solo per texture.
- Texture generate una volta e messe in cache.
- Al cambio di stile: `dispose()` di geometrie e texture non più usate.

## 11. Rapporto finale di ogni agente

Ogni agente chiude con un oggetto con questi campi (lo schema è imposto dal workflow):

```json
{
  "status": "done | partial | blocked",
  "filesChanged": ["src/..."],
  "checks": [{ "cmd": "npm run check -- src/arch/shell.js", "ok": true, "note": "..." }],
  "issues": ["cosa non funziona o non è stato fatto, con il messaggio d'errore"],
  "requests": ["modifiche che servono in file di altri"]
}
```

`status = "done"` solo se, **dopo** l'ultima modifica, `npm run check` sui propri file passa, la build privata (`npm run build -- --out out/<sigla>/index.html`) riesce e i controlli elencati nel foglio dell'agente sono stati eseguiti. La build della radice non conta: mentre altri agenti lavorano in parallelo può fallire per un file non tuo, che non devi correggere. Un controllo fallito si riporta com'è, con l'output. Eccezione: S1 lavora prima che esista `package.json` e segue la regola di chiusura scritta nel suo foglio.
