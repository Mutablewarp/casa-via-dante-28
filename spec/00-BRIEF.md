# 00 · Brief di progetto

## Cosa si costruisce

Un tour virtuale 3D dell'appartamento di **Via Dante 28, Palermo** (7° piano, scala B, unico al piano, 240 m² commerciali), esplorabile dal browser. Il risultato è **un solo file `index.html`** che si apre con un doppio clic, senza rete.

L'appartamento è da ristrutturare: il tour mostra una **proposta d'arredo in stile Liberty palermitano**, con pareti a Terre Fiorentine e tappeti persiani, e permette di vedere la stessa casa in altri due stili.

## Chi fa cosa

| Ruolo | Modello | Compito |
|---|---|---|
| Orchestratore (ha già lavorato) | Fable 5.2 | Ha letto la planimetria, deciso geometria, arredo, percorso, interfacce e collaudi. Tutto è in `spec/` e `agenti/`. |
| Capo-cantiere (sessione principale) | Sonnet 5.5 | Segue `AVVIO.md`: lancia i quattro workflow in ordine, legge gli esiti, pubblica. Non scrive codice di prodotto. |
| Agenti esecutori | Sonnet 5.5, effort medium | Ognuno costruisce i file che possiede, seguendo il proprio foglio in `agenti/`. |

Regola di fondo: **gli agenti eseguono, non progettano**. Posizioni, misure, colori, testi e ordine del tour sono già decisi nei file JSON. Se un dato manca o sembra sbagliato, l'agente lo segnala nel rapporto e usa la scelta più semplice; non modifica `spec/`.

## Requisiti

Ogni requisito ha un codice. `04-TEST.md` dice come si verifica, la tabella in fondo dice chi lo realizza.

### Dai cinque prompt originali

| Codice | Requisito |
|---|---|
| R03 | Un unico file HTML con Three.js. |
| R04 | Planimetria rispettata: pareti, porte, finestre e dimensioni delle stanze in scala. |
| R05 | Pavimenti, pareti e soffitti dall'aspetto realistico. |
| R06 | Mobili adatti a ogni ambiente. |
| R07 | Luce naturale soffusa che entra dalle finestre. |
| R08 | Esplorazione in prima persona con WASD e mouse. |
| R09 | Vista dall'alto senza tetto, tipo casa delle bambole, raggiungibile con un solo pulsante. |
| R10 | Ogni stanza arredata come farebbe un interior designer di alto livello per un annuncio. |
| R11 | Tappeti, quadri, piante, lampade. |
| R12 | Tavolo da pranzo apparecchiato. |
| R13 | Letti rifatti. |
| R14 | Dettagli in cucina. |
| R15 | Materiali realistici: venature del legno, piani in pietra, tessuti morbidi. |
| R16 | Selettore che mostra la stessa casa in tre stili con un clic. |
| R17 | Cursore dell'ora del giorno: mattina, tramonto, notte. |
| R18 | Il sole che entra dalle finestre cambia con il cursore; al tramonto è caldo e dorato. |
| R19 | Di notte lampade e luci a soffitto accese, con luce soffusa. |
| R20 | Ombre morbide. |
| R21 | Leggeri riflessi su pavimenti e vetri. |
| R22 | Ogni transizione è fluida. |
| R23 | Funziona bene su un normale portatile. |
| R24 | Pulsante «Avvia tour». |
| R25 | La camera si muove lentamente dalla porta d'ingresso attraverso tutte le stanze, in ordine preciso, con una breve sosta in ognuna. |
| R26 | A ogni sosta un'etichetta con nome della stanza, superficie in m² e un elemento che la valorizza commercialmente. |
| R27 | Musica di sottofondo delicata generata dal codice, senza file audio esterni. |
| R28 | Pulsante per disattivare la musica. |
| R29 | A fine tour la camera si solleva e mostra la casa dall'alto. |

R01 e R02 (analisi della planimetria e piano del tour, «senza scrivere codice») sono già soddisfatti da `01-ANALISI-PLANIMETRIA.md`, `03-DESIGN.md` e dai file JSON.

### Dalle richieste del committente

| Codice | Requisito |
|---|---|
| R30 | Mobilio in stile Liberty. |
| R31 | Terre Fiorentine alle pareti. |
| R32 | Tappeti pregiati. |
| R33 | Un bel salotto; casa ben strutturata e organizzata. |
| R34 | Due camere da letto, una delle quali baronale. |
| R35 | Due bagni, uno dei quali baronale. |
| R36 | Terrazza ottimizzata. |
| R37 | Contesto reale: via Dante 28, sopra il negozio Expert, di fronte a Palazzo Ziino, settimo piano. |
| R38 | Comandi perfetti. |
| R39 | Un sito o un repository GitHub che il committente può visitare. |
| R40 | Esecuzione affidata a Sonnet 5.5 con effort medium. |

### Integrazioni decise dall'orchestratore

I prompt originali lasciavano scoperti alcuni punti. Sono stati corretti così.

| Codice | Integrazione | Motivo |
|---|---|---|
| R41 | Oltre al mouse catturato, si può guardare trascinando; su touch c'è un joystick. | Il blocco del puntatore non funziona ovunque (iframe, tablet). |
| R42 | Minimappa; dalla vista dall'alto un doppio clic porta nella stanza scelta. | Orientarsi in 196 m² senza perdersi. |
| R43 | Il tour si può mettere in pausa, far avanzare, interrompere; durante il tour la luce passa da mattina a tramonto. | Controllo all'utente; il tramonto sulla terrazza è il momento più forte. |
| R44 | Qualità grafica adattiva su tre livelli. | R23: un portatile con grafica integrata deve restare fluido. |
| R45 | Schermata iniziale con titolo e avvertenza: proposta progettuale, misure indicative. | La planimetria non ha quote: la scala è stimata. |
| R46 | Nessuna richiesta di rete: Three.js è incluso nel file. | Il file funziona offline, da chiavetta, in allegato. |
| R47 | Interfaccia in italiano con pannello dei comandi. | Pubblico italiano. |
| R48 | Il terzo wc della planimetria può essere toilette ospiti o dispensa, cambiando una riga. | La planimetria ha 3 wc, la richiesta è 2 bagni: vedi sotto. |
| R49 | Il codice sorgente è diviso in moduli e riunito in un solo file da uno script di build. | Più agenti lavorano in parallelo senza toccare gli stessi file; R03 resta rispettato sul risultato. |
| R50 | Il luogo reale si riconosce: arco d'ingresso, nicchia del salotto, terrazza coperta con pilastri e klinker, vista vera (Palazzo Ziino, monti in fondo alla via, tetti sul retro), sole dal lato giusto. | Le foto dell'annuncio mostrano com'è: un acquirente che ha visitato la casa deve ritrovarla. |
| R51 | Il tour racconta una giornata: mattina nelle stanze al sole sul retro, tramonto in terrazza e nei saloni, imbrunire nel finale. | L'orientamento reale rende vero questo racconto. |

## Decisioni prese e ipotesi

Sono scelte dell'orchestratore, da confermare con il committente se servisse.

1. **Scala.** La planimetria non riporta quote. La scala è 35 pixel per metro, ricavata da due vincoli indipendenti che coincidono: i 240 m² commerciali dell'annuncio e le rampe di scala da 9 pedate. Tolleranza circa 5 %.
2. **Numero civico.** Expert è in via Dante 28; Palazzo Ziino è al 53, sul lato opposto. Il portone condominiale potrebbe avere un civico diverso dal negozio.
3. **Tre wc, due bagni.** La planimetria ha tre locali wc. Due sono bagni completi (bagno baronale e bagno). Il terzo, nell'ala dello studio, è per default una toilette ospiti con solo lavabo e wc. Per avere esattamente due locali bagno si imposta `variants.active.toilette = "dispensa_cantinetta"` in `tools/specgen/furnishing_data.py` e si rigenera.
4. **Uso delle stanze senza etichetta.** L'annuncio parla di 3 camere; la richiesta è 2. La terza camera diventa studio. I quattro vani su via Dante sono, andando verso `+x`: gran salone, salotto, sala da pranzo, camera baronale.
5. **Larghezza delle porte.** In planimetria le porte interne misurano 60-70 cm. Sono portate a 75-85 cm, centrate sulla stessa posizione, perché un visitatore virtuale ci passi senza incastrarsi.
6. **Terrazza coperta.** Le foto mostrano che tutta la terrazza è sotto il balcone del piano superiore, con sei pilastri bianchi, parete in klinker bruno e ringhiera a bacchette: sono parti condominiali e restano così in tutti gli stili.
7. **Orientamento.** La terrazza su via Dante guarda a nord-nord-ovest; il retro (cucina, camera, bagni, studio) guarda a sud-sud-est ed è il lato soleggiato a cui si riferisce l'annuncio. In fondo alla via verso `+x` ci sono i monti, verso `-x` il Politeama. Lo provano la bussola della planimetria e le foto (sole dietro l'edificio visto dalla strada, Monte Cuccio in fondo alla via). Nei documenti le direzioni si indicano con gli assi.
8. **Stili.** I tre stili sono Liberty (predefinito), Moderno e Scandinavo.
9. **Contesto esterno.** Palazzo Ziino, via Dante, i palazzi di fronte, i tetti sul retro, il Politeama e i monti sono stilizzati ma disposti come nella realtà. Nessun marchio, nessuna insegna reale.
10. **Pianta catastale e stato attuale.** Le foto mostrano due tramezzi che la planimetria catastale non riporta: uno divide il gran salone in due stanze, l'altro restringe il salotto sul lato del gran salone. Il progetto segue la planimetria, come richiesto: li considera rimossi, e al posto del primo lascia una trave a soffitto.
11. **Aperture corrette con le foto.** Due aperture che in planimetria sembravano portefinestre sono finestre: la prima del gran salone verso `-x` e quella della sala da pranzo, che quindi non ha uscita diretta in terrazza.
12. **Archi.** L'arco ribassato tra ingresso e salotto esiste davvero. Il progetto lo mantiene, ci mette una vetrata Liberty, e rende ad arco anche i due varchi tra i tre saloni.
13. **Veranda.** Il balcone dello studio oggi è una veranda chiusa: diventa giardino d'inverno.
14. **Foto dell'annuncio.** Sono usate solo come riferimento visivo privato in `spec/riferimenti/foto/`. Non entrano nel prodotto né nel repository.
15. **Soste del tour (R25).** Il tour attraversa tutta la casa e si ferma nei 14 ambienti principali. Lavanderia, toilette ospiti, guardaroba, ripostiglio, galleria, balcone della cucina e giardino d'inverno non hanno una sosta propria: si attraversano o si vedono dalle soste vicine, e le frasi delle soste li nominano. La sosta del bagno è sulla soglia, dalla galleria: il bagno è troppo stretto per entrarci con la camera.
16. **Arredo di ogni stanza (R11).** Tappeto, quadro, pianta e lampada sono presenti in ogni stanza principale: ingresso, salotto, sala da pranzo, cucina, le due camere, gran salone, studio. In cucina, dove a terra non c'è posto senza intralciare porte e passaggi, la pianta è il vaso di aromatiche sull'isola. Nei bagni: tappeto e lampada (nel bagno baronale anche una pianta). Nei locali di servizio: la sola lampada.
17. **Ore del tour (R51).** Le soste del mattino vanno dalle 8 alle 10,2: è la fascia in cui il sole, ancora basso, entra davvero dalle finestre del retro. Verso mezzogiorno la soletta del balcone coperto ferma il sole su cucina e camera. Dalla camera baronale in poi il tour passa al tardo pomeriggio (17) e chiude al tramonto.
18. **Requisiti che non stanno nel prodotto.** R39 (sito o repository) si chiude solo con la pubblicazione, che avviene dopo il «pubblica» del committente (`AVVIO.md`, passo 6). R40 (Sonnet con effort medium) è garantito dagli script in `workflows/`, che fissano modello ed effort.

## Chi realizza cosa

| Agente | Fase | Requisiti principali |
|---|---|---|
| S0 Fondamenta | 1 | R03, R46, R49 |
| S1 Griglia | 1 | R04 |
| A1 Materiali | 1 | R05, R15, R31 |
| A2 Decori | 1 | R11, R32 |
| A2b Quadri | 1 | R11 |
| B Involucro | 1 | R04, R05 |
| C Serramenti | 1 | R04, R21, R50 |
| D Esterni | 1 | R36, R37, R50 |
| H Navigazione | 1 | R08, R09, R38, R41, R42 |
| E0 Kit arredo | 2 | R06 |
| E1 Sedute e tavoli | 2 | R06, R10, R30 |
| E2 Letti, contenitori, bagno | 2 | R06, R13, R30 |
| E3 Cucina, esterni, piante | 2 | R06, R14, R36 |
| E4 Luci e decori | 2 | R11 |
| E5 Oggetti d'appoggio | 2 | R12, R13, R14 |
| F Allestimento | 2 | R10, R16, R33, R34, R35, R48 |
| G Illuminazione | 3 | R07, R17-R22, R50 |
| I Tour | 3 | R24, R25, R26, R29, R43, R51 |
| J Musica | 3 | R27, R28 |
| K Interfaccia | 3 | R16, R17, R24, R28, R38, R45, R47 |
| Q Qualità | 3 | R23, R44 |
| Collaudatori e riparatori | 1-4 | tutti |
| Capo-cantiere | chiusura | R39 (dopo «pubblica»), R40 (argomenti dei workflow) |

## Cosa resta fuori

- Porte che si aprono da sole, fisica, personaggi, realtà virtuale.
- Texture fotografiche o modelli scaricati: tutto è generato dal codice.
- Fedeltà fotografica di Palazzo Ziino e del Politeama.
- Impianti, quote esecutive, computi: non è un progetto di ristrutturazione.
