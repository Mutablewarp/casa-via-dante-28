# 03 · Guida di design

Dice **che aspetto deve avere** ogni cosa. Le misure e le posizioni sono nei JSON; qui ci sono forme, materiali e regole di stile. Tutto è generato dal codice: nessuna immagine, nessun modello, nessun font esterno.

## 1. Lo stile Liberty palermitano

Riferimento: l'Art Nouveau siciliano di inizio Novecento (Ernesto Basile, mobili Ducrot, Villa Igiea, Villino Florio). Parole chiave da tradurre in forme:

- **Colpo di frusta**: curve a S asimmetriche. Schienali, testiere, cimase di specchi e armadi non hanno il bordo superiore dritto: salgono al centro con una curva morbida.
- **Motivi vegetali**: iris, glicine, ninfee, pavoni. Compaiono in quadri, vetrata, tessuti, intagli (resi con una sagoma estrusa o una texture).
- **Gambe a sciabola o cabriole**: sottili, incurvate, più larghe in alto. Mai gambe cilindriche dritte.
- **Legno di noce scuro lucidato** con venatura visibile; **ottone** per maniglie, lampadari, bordi.
- **Velluti** verde bottiglia, senape, bordeaux; imbottiture capitonné sulle sedute importanti.
- **Vetro**: paralumi a tulipano color ambra, vetrata policroma a due ante con lunetta dentro l'arco tra ingresso e salotto.
- **Proporzioni**: mobili alti e slanciati (armadi 2,25-2,60 m), soffitti con cornice in stucco e rosone.

Cosa evitare: superfici piatte color legno uniforme, scatole senza modanature, simmetrie rigide, colori saturi da videogioco.

### Ciò che la casa ha già e che il progetto valorizza

Dalle foto dell'annuncio (`spec/riferimenti/foto/`, solo consultazione):

- un **grande arco ribassato** con mostra in legno tra ingresso e salotto, e un secondo arco più piccolo nella zona notte: l'arco diventa il motivo della casa, e i due varchi tra i tre saloni sono resi ad arco allo stesso modo;
- una **nicchia** nel salotto con architrave ribassato;
- **cornici in stucco** a soffitto nei saloni;
- **armadi a muro** con ante rivestite in tessuto a fiori: in stile Liberty si mantengono, con un tessuto a iris e glicini;
- la **terrazza** lunga quanto la casa, coperta, con pilastri bianchi, parete in klinker bruno a listelli, pavimento in cotto a spina di pesce e ringhiera a bacchette: sono parti condominiali e restano come sono in tutti gli stili;
- una **veranda vetrata** sul retro, che diventa giardino d'inverno.

### Livello di dettaglio atteso

Ogni mobile è fatto di 8-40 primitive (parallelepipedi smussati, cilindri, profili torniti, forme estruse). Si deve riconoscere a colpo d'occhio che cosa è e a che stile appartiene. Non servono intagli modellati: bastano la sagoma giusta, le proporzioni giuste e i materiali giusti.

## 2. Superfici (A1)

Tutte le texture sono `CanvasTexture` generate una volta, ripetute (`RepeatWrapping`) e mappate in **coordinate mondo** (1 unità UV = 1 metro lungo il muro o sul pavimento), così non si vedono giunzioni tra celle vicine.

| Superficie | Come si genera | Aspetto |
|---|---|---|
| **Terre Fiorentine** | Canvas 512: fondo nel colore della stanza; sopra, 3 strati di rumore a bassa frequenza (macchie larghe 0,6-1,2 m) che schiariscono e scuriscono di ±`contrast`; un velo di pennellate larghe incrociate appena visibili; nessun motivo ripetuto riconoscibile entro 3 m. | Opaco, vellutato, «a nuvola». Roughness 0,92. |
| Pittura liscia (Moderno, Scandinavo) | Colore pieno con rumore finissimo ±1,5 %. | Opaco uniforme. |
| Parquet a spina di pesce | Canvas 1024: listelli 9 × 45 cm a 90° alternati, due toni, venatura a linee sottili ondulate lungo il listello, giunti scuri di 1 px. | Lucido satinato, roughness 0,42. |
| Doghe (Moderno, Scandinavo) | Doghe parallele a correre con giunti sfalsati. | Opaco. |
| Marmo a scacchiera | Quadrati in diagonale bianco e grigio, venature chiare e scure a tratti spezzati. | Lucido, roughness 0,22: è la superficie che mostra meglio i riflessi. |
| Cementine | Piastrella 20 × 20 con motivo geometrico simmetrico sui 4 quadranti (stella a otto punte, fiore, scacco), 2-4 colori, fuga chiara. | Semiopaco. |
| Cotto a spina | Listelli 12 × 24 cm in due toni di terracotta posati a spina di pesce, come sulla terrazza vera. | Opaco, ruvido. |
| Pietra del piano cucina | Grigio Billiemi con venature bianche sottili. | Lucido. |
| Venatura del legno dei mobili | Canvas 256 × 512: bande longitudinali irregolari, qualche nodo. Tinta moltiplicata dal colore del token. | Satinato. |
| Velluto | Colore pieno, roughness 0,95; se disponibile `sheen` di `MeshPhysicalMaterial` con intensità bassa. | Morbido, senza riflessi netti. |
| Facciata | Intonaco beige `styles.exterior.facade` con grana fine. | Opaco. |
| Klinker della terrazza | Listelli verticali rigati 24 × 48 cm in bruno caldo `styles.exterior.klinker`, con leggere variazioni di tono tra un elemento e l'altro e fughe scure. | Semiopaco: è la parete di fondo della terrazza. |
| Sommità dei muri | Grigio antracite `#2B2B2E` pieno. | Nella vista dall'alto la pianta si legge come una sezione. |

I pavimenti lucidi e i vetri usano `envMapIntensity` secondo `lighting.environment`.

## 3. Tappeti, quadri, piastrelle decorate, vetrata (A2)

Canvas da 512 a 1024 px, disegnati con forme vettoriali del contesto 2D.

**Tappeti persiani (Liberty)**: bordo esterno scuro, greca interna con motivo ripetuto, campo centrale con medaglione e quattro cantonali, piccole rosette sparse, frange chiare sui due lati corti. Un generatore di numeri pseudo-casuali con seme fisso rende ogni disegno stabile.

| Motivo | Colori | Carattere |
|---|---|---|
| `heriz`, `heriz_grande` | rosso mattone, blu notte, avorio | medaglione geometrico spigoloso |
| `tabriz` | rosso rubino, blu, oro | medaglione ovale, campo fitto di fiori |
| `kashan` | blu notte, rosso, avorio | medaglione a losanga, bordo largo |
| `isfahan_chiaro`, `isfahan_seta` | avorio, celeste, rosa antico | disegno fine, chiaro |
| `bukhara` | rosso scuro, nero, avorio | file di ottagoni («gul») ripetuti |
| `passatoia` | rosso, blu, avorio | lungo e stretto, motivo ripetuto |
| `bagno` | avorio, celeste | semplice, bordo a righe |
| `zerbino` | cocco naturale | tinta unita ruvida |

In stile Moderno gli stessi motivi diventano tinta unita o grandi campiture geometriche in grigio e blu petrolio; in Scandinavo righe sottili o kilim chiari.

**Quadri (Liberty)**: composizioni originali in stile manifesto, piatte, con contorno scuro e cornice dorata dipinta nel canvas.

| Id | Soggetto |
|---|---|
| `manifesto_iris`, `manifesto_glicine`, `manifesto_ninfee`, `manifesto_pavone` | formato verticale; il soggetto vegetale o il pavone stilizzato dentro una cornice ad arco con curve a colpo di frusta, fondo crema o verde acqua |
| `glicine_orizzontale` | grappoli di glicine che scendono dall'alto, formato largo |
| `conca_doro` | golfo con monte a profilo tondeggiante, agrumeto in primo piano, cielo dorato |
| `veduta_palermo` | profilo di cupole e campanili contro monti azzurri |
| `natura_morta_agrumi` | limoni e arance su un piano, brocca blu |
| `dama_liberty` | profilo femminile stilizzato con capelli che diventano volute floreali; figura piatta, nessun volto realistico |

In Moderno: tele astratte a campiture. In Scandinavo: disegni botanici al tratto nero su fondo bianco.

**Piastrelle e rivestimenti**: `maiolica_gialloblu`, `maiolica_blu` (motivo siciliano a rosone su 20 × 20), `marmo_carrara`, `piastrella_bianca` (10 × 20 sfalsata), `gres_bianco`, `gres_marmo`, `tessuto_floreale` (iris e glicini su fondo avorio dorato, per le ante degli armadi a muro; in Moderno e Scandinavo tessuto tinta unita chiaro).

**Vetrata Liberty** (`stainedGlass`): due ante, ciascuna con un iris alto a stelo curvo, foglie verdi, fondo ambra e celeste, piombi scuri spessi. Va nell'arco `p_salotto`, con trasparenza circa 0,6; la stessa texture, ritagliata, riempie la lunetta sopra l'imposta.

**Dorsi dei libri** (`bookSpines`): fasce verticali di larghezza irregolare in rosso scuro, verde, blu, cuoio, con filetti dorati.

## 4. Catalogo degli arredi

Per ogni tipo: la forma in stile Liberty, poi la differenza negli altri due stili. I parametri di forma per stile sono in `styles.<stile>.shape`.

### Sedute e tavoli (E1)

| Tipo | Liberty | Moderno / Scandinavo |
|---|---|---|
| `sofa` | Schienale con bordo superiore a onda, più alto al centro; braccioli arrotolati verso l'esterno; seduta capitonné; base in legno a vista con 6 piedini a sciabola; 3 cuscini (`cushionA`, `cushionB`). | Volumi squadrati bassi con piedini metallici sottili / forme morbide su gambe coniche in legno. |
| `armchair` | Bergère: schienale a conchiglia avvolgente, braccioli imbottiti, gambe cabriole. | Poltrona a scocca in pelle su telaio nero / poltrona a listelli con cuscini. |
| `chair_dining`, `chair_desk` | Schienale alto traforato a lira con cimasa curva, seduta imbottita, gambe posteriori a sciabola. | Sedia a scocca / sedia in legno curvato. |
| `bench`, `banquette` | Cassapanca o panca con schienale basso sagomato e cuscino. | Panca piena imbottita. |
| `pouf`, `stool_piano` | Cilindro imbottito capitonné su piedini / sgabello rotondo regolabile su tre gambe. | Cilindro liscio. |
| `coffee_table`, `side_table`, `nightstand` | Piano in marmo o legno con bordo modanato, gambe incurvate unite da un ripiano basso sagomato; il comodino ha un cassetto con pomolo in ottone. | Piano sottile su struttura metallica / piano tondo in legno chiaro. |
| `dining_table` | Piano ovale-rettangolare con bordo arrotondato, fascia sotto il piano, quattro gambe tornite a balaustro. | Lastra su due cavalletti / piano in legno su gambe coniche. |
| `console` | Mezzo tavolo da parete: piano in marmo, due gambe anteriori a S, traversa bassa. | Mensola spessa su staffe. |
| `desk` | Scrittoio con alzatina a cassettini, piano rivestito in pelle, gambe a sciabola. | Piano su cavalletti. |
| `vanity_table` | Toeletta con specchio a tre ante (`mirror_triptych`) e cassettini. | Mensola con specchio tondo. |
| `bistro_table` | Piano tondo in marmo su colonna in ghisa con base a tre piedi. | Uguale, più semplice. |

### Letti, contenitori, bagno (E2)

| Tipo | Liberty | Moderno / Scandinavo |
|---|---|---|
| `bed_double` | Testiera alta sagomata a onda con pannello imbottito, pediera bassa, giroletto in noce. **Letto rifatto**: materasso, lenzuolo risvoltato, copriletto con piega, 2 guanciali più 2 cuscini decorativi, plaid piegato in fondo. | Testiera a pannello imbottito / a listelli. |
| `bed_canopy` | Come sopra, più **baldacchino**: quattro colonne tornite alte 2,60 m, cielo con cornice sagomata, tendaggi `fabric.curtain` raccolti alle colonne, velo `fabric.sheer`. È il pezzo principale della camera baronale. | Non usato (sostituito da `bed_double`). |
| `wardrobe` | Armadio a tre ante con specchio centrale, cimasa curva, piedi a cipolla. | Ante lisce a tutta altezza. |
| `bookcase` | Libreria a giorno con montanti scanalati e cimasa; ripiani pieni di libri (`bookSpines`) con qualche vuoto e soprammobile. | Scaffale a montanti sottili. |
| `sideboard`, `chest` | Credenza o cassettone con fronte bombato, pomoli in ottone, piano in marmo. | Mobile basso sospeso. |
| `display_cabinet` | Vetrina con ante in vetro, ripiani con porcellane, cimasa a colpo di frusta. | Vetrina a telaio nero. |
| `shelf_unit`, `wine_rack`, `tall_cabinet` | Scaffale semplice in legno; cantinetta a losanghe con bottiglie; colonna chiusa. | Uguali, più lisci. |
| `bathtub_clawfoot` | Vasca in ghisa smaltata bianca su quattro piedini a zampa in ottone, bordo arrotolato, rubinetteria a colonna. | `bathtub_freestanding`: ovale liscia senza piedi. |
| `vanity_single`, `vanity_double` | Mobile in noce con piano in marmo, lavabi ovali da appoggio, rubinetti a croce; lo specchio è un oggetto d'appoggio (`bath_mirror`). | Mobile sospeso con lavabo integrato. |
| `wc`, `bidet` | Sanitari bianchi a terra dalle forme tonde. | Sanitari sospesi squadrati. |
| `shower_walkin` | Piatto a filo, una lastra di vetro `glass.clear` con profilo in ottone, soffione tondo a parete, pareti interne in piastrella. | Profilo nero / cromato. |
| `towel_rail` | Scaldasalviette a tubi in ottone con asciugamano. | Cromato. |

### Cucina, esterni, piante, pianoforte (E3)

| Tipo | Liberty | Note |
|---|---|---|
| `kitchen_base_run` | Basi con ante a telaio dipinte `wood.painted`, pomoli in ottone, piano `stone.top` con alzata in `maiolica_gialloblu`. `opts.modules` elenca i moduli da sinistra: `base`, `range` (cucina a cinque fuochi con forno e maniglione), `sink` (lavello in ceramica con rubinetto a collo di cigno). Con `wallCabinets` aggiunge pensili a 1,45 m; con `hood` una cappa a campana in rame sopra `range`. | Moderno: ante lisce senza maniglie, piano bianco, piano cottura a filo. |
| `kitchen_island` | Tavolo da lavoro con piano in marmo e ripiano basso; con `potRack` una rastrelliera appesa al soffitto con pentole in rame. | |
| `plate_rack` | Credenza alta con piattaia a giorno e piatti in fila. | |
| `fridge_column` | Colonna con ante dipinte come le basi. | Moderno: acciaio. |
| `washer_stack`, `laundry_sink` | Lavatrice e asciugatrice in colonna; lavatoio in ceramica su mobile. | |
| `outdoor_chair`, `outdoor_armchair`, `outdoor_sofa`, `outdoor_table`, `sunbed`, `swing_bench` | Ferro battuto `metal.iron` con volute, cuscini `fabric.outdoor`; il dondolo ha struttura ad arco e tettuccio in tela. | Moderno: alluminio e corda. Scandinavo: legno. |
| `plant` | Vaso `ceramic.pot` più pianta secondo `opts.species`: `kentia` (palma a foglie arcuate), `ficus` (alberello a chioma tonda), `felce`, `limone_in_vaso` (alberello con limoni gialli), `agave` (rosetta di foglie a punta, come quelle che oggi stanno sulla terrazza). I vasi grandi della terrazza sono conche in cemento chiaro o ceramica smaltata verde e gialla. | |
| `planter` | Fioriera lunga con `bouganville` (massa fucsia che sale su un graticcio), `gelsomino` (verde con fiorellini bianchi), `agrumi`, `aromatiche` (cespugli bassi), `felci` (ciuffi ricadenti). | |
| `umbrella_stand` | Cilindro in ottone traforato con due ombrelli. | |
| `grand_piano` | Pianoforte a coda nero lucido: cassa a forma d'ala, coperchio sollevato sull'asta, tastiera bianca e nera, tre gambe, pedaliera a lira, leggio. | Scandinavo: bianco. |

Le foglie si fanno con piani o sagome istanziate, non con geometrie pesanti: una pianta resta sotto 1 500 triangoli.

### Luci, tende, oggetti (E4)

| Tipo | Liberty | Moderno / Scandinavo |
|---|---|---|
| `chandelier` | Asta in ottone dal rosone in stucco, 6-8 bracci a S che reggono paralumi a tulipano `paper.shade` rivolti in basso; diametro e caduta da `item.size`. Sopra, a soffitto, un **rosone** in stucco (va in `groups.ceilings`). | Anello luminoso o grappolo di sfere / campana in legno e carta. |
| `pendant`, `lantern` | Sospensione singola a tulipano; lanterna a gabbia in ottone con vetri ambra. | Cilindro / sfera di carta. |
| `floor_lamp`, `table_lamp`, `sconce`, `outdoor_lantern` | Stelo in ottone con paralume a cupola in vetro ambra; applique a braccio; lanterna da muro in ferro. | Forme essenziali. |
| `curtain` | Per ogni apertura elencata: bastone in ottone 15 cm sopra l'architrave; due teli di velluto raccolti ai lati con embrasse, a pieghe verticali (profilo a onda estruso); velo chiaro semitrasparente dietro. Non devono coprire il passaggio delle portefinestre. | Solo velo bianco / cotone bianco. |
| `painting`, `mirror_wall` | Cornice dorata sagomata con tela `tex.art`; specchio con cornice a colpo di frusta e superficie `mirror`. | Cornice sottile nera / legno chiaro. |
| `rug` | Piano a 1,5 cm dal pavimento con `tex.rug`, bordi leggermente più scuri. | |

**Oggetti d'appoggio** (`props`): `table_lamp`; `vase_flowers` (vaso in vetro con mazzo di iris o rose); `books` (pila di 3 libri); `table_runner` (striscia di lino al centro del tavolo); `table_setting:N` (**N coperti**, uno per ogni chiamata a `furn.prop`; ogni coperto: sottopiatto, piatto piano, piatto fondo, tovagliolo piegato, forchetta, coltello, cucchiaio, calice da vino, calice da acqua, tutto in 0,30 × 0,24 m; F li dispone davanti a ogni sedia e, dove c'è una panca, lungo il lato della panca); `centerpiece_flowers`; `candelabra:N` (N candelabri, uno per chiamata); `fruit_bowl`, `fruit_bowl_lemons` (coppa con limoni); `bread_board`; `herbs_pot`; `moka_cups` (moka e due tazzine); `copper_pots`; `bath_mirror`, `bath_mirror_double`; `mirror_triptych`; `perfume_set`; `globe`; `clock`; `lantern_candle`; `boxes`; `luggage`.

Il suffisso `:N` è la quantità.

## 5. Architettura e serramenti (B, C)

- **Muri**: facce da `grid.faces()`. Lato stanza: `mat.room(id).wall`, e `wainscot` sotto la quota `styles.<stile>.wainscot.height` dove previsto. Lato terrazza: `klinker`. Altri lati esterni: `facade`. Pilastri della terrazza: `pillar`. Spallette delle aperture: `trim`. Armadi a muro: `builtin` (telaio in legno e pannelli in `tessuto_floreale`, con pomoli). Sommità: `wallcap`.
- **Travi** (`plan.beams`): parallelepipedi da `y0` al soffitto, nel materiale del soffitto della stanza; in `groups.ceilings`.
- **Archi** (aperture con `shape = "arco"`): arco ribassato. I piedritti salgono dritti fino a `spring`; da lì la curva (un arco di cerchio, oppure una mezza ellisse) raggiunge `head` in mezzeria. C riempie i due triangoli curvi tra arco e architrave con il materiale delle pareti e posa una **mostra in legno larga 9 cm** che segue tutto il profilo, su entrambi i lati.
  - `p_salotto` in stile Liberty: dentro l'arco una vetrata a due ante con `tex.stainedGlass`, aperte a 80° verso il salotto, e sopra l'imposta una lunetta fissa nello stesso vetro. Negli altri stili: arco libero.
  - `v_salone_salotto`, `v_salotto_pranzo`: archi liberi, senza ante.
- **Porte interne**: telaio con mostra larga 9 cm, anta a due specchiature disegnata **aperta a 100°** contro il muro, maniglia in ottone. In Liberty la mostra ha gli angoli superiori raccordati a curva.
- **Portoncino d'ingresso**: anta piena a pannelli in noce, aperta verso l'interno, pomolo e spioncino in ottone.
- **Portefinestre** (`french`): telaio in legno `styles.exterior.frames` all'esterno e `trim.frames` all'interno; due ante vetrate a tutta altezza, **aperte verso l'interno a 95°** contro le spallette o il muro vicino; soglia in marmo.
- **Finestre** (`window`): telaio, due ante vetrate chiuse, davanzale in marmo a filo del muro (è la sommità del parapetto, che fa B); vetro `glassFrosted` nei bagni. Sotto ogni finestra dei saloni e delle camere un **termosifone in ghisa** a colonne, alto 60 cm, staccato 4 cm dal muro, bianco.
- **Avvolgibili**: sono sollevati e non si vedono. All'interno, sopra ogni finestra e portafinestra esterna, un **cassonetto** bianco alto 25 cm e profondo 18 cm, dall'architrave verso l'alto; le tende lo coprono.
- **Battiscopa e cornici**: lungo `grid.roomEdges`. Battiscopa alto `trim.skirtingHeight`. Cornice in stucco 12 × 12 cm a gola solo dove `ceiling.cornice` è vero; gira anche attorno alle travi.
- **Vano scala**: gradini in marmo chiaro come parallelepipedi, ringhiera in ferro a bacchette con corrimano in legno, porta dell'ascensore chiusa, una pianta in vaso sul pianerottolo.

## 6. Esterni e città (D)

Le foto in `spec/riferimenti/foto/` mostrano com'è davvero: usale per proporzioni e colori. Tutto resta stilizzato, senza insegne né marchi.

**Orientamento, da ricordare sempre.** `+z` è via Dante, `+x` sono i monti, `-x` è il Politeama, `-z` è il retro soleggiato.

- **Terrazza** (foto `terrazza-verso-monti`, `terrazza-verso-politeama`, `terrazza-lunga`): pavimento in cotto a spina di pesce; parete di fondo in klinker; sei pilastri bianchi; **soffitto bianco su tutta la terrazza** (è il balcone del piano di sopra), a `y = 3,00`, spesso 25 cm, in `groups.ceilings`; due applique tonde a parete.
- **Ringhiera** lungo `outdoor[].railings` degli spazi con `enclosure = "ringhiera"`: alta 1,05 m, bacchette verticali ogni 11 cm (istanziate), corrente basso, corrimano piatto in legno bruno-rosso. Uguale in tutti gli stili.
- **Giardino d'inverno** (`enclosure = "veranda"`, foto `veranda`): al posto della ringhiera una vetrata continua: parapetto pieno fino a 0,90 m, sopra telai sottili verde scuro `verandaFrame` ogni 0,80 m con vetro `glass` fino a 2,70 m, fascia piena fino al soffitto; soffitto pieno in `groups.ceilings`. In Liberty i montanti hanno in alto un piccolo raccordo curvo.
- **Edificio** (foto `facciata-dal-basso`): sotto la casa, sette piani da `y = -23` a `-0,25`, e sopra un piano fino a `y = 6,5` arretrato di 1 m. Intonaco beige con pannelli in klinker bruno tra le finestre, balconi continui con ringhiere scure, piano terra con vetrine e una fascia rossa senza scritte. Il piano superiore sta in `groups.ceilings`, così sparisce nella vista dall'alto.
- **Via Dante**: carreggiata tra `street.zNear` e `street.zFar`, da `x = -260` a `x = 320`, a `y = -23`; marciapiedi; alberi a chioma tonda verde chiaro ogni 9 m sui due lati; auto in sosta sui due lati e qualcuna in marcia; strisce pedonali.
- **Palazzo Ziino** (`context.landmarks`, visibile nella foto `terrazza-verso-politeama`): intonaco rosa `#E2B9A0`, quattro piani, basamento più scuro, finestre con cornici bianche e timpani alternati, balconi con balaustre bianche, cornicione, tetto a padiglione in coppi da `eavesY` a `ridgeY`. Dalla terrazza si vede dall'alto: cura tetto e cornicione.
- **Di fronte, verso +x** (foto `terrazza-verso-monti`): tre o quattro palazzi d'epoca ocra e gialli di 4-5 piani, con balconi, lesene e tetti in coppi o terrazze, tutti **più bassi della terrazza**; dietro, condomini chiari di 8-9 piani.
- **Lungo il nostro lato della via**: l'edificio confinante e altri due o tre volumi per lato.
- **Retro, verso -z** (foto `retro-tetti`): una distesa di tetti a falde in coppi rossi su edifici di 3-5 piani (colmi tra `y = -14` e `y = -8`), qualche terrazzo, un condominio grigio a sinistra; vista aperta.
- **Politeama**: nel punto `at`, in asse con la via verso `-x`, sagoma con rotonda a colonne e arco sormontato da un gruppo scuro; dietro, foschia chiara e due o tre gru del porto appena accennate.
- **Fondale**: anello a 900 m, alto 160 m, con monti azzurro-violetti tutt'intorno; in asse con la via verso `+x` il **Monte Cuccio**, con la cima a punta e una seconda gobba accanto; verso `-x` l'orizzonte è più basso e chiaro. Nessun mare in vista.
- Le finestre degli edifici usano materiali registrati in `registry.nightMaterials`; i lampioni della via si accendono di notte.

## 7. Interfaccia (K)

Lingua italiana. Aspetto: carta avorio `#F4EEDF`, testo `#2A2622`, accento verde bottiglia `#2F5D50`, filetti oro `#B8964A`. Titoli in `"Didot", "Bodoni MT", "Playfair Display", Georgia, serif`; testi in `system-ui, sans-serif`. Angoli arrotondati 10 px, pannelli semitrasparenti con sfocatura. Ogni comando ha un attributo `data-testid`.

| Elemento | `data-testid` | Contenuto |
|---|---|---|
| Schermata iniziale | `splash` | Titolo «Attico Liberty», sottotitolo «Via Dante 28 · Palermo · settimo piano», riga «196 m² interni · 66 m² tra terrazza, balcone e giardino d'inverno» con i numeri letti da `plan.meta.totals` e arrotondati con `Math.round`, pulsanti **Avvia tour** (`splash-tour`) ed **Esplora liberamente** (`splash-enter`), nota in piccolo: «Proposta d'arredo. Misure indicative ricavate dalla planimetria catastale.» |
| Barra in basso | `toolbar` | Da sinistra: **Avvia tour** (`btn-tour`), **Vista dall'alto / Prima persona** (`btn-view`), stili (`style-liberty`, `style-moderno`, `style-scandinavo`), ora del giorno (`slider-time`, con etichetta `time-label` tipo «Tramonto · 18:36»), **Musica** (`btn-music`), **Comandi** (`btn-help`). |
| Stanza corrente | `room-hud` | In alto a sinistra: nome e superficie, aggiornati da `room:changed`. |
| Scheda del tour | `tour-card` | In basso a sinistra durante le soste: titolo, «32,7 m²», frase di valore; sotto, i puntini di avanzamento e i pulsanti **Pausa** (`tour-pause`), **Avanti** (`tour-skip`), **Esci** (`tour-exit`). |
| Minimappa | `minimap` | In basso a destra: pianta disegnata dalla griglia, stanza corrente evidenziata, punto e direzione del visitatore; clic su una stanza per andarci. |
| Pannello comandi | `help` | Elenco dei comandi qui sotto. |
| Invito al clic | `hint-lock` | «Clicca per guardarti intorno · Esc per liberare il mouse». |
| Joystick (solo touch) | `joystick` | In basso a sinistra sui dispositivi touch: lo disegna H. |

Superfici con la virgola decimale e una cifra: «32,7 m²».

### Comandi

| Azione | Tastiera e mouse | Touch |
|---|---|---|
| Muoversi | W A S D o frecce | joystick a sinistra |
| Guardare | mouse dopo un clic sulla scena; oppure trascinando | trascinare a destra |
| Correre | Maiusc | — |
| Vista dall'alto / prima persona | M | pulsante |
| Avvia o ferma il tour | T | pulsante |
| Pausa del tour | Spazio | pulsante |
| Stile | 1, 2, 3 | pulsanti |
| Ora del giorno | `,` e `.` di un quarto d'ora | cursore |
| Musica | N | pulsante |
| Comandi | H oppure ? | pulsante |
| Liberare il mouse, chiudere pannelli | Esc | — |

Nella vista dall'alto: trascinare ruota, rotella o pizzico avvicina, tasto destro o due dita sposta, doppio clic su una stanza porta lì in prima persona.

Il cambio di stile avviene dietro una dissolvenza color avorio di 250 ms. Con `prefers-reduced-motion` le dissolvenze sono istantanee e il tour non fa la panoramica durante le soste.

## 8. Musica (J)

Web Audio, nessun file. Atmosfera: salotto di inizio Novecento, lenta, luminosa.

- **Tempo** 56 battiti al minuto, metro 4/4, tonalità Re maggiore con colore lidio: il Sol diesis compare solo come nota di passaggio dell'arpa, al massimo una volta ogni 8 battute.
- **Armonia**: frase A di 8 battute, `Dmaj7 → Bm7 → Gmaj7 → A7sus4`, due battute per accordo; frase B di 8 battute, `Dmaj7 → F#m7 → Gmaj7 → Em9`. Forma A A B A, 32 battute, ripetuta.
- **Voci**:
  1. *Tappeto*: due oscillatori a triangolo leggermente scordati (±4 cent) per nota dell'accordo, filtro passa-basso a 900 Hz che respira lentamente, attacco 2 s, rilascio 3 s.
  2. *Arpa*: note singole dell'accordo tra Re3 e Re5; seno più una triangolare un'ottava sopra a volume basso, **aggiunta solo alle note fino al La4** (sopra il La4 suona il solo seno, così nessun oscillatore supera il La5), attacco 5 ms, decadimento esponenziale 1,8 s; una nota ogni mezza battuta con il 30 % di pause, scelta con un generatore con seme.
  3. *Basso*: fondamentale dell'accordo, seno, una nota per accordo, molto piano.
- **Ambiente**: riverbero con `ConvolverNode` e risposta all'impulso generata (rumore con decadimento esponenziale di 2,5 s), miscela 30 %.
- **Volume** generale 0,16; dissolvenza in entrata 3 s e in uscita 0,6 s, entrambe con rampa lineare. Nessun oscillatore suona sopra il La5.
- L'`AudioContext` nasce al primo gesto dell'utente. La scelta resta in `localStorage` (in un `try/catch`). Con la scheda nascosta la musica si sospende.

## 9. Testi

I testi delle soste sono in `spec/tour.json` e non vanno riscritti. Il testo finale sostituisce `{interni}` ed `{esterni}` con `plan.meta.totals` arrotondati con `Math.round` (196 e 66): la stessa regola vale per la schermata iniziale.
