# 04 · Collaudi

Ogni fase si chiude con un **cancello**: un collaudatore esegue le asserzioni elencate qui, guarda gli screenshot e dichiara `pass` vero o falso. Se è falso, un riparatore corregge e il collaudatore ripete. Le asserzioni hanno un codice: il collaudatore le riporta una per una.

## Come si esegue

- `tests/smoke.mjs` è il lanciatore; le asserzioni stanno in `tests/phases/fase1.mjs`, `fase2.mjs`, `fase3.mjs`, `fase4.mjs`, una funzione per codice. `node tests/smoke.mjs 1` esegue la fase 1; `node tests/smoke.mjs 3` oppure senza argomenti esegue le fasi 1, 2 e 3; `node tests/smoke.mjs 4` esegue solo la fase 4. Con `--html <file>` si prova una build diversa da `index.html`. L'uscita è una riga per asserzione (`T1.3 OK` oppure `T1.3 FALLITO: motivo`) e codice di uscita 1 se ne fallisce almeno una.
- La pagina si apre come `file://.../index.html?debug` con `chromium.launch({ channel: 'chrome', headless: true })`, finestra 1280 × 720.
- Ogni test raccoglie i messaggi di console di tipo `error` e gli errori di pagina: devono essere zero, in ogni fase. Gli avvisi (`warning`) si riportano nel rapporto ma non fanno fallire.
- `tests/lib.mjs` contiene le funzioni comuni: apertura della pagina, attesa di `CASA.state.ready`, `shot(nome)`, luminanza media di un PNG.
- Il collaudatore **scrive le asserzioni della propria fase** seguendo questo documento, senza indebolirle. Se un'asserzione è impossibile da verificare così com'è, lo dichiara nel rapporto: non la toglie.

## Fase 1 · Involucro

| Codice | Asserzione | Requisito |
|---|---|---|
| T1.1 | `npm run build` termina con codice 0; esiste `index.html`; pesa meno di 2,0 MB; durante il caricamento il browser non fa richieste di rete oltre al documento. Con `--html <file>` la build non viene rilanciata: le stesse verifiche si fanno su quel file. | R03, R46 |
| T1.2 | `npm run test:unit` passa: la griglia riproduce `spec/oracle.json` (celle per tipo, superfici, `wallRun`, `openRun`); da `pianerottolo` si raggiunge ogni spazio; ogni punto di `tour.path`, campionato ogni 5 cm, è calpestabile. | R04 |
| T1.3 | `CASA.state.ready` diventa vero entro 15 s; `CASA.debug.errors` è vuoto; nessun errore in console. | — |
| T1.4 | All'avvio la posa è sul pianerottolo, a `y = 1,62`, rivolta verso `+z` (`yaw = 0`). Dopo `api.teleport('salotto')`, `grid.spaceAt` della posa dà `salotto`. | R08 |
| T1.5 | Collisioni: da `teleport({ x: 12.6, z: 10.6, yaw: Math.PI })` (sguardo verso `-z`), `debug.step({ forward: 1 }, 8)` si ferma con `z` tra 8,75 e 8,95 (contro la spalla della nicchia, il cui filo è a `z = 8,60`: con raggio 0,28 l'arresto teorico è a 8,88 e un passo di simulazione vale 2,7 cm; né attraversa il muro né si ferma prima; su quella linea non ci sono arredi, quindi la prova vale in tutte le fasi). Da `{ x: 17.6, z: 7.6, yaw: 0 }` (sguardo verso `+z`), `debug.step({ forward: 1 }, 3)` finisce in `salotto` (attraversa l'arco). | R08, R38 |
| T1.6 | `api.setView('dollhouse', { animate: false })`: `groups.ceilings.visible` è falso e la camera è sopra `y = 8`. Tornando a `'fps'`: soffitti visibili e posa uguale a quella di partenza. | R09 |
| T1.7 | `debug.stats()` dal pianerottolo e dalla vista dall'alto: chiamate di disegno non oltre 400, triangoli non oltre 400 000 (senza arredi). | R23 |
| T1.8 | Serie di screenshot `fase1` (vedi sotto): nessuna immagine uniforme (deviazione standard della luminanza sopra 12 su 255). | R04, R05 |

Controllo a occhio sugli screenshot di fase 1, da riportare nel rapporto: i muri sono chiusi senza buchi; le aperture sono dove indica `plan-overlay.png`; i tre archi (ingresso-salotto e i due tra i saloni) sono davvero ad arco; ogni stanza ha il suo pavimento e il suo colore; dalla terrazza si vedono ringhiera a bacchette, pilastri bianchi, soffitto, parete in klinker; guardando verso `+x` la via finisce contro i monti, verso `-x` c'è Palazzo Ziino rosa sull'altro lato; dal balcone della cucina si vedono tetti in coppi; il giardino d'inverno è chiuso da una vetrata; nella vista dall'alto la pianta coincide con `plan-overlay.png`. Confronta gli scatti della terrazza con le foto in `spec/riferimenti/foto/`: deve riconoscersi lo stesso luogo. Nello scatto verso il basso si vedono i piani sottostanti con le file di balconi e, al piano terra, le vetrine con la fascia rossa senza scritte (l'appartamento sta al settimo piano, sopra un negozio).

## Fase 2 · Arredo

| Codice | Asserzione | Requisito |
|---|---|---|
| T2.1 | `debug.furniture()` contiene tutti e soli gli oggetti di `furnishing.items` previsti per lo stile corrente: variante attiva, meno `styleOverrides.<stile>.omit`. | R06, R10 |
| T2.2 | Nessun oggetto ha `placeholder` vero e nessuna voce dei suoi `props` ha `placeholder` vero, in nessuno dei tre stili. | R06, R12, R14 |
| T2.3 | Per ogni oggetto a pavimento, l'impronta in pianta di `bbox` sta dentro `item.rect` allargato di 8 cm (25 cm per `bed_canopy`, `plant`, `planter`, `swing_bench`, `grand_piano`); nessun oggetto supera in altezza il soffitto. Per sedute, tavoli, comodini, letti senza baldacchino, cassettoni e credenze l'altezza non supera `size[2]` più 10 cm. Per i sanitari (`wc`, `bidet`, vasche, mobili lavabo, `shower_walkin`) `size[2]` è il corpo, senza cassetta, rubinetti e barre a parete: lì l'altezza totale non supera 1,20 m (2,20 m per `shower_walkin`). | R04 |
| T2.4 | `registry.colliders` contiene esattamente gli oggetti con `collide` vero dello stile corrente. Il percorso del tour, campionato ogni 5 cm, resta ad almeno 25 cm da ogni collider. | R25 |
| T2.5 | `api.setStyle` su ognuno dei tre stili: nessun errore; il colore della parete del salotto è diverso nei tre stili; il numero di oggetti rispetta gli `omit`. | R16 |
| T2.6 | Dopo sei cambi di stile consecutivi, `renderer.info.memory.geometries` e `textures` non crescono più del 5 % rispetto al valore dopo il primo giro completo. | R23 |
| T2.7 | `debug.stats()` nei punti di vista di `tour.path` con sosta: chiamate non oltre 650; nella vista dall'alto non oltre 900; triangoli non oltre 800 000. | R23 |
| T2.8 | Da `debug.furniture()`: `pra_tavolo` ha tra i `props` `table_setting` con `count` 8 e `ter_tavolo` con `count` 4; in stile Liberty `c2_letto` e `cb_letto` hanno `parts` almeno 12 (struttura più gli otto pezzi di biancheria: materasso, lenzuolo, copriletto, due guanciali, due cuscini, plaid); tra i `props` degli arredi della cucina ci sono `copper_pots`, `fruit_bowl_lemons`, `moka_cups`. | R12, R13, R14 |

Controllo a occhio, serie `fase2`: ogni mobile si riconosce; lo stile Liberty si distingue dagli altri due a colpo d'occhio (curve, noce, ottone, velluti contro volumi squadrati o legni chiari); niente oggetti sospesi, compenetrati o fuori scala; i tappeti stanno sotto i mobili giusti; il baldacchino della camera baronale è il pezzo che domina la stanza; **i letti sono rifatti** (lenzuolo risvoltato, copriletto, guanciali, cuscini e plaid si vedono); **la tavola ha otto coperti completi** davanti alle otto sedie; in cucina si vedono pentole di rame, limoni e tazzine; il legno dei mobili ha la venatura, i piani in pietra le loro vene, i velluti non hanno riflessi netti; le pareti Liberty hanno la velatura «a nuvola» delle Terre Fiorentine, opaca e senza ripetizioni evidenti; ogni stanza principale ha tappeto, quadro, pianta e lampada.

## Fase 3 · Esperienza

| Codice | Asserzione | Requisito |
|---|---|---|
| T3.1 | `api.setTime(h, { immediate: true })` per `h` da 6 a 23 a passi di 0,5: nessun errore; `state.night` segue `lighting.keyframes`. | R17 |
| T3.2 | Alle 12: `debug.lights().lampOn` è 0 e nessuna luce reale è accesa. Alle 22: `lampOn` è 1, le luci reali accese sono tra 3 e 12, `shadeEmissive` è sopra 1. | R19 |
| T3.3 | Da ore 10, `api.setTime(19)` senza `immediate`: dopo 0,2 s `state.hour` è ancora sotto 14; dopo 4 s è tra 18,9 e 19,1. | R22 |
| T3.4 | Luminanza media dello screenshot `salotto`: a mezzogiorno tra 70 e 190 (luce diffusa: il salotto non prende sole diretto di giorno); al tramonto (18,6) tra 60 e 170 con rapporto rosso/blu medio sopra 1,15 (qui il sole entra dalla terrazza); di notte (22) tra 25 e 110. Screenshot `cucina` alle 10: tra 90 e 210. Zona di sole diretto: in `camera2` alle 8 almeno 0,25 m² di pavimento al sole, misurati con raggi dal pavimento verso il sole che contano come ostacolo solo le mesh con `castShadow` (i vetri non fanno ombra). In cucina la macchia è piccola per geometria: il muro della lavanderia e la soletta del balcone coperto la limitano a circa 0,15 m². | R07, R18, R19 |
| T3.5 | Il sole proietta ombre: `sun.castShadow` vero di giorno, `renderer.shadowMap.enabled` vero, tipo `PCFShadowMap` o `VSMShadowMap`. I pavimenti di `ingresso`, `corridoio` e `bagno_baronale` in stile Liberty hanno roughness non oltre 0,3 e `material.envMap` non nulla; i vetri sono registrati in `registry.glass` e hanno `envMap` non nulla. | R20, R21 |
| T3.6 | Tour con `state.timeScale = 8`: `api.startTour()` produce eventi `tour:state` con le soste nell'ordine di `tour.path`, tutte; durante il percorso, campionando ogni 100 ms reali, la posa è sempre calpestabile; alla fine `state.view` è `'dollhouse'` e `state.tour` è `'idle'`. Luce: a ogni evento di sosta con `hour` non nullo in `tour.json`, `state.hourTarget` è uguale a quell'`hour` (±0,01) e lo resta fino alla fine della sosta; alla sosta `terrazza` vale 18,6; nello stato `finale` vale `tour.finale.hour`. | R25, R29, R43, R51 |
| T3.7 | Durante una sosta `[data-testid=tour-card]` è visibile e contiene il titolo, la superficie con la virgola e una cifra decimale («2,7 m²», «32,7 m²») uguale a `plan`, e la frase di `tour.json`. | R26 |
| T3.8 | `tour-pause` ferma il tempo del tour; `tour-skip` passa alla sosta successiva; `tour-exit` e qualunque tasto di movimento riportano a `state.tour = 'idle'` e ridanno i comandi. | R43 |
| T3.9 | Dopo un clic sulla pagina, `api.setMusic(true)`: `debug.audio().state` è `'running'` e `gain` sopra 0,05 entro 4 s; `api.setMusic(false)`: `gain` sotto 0,005 entro 1,5 s. Nessuna richiesta di rete. | R27, R28 |
| T3.10 | Esistono e rispondono al clic: `btn-tour`, `btn-view`, `style-liberty`, `style-moderno`, `style-scandinavo`, `slider-time`, `btn-music`, `btn-help`, `splash-tour`, `splash-enter`, `minimap`. Ogni clic cambia `CASA.state` come previsto; dopo `splash-enter` e dopo `splash-tour`, senza preferenza salvata, `state.music` è vero. | R09, R16, R17, R24, R28 |
| T3.11 | Tasti: `M` cambia vista, `T` avvia e ferma il tour, `1` `2` `3` cambiano stile, `N` cambia la musica, `H` apre i comandi, `Esc` li chiude. | R38, R47 |
| T3.12 | Senza blocco del puntatore, trascinare sulla scena di 200 px in orizzontale cambia `yaw` di almeno 0,3 radianti. A 390 × 844 con touch emulato `[data-testid=joystick]` è visibile; `btn-tour`, `btn-view` e `btn-music` sono visibili e alti almeno 44 px; nessuna barra di scorrimento orizzontale. | R41 |
| T3.13 | `api.setQuality('low')`: ombre spente o mappa da 1024 in giù, luci reali non oltre 3, rapporto pixel 1. `'auto'` torna a decidere da solo. | R44 |
| T3.14 | Vista dall'alto: doppio clic sul punto dello schermo in cui si proietta il punto a terra `spawn` della cucina (`plan.rooms.find(r => r.id === 'cucina').spawn`, a `y = 0`) porta in `cucina` in prima persona. Dopo essere tornati nel salotto, un clic sulla minimappa nel punto `CASA.debug.minimapPx(x, z)` dello stesso `spawn`: uguale. | R42 |

Controllo a occhio, serie `fase3`: al mattino (ore 8) il sole entra dalle finestre sul retro e disegna rettangoli di luce in camera da letto e, più piccoli, in cucina (le due portefinestre danno sul balcone coperto: a mezzogiorno la soletta ferma il sole ed è giusto che la macchia sparisca); al tramonto entra basso dalla terrazza nei tre saloni e si vede il disco del sole verso `+x`, sopra i monti; al tramonto la scena è dorata e non arancione piatto; di notte le stanze sono leggibili, calde, senza zone nere e senza bianchi bruciati; ombre con bordo morbido; riflesso visibile sul marmo dell'ingresso e sui vetri; l'interfaccia non copre il centro della scena ed è leggibile sia di giorno sia di notte; la schermata iniziale mostra il titolo «Attico Liberty», la riga «196 m² interni · 66 m² …», i due pulsanti e la nota «Proposta d'arredo. Misure indicative ricavate dalla planimetria catastale.».

## Fase 4 · Collaudo finale

Quattro revisori indipendenti, ognuno con una lente diversa, poi riparazioni e cancello finale.

| Revisore | Cosa controlla | Uscita |
|---|---|---|
| R1 Requisiti | Per ogni requisito da R03 a R51: dove è realizzato e con quale prova (asserzione, screenshot, riga di codice). | Tabella requisito, esito, prova. |
| R2 Qualità visiva | Serie `finale` di screenshot: difetti visibili stanza per stanza e stile per stile. | Elenco difetti con file, stanza, gravità. |
| R3 Prestazioni e robustezza | Limiti della sezione 10 del contratto; cambio di stile e di ora ripetuti; tour completo due volte di fila; ridimensionamento della finestra; scheda nascosta e ripresa. | Misure e difetti. |
| R4 Comandi | Prova ogni comando della tabella in `03-DESIGN.md` come farebbe un utente: tastiera, mouse, trascinamento, touch emulato. Cerca punti in cui ci si incastra: per ogni porta percorribile di `plan.openings`, la si attraversa in entrambi i versi. | Elenco difetti. |

Cancello finale:

| Codice | Asserzione |
|---|---|
| T4.1 | `npm test` passa per intero (fasi 1, 2, 3). Solo T4.2 sta in `tests/phases/fase4.mjs` e si esegue con `node tests/smoke.mjs 4`, che non richiama `npm test`: T4.1 si verifica lanciando `npm test` a parte. T4.3, T4.4 e T4.5 non hanno codice: le giudica il collaudatore con la riverifica descritta in `agenti/COLLAUDO.md`, «Solo per la fase 4». |
| T4.2 | Ogni porta percorribile si attraversa in entrambi i versi con `debug.step`. |
| T4.3 | Ogni requisito che il revisore R1 aveva segnato come non soddisfatto è stato riverificato **dopo le riparazioni**; quelli ancora aperti sono elencati con motivo in `RAPPORTO-FASE-4.md`. |
| T4.4 | Ogni difetto di gravità alta dei revisori è stato riverificato dopo le riparazioni e risulta chiuso. |
| T4.5 | `git status --short` vuoto **dopo** il commit finale; `index.html` nella radice è quello dell'ultima build (una build nuova in `out/` è identica byte per byte). La verifica il collaudatore a mano, dopo il commit. |

## Serie di screenshot

`node tests/shots.mjs <serie>` salva in `out/shots/<serie>/`. Ogni immagine si ottiene con `api.teleport`, `api.setTime(h, { immediate: true })`, `api.setStyle`, poi `debug.settle(40)`. L'interfaccia è nascosta, tranne dove indicato.

| Serie | Immagini |
|---|---|
| `fase1` | Vista zenitale con `--view top` (1). Prima persona nelle soste del tour di: ingresso, salotto, sala da pranzo, cucina, camera baronale, bagno baronale, terrazza, gran salone, studio (9); dalla terrazza verso `+x`, verso `-x` e verso `+z` (3); dalla terrazza guardando in basso oltre la ringhiera (1); dal balcone della cucina verso `-z` (1); vista dall'alto obliqua (1). Ore 10. |
| `fase2` | Le 14 soste del tour in stile Liberty; salotto, sala da pranzo, camera baronale, cucina, gran salone negli altri due stili (10); vista dall'alto nei tre stili (3). Ore 10. |
| `fase3` | Salotto, gran salone, cucina, camera da letto, camera baronale, terrazza alle ore 8, 12,5, 18,6, 22 (24); una sosta del tour con interfaccia visibile (1); schermata iniziale (1); vista 390 × 844 con interfaccia (1). |
| `finale` | Tutte le soste nei tre stili alle ore 10 (42); le soste in Liberty alle 18,6 e alle 22 (28); vista dall'alto nei tre stili alle 10 e alle 22 (6). |

Le posizioni e le direzioni di sguardo sono quelle di `tour.path[].stop`. Gli scatti aggiuntivi dalla terrazza partono da `(17.2, 12.95)`; quello verso il basso da `(17.2, 14.2)`, sguardo verso `+z` con inclinazione di −55°; quello dal balcone della cucina da `(22.0, 1.8)`.
