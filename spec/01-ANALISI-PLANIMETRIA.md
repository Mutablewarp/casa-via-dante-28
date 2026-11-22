# 01 · Analisi della planimetria e piano del tour

Questo documento è la risposta al primo dei cinque prompt («analizza la planimetria, elenca stanze, porte, finestre e scale, indica l'altezza delle pareti, segnala ciò che non è chiaro, poi pianifica il tour; non scrivere codice»). I numeri sono generati da `spec/plan.json`, fonte unica per gli agenti. Per rigenerarlo: `python3 tools/genera_analisi.py`.

## Dati di partenza

| Voce | Valore | Fonte |
|---|---|---|
| Indirizzo | Via Dante 28, 90141 Palermo, angolo via Principe di Villafranca | negozio Expert al civico 28; annuncio immobiliare |
| Piano | Settimo, scala B, con ascensore; unico appartamento al piano | planimetria, annuncio |
| Altezza interna | **3,00 m** | planimetria («h = 3.00 m») |
| Superficie commerciale | 240 m², 8 locali, anno 1970, da ristrutturare | annuncio |
| Superficie netta calcolata | **196,30 m² interni**, **65,50 m² tra terrazza, balcone e giardino d'inverno** | `plan.json` |
| Orientamento | Terrazza su via Dante a nord-nord-ovest; retro a sud-sud-est, soleggiato | bussola della planimetria, foto dell'annuncio |
| Vista | Di fronte Palazzo Ziino (via Dante 53); in fondo alla via da un lato il Politeama, dall'altro i monti; sul retro tetti in coppi | foto dell'annuncio, ricerca |
| Unità confinante | F.121 P.104 SUB 68, dal lato del Politeama | planimetria |

### Scala del disegno

La planimetria catastale non riporta quote. La scala adottata è **35 pixel = 1 metro**, ricavata da due vincoli indipendenti che danno lo stesso risultato:

1. **Superficie.** Con 35 px/m la somma di superficie lorda interna e terrazze ponderate al 30 % dà circa 240 m², cioè il dato dell'annuncio.
2. **Scala condominiale.** Ogni rampa ha 9 pedate disegnate in 95 pixel: con 35 px/m la pedata è 30 cm e la rampa è larga 1,00 m.

Tutte le misure sono arrotondate a 5 cm. Tolleranza stimata: circa 5 %.

### Sistema di coordinate

- `+x` corre lungo via Dante verso i monti; `-x` verso il Politeama.
- `+z` va verso via Dante (facciata con la terrazza); `-z` verso il retro.
- `y` è l'altezza; pavimento finito a quota 0, soffitto a 3,00.
- Un rettangolo è sempre `[x0, z0, x1, z1]`.
- Le direzioni si indicano con gli assi, non con i punti cardinali.

## Stanze

| Stanza | Etichetta in planimetria | Zona | Dimensioni | Superficie |
|---|---|---|---|---|
| **Pianerottolo** (`pianerottolo`) | pianerottolo scala B | parte comune | 2,25 x 1,20 m | 2,70 m² |
| **Ingresso** (`ingresso`) | (senza etichetta) | giorno | 2,55 x 2,95 m | 7,52 m² |
| **Galleria** (`corridoio`) | dis. | notte | 7,10 x 1,15 m piu 1 appendice | 9,47 m² |
| **Salotto** (`salotto`) | (senza etichetta) | giorno | 7,55 x 3,65 m piu 1 appendice | 32,70 m² |
| **Sala da pranzo** (`sala_pranzo`) | (senza etichetta) | giorno | 3,90 x 3,65 m | 14,24 m² |
| **Cucina** (`cucina`) | cucina | giorno | 3,60 x 2,65 m piu 1 appendice | 13,48 m² |
| **Lavanderia** (`lavanderia`) | lav. | servizi | 2,00 x 1,40 m | 2,80 m² |
| **Camera da letto** (`camera2`) | (senza etichetta) | notte | 3,50 x 4,40 m | 15,40 m² |
| **Bagno** (`bagno2`) | wc | notte | 1,45 x 3,15 m | 4,57 m² |
| **Camera baronale** (`camera_baronale`) | (senza etichetta) | notte | 4,65 x 3,65 m | 16,97 m² |
| **Cabina armadio** (`cabina_armadio`) | dis. | notte | 1,25 x 1,70 m | 2,12 m² |
| **Bagno baronale** (`bagno_baronale`) | wc | notte | 2,00 x 3,90 m | 7,80 m² |
| **Gran salone** (`gran_salone`) | (senza etichetta) | giorno | 9,80 x 3,65 m piu 2 appendici | 39,74 m² |
| **Disimpegno dello studio** (`disimpegno_studio`) | dis. | ala dello studio | 1,40 x 2,05 m piu 2 appendici | 5,87 m² |
| **Studio** (`studio`) | (senza etichetta) | ala dello studio | 2,80 x 3,95 m | 11,06 m² |
| **Toilette ospiti** (`toilette`) | wc | ala dello studio | 1,40 x 2,70 m | 3,78 m² |
| **Guardaroba** (`guardaroba`) | (senza etichetta) | ala dello studio | 1,95 x 3,05 m piu 1 appendice | 7,02 m² |
| **Ripostiglio** (`ripostiglio`) | rip. | ala dello studio | 1,65 x 1,05 m | 1,73 m² |

## Spazi esterni

| Spazio | Dimensioni | Superficie | Note |
|---|---|---|---|
| **Terrazza su via Dante** (`terrazza`) | 28,40 x 1,25 m piu 1 appendice | 49,27 m² | lunga 28,40 m: fascia profonda 1,25 m più avancorpo centrale di 19,00 × 0,75 m; sei pilastri; tutta coperta dal balcone del piano di sopra |
| **Giardino d'inverno** (`giardino_inverno`) | 6,40 x 1,45 m | 9,28 m² | oggi veranda vetrata; accesso dallo studio |
| **Balcone della cucina** (`balcone_cucina`) | 4,50 x 1,55 m | 6,98 m² | accesso da cucina e camera; da qui si entra in lavanderia; affaccio a sud sui tetti |

## Porte, archi e finestre

`Larghezza` è la luce del foro; `davanzale` e `chiave` sono le quote da pavimento del bordo inferiore e superiore. Le porte interne in planimetria misurano 60-70 cm e sono state portate a 75-85 cm mantenendo il centro.

| Id | Tipo | Collega | Larghezza | Davanzale | Chiave |
|---|---|---|---|---|---|
| `p_ingresso` | portoncino d'ingresso | Pianerottolo ↔ Ingresso | 0,85 m | 0,00 | 2,30 |
| `p_servizio` | porta di servizio | Pianerottolo ↔ Cucina | 0,80 m | 0,00 | 2,20 |
| `p_salotto` | arco con vetrata | Ingresso ↔ Salotto | 2,00 m | 0,00 | 2,45 |
| `v_salone_salotto` | arco | Gran salone ↔ Salotto | 1,85 m | 0,00 | 2,45 |
| `v_salotto_pranzo` | arco | Salotto ↔ Sala da pranzo | 1,85 m | 0,00 | 2,45 |
| `p_pranzo` | porta | Galleria ↔ Sala da pranzo | 0,85 m | 0,00 | 2,30 |
| `p_cucina` | porta | Galleria ↔ Cucina | 0,85 m | 0,00 | 2,30 |
| `p_camera2` | porta | Galleria ↔ Camera da letto | 0,80 m | 0,00 | 2,30 |
| `p_bagno2` | porta | Galleria ↔ Bagno | 0,75 m | 0,00 | 2,30 |
| `p_baronale` | porta | Galleria ↔ Camera baronale | 0,80 m | 0,00 | 2,30 |
| `p_cabina` | porta | Cabina armadio ↔ Camera baronale | 0,80 m | 0,00 | 2,30 |
| `p_bagno_baronale` | porta | Bagno baronale ↔ Cabina armadio | 0,80 m | 0,00 | 2,30 |
| `p_disimpegno` | porta | Disimpegno dello studio ↔ Gran salone | 0,85 m | 0,00 | 2,30 |
| `p_studio` | porta | Studio ↔ Disimpegno dello studio | 0,80 m | 0,00 | 2,30 |
| `p_toilette` | porta | Toilette ospiti ↔ Disimpegno dello studio | 0,75 m | 0,00 | 2,30 |
| `p_guardaroba` | porta | Disimpegno dello studio ↔ Guardaroba | 0,75 m | 0,00 | 2,30 |
| `p_ripostiglio` | porta | Disimpegno dello studio ↔ Ripostiglio | 0,70 m | 0,00 | 2,30 |
| `p_lavanderia` | porta | Lavanderia ↔ Balcone della cucina | 0,80 m | 0,00 | 2,20 |
| `pf_studio` | portafinestra | Giardino d'inverno ↔ Studio | 1,15 m | 0,00 | 2,50 |
| `pf_cucina` | portafinestra | Balcone della cucina ↔ Cucina | 1,00 m | 0,00 | 2,50 |
| `pf_camera2` | portafinestra | Balcone della cucina ↔ Camera da letto | 1,20 m | 0,00 | 2,50 |
| `f_salone_1` | finestra | Gran salone ↔ Terrazza su via Dante | 1,00 m | 0,90 | 2,50 |
| `pf_salone_2` | portafinestra | Gran salone ↔ Terrazza su via Dante | 0,80 m | 0,00 | 2,50 |
| `f_salone_2` | finestra | Gran salone ↔ Terrazza su via Dante | 1,20 m | 0,90 | 2,50 |
| `pf_salone_3` | portafinestra | Gran salone ↔ Terrazza su via Dante | 0,80 m | 0,00 | 2,50 |
| `f_salone_3` | finestra | Gran salone ↔ Terrazza su via Dante | 1,15 m | 0,90 | 2,50 |
| `pf_salotto_1` | portafinestra | Salotto ↔ Terrazza su via Dante | 0,80 m | 0,00 | 2,50 |
| `f_salotto_1` | finestra | Salotto ↔ Terrazza su via Dante | 1,15 m | 0,90 | 2,50 |
| `pf_salotto_2` | portafinestra | Salotto ↔ Terrazza su via Dante | 0,80 m | 0,00 | 2,50 |
| `f_salotto_2` | finestra | Salotto ↔ Terrazza su via Dante | 1,20 m | 0,90 | 2,50 |
| `f_pranzo` | finestra | Sala da pranzo ↔ Terrazza su via Dante | 1,05 m | 0,90 | 2,50 |
| `pf_baronale` | portafinestra | Camera baronale ↔ Terrazza su via Dante | 1,05 m | 0,00 | 2,50 |
| `f_toilette` | finestra | Giardino d'inverno ↔ Toilette ospiti | 0,65 m | 1,10 | 2,30 |
| `f_guardaroba` | finestra | Giardino d'inverno ↔ Guardaroba | 0,80 m | 0,90 | 2,30 |
| `f_bagno2` | finestra | esterno sul retro ↔ Bagno | 0,70 m | 1,10 | 2,30 |
| `f_bagno_baronale` | finestra | esterno sul retro ↔ Bagno baronale | 0,65 m | 1,10 | 2,30 |
| `f_lavanderia` | finestra | esterno sul retro ↔ Lavanderia | 0,60 m | 1,40 | 2,20 |
| `f_scala` | finestra | esterno sul retro ↔ rampe della scala | 0,90 m | 1,00 | 2,30 |

Totale: 38 aperture (1 portoncino d'ingresso, 1 porta di servizio, 1 arco con vetrata, 2 arco, 13 porta, 8 portafinestra, 12 finestra).

## Scala e ascensore

- **Vano scala** a due rampe parallele con pozzo centrale: interno 2,25 × 4,85 m. Rampe larghe 1,00 m con 9 pedate da 30 cm; gradini in marmo, ringhiera in ferro con corrimano in legno.
- **Pianerottolo** 2,25 × 1,20 m: da qui partono il portoncino d'ingresso e la porta di servizio che entra direttamente in cucina (le due frecce della planimetria).
- **Ascensore**: vano 1,25 × 1,50 m con porta sul pianerottolo.
- Non ci sono scale interne all'appartamento.

## Elementi poco chiari e come sono stati risolti

| N. | Cosa non era chiaro | Scelta adottata |
|---|---|---|
| 1 | Nessuna quota sul disegno | Scala stimata a 35 px/m con due verifiche incrociate (vedi sopra). |
| 2 | Sette vani non hanno etichetta | Destinazione assegnata in base a posizione, collegamenti e richiesta: gran salone, salotto, sala da pranzo, camera baronale, camera da letto, studio, guardaroba. |
| 3 | Tre locali wc ma la richiesta è di due bagni | Due bagni completi più una toilette ospiti; variante «dispensa e cantinetta» già pronta. |
| 4 | Orientamento: la bussola del disegno è ambigua | Risolto con le foto: la terrazza guarda a nord-nord-ovest, il retro a sud-sud-est. |
| 5 | In facciata, porte strette affiancate a finestre | Confermato dalle foto: portafinestra a un'anta più finestra con davanzale, sotto un unico cassonetto. |
| 6 | Due aperture in facciata con il segno tratteggiato | Dalle foto sono finestre, non portefinestre: la prima del gran salone e quella della sala da pranzo. |
| 7 | Varco largo 2 m tra ingresso e salotto | Dalle foto è un arco ribassato con mostra in legno: mantenuto, con vetrata Liberty. |
| 8 | Varchi larghi tra gran salone, salotto e sala da pranzo | Oggi hanno porte scorrevoli; nel progetto diventano archi come quello dell'ingresso. |
| 9 | Le foto mostrano due tramezzi che il disegno non ha | Uno divide il gran salone, l'altro restringe il salotto. Si segue la planimetria: tramezzi rimossi, resta una trave a soffitto nel gran salone. |
| 10 | Setto corto che sporge nel salotto | Mantenuto come da disegno (0,95 m); nelle foto corrisponde alla spalla della nicchia. |
| 11 | Due rettangoli con diagonale vicino ai bagni | Armadi a muro: confermati dalle foto, con ante rivestite in tessuto a fiori. |
| 12 | Linea tratteggiata verticale nel disimpegno dello studio | Ignorata: non delimita ambienti. |
| 13 | Sei rettangolini sul bordo della terrazza | Pilastri bianchi, confermati dalle foto. |
| 14 | Archi di cerchio agli estremi della terrazza | Angoli arrotondati dei balconi, visibili nella foto della facciata: non modellati. |
| 15 | Balcone dello studio | Dalle foto è una veranda chiusa da una vetrata: diventa giardino d'inverno. |
| 16 | Altezza di porte e davanzali non indicata | Porte interne 2,30 m; archi 2,45 m in chiave con imposta a 1,85 m; portefinestre 2,50 m; davanzali 0,90 m, 1,10 m nei bagni. |
| 17 | Larghezza di via Dante e altezza degli edifici di fronte | Circa 19 m tra i fronti; palazzi di fronte più bassi della terrazza di 3-7 m. Valori indicativi dalle foto. |

## Piano del tour

### Idea guida

Un attico borghese del 1970 riletto come **casa Liberty palermitana**: il riferimento è la stagione di Ernesto Basile e dei mobili Ducrot. Legno di noce con linee a colpo di frusta, ottone, vetri colorati, velluti verde bottiglia e bordeaux, tappeti persiani, cementine e marmo grigio di Billiemi. Alle pareti una finitura tipo **Terre Fiorentine**: velature opache a nuvola nei toni delle terre, una tinta diversa per ogni ambiente. L'arco ribassato dell'ingresso, che la casa ha già, diventa il motivo ricorrente.

L'appartamento si organizza in quattro parti:

- **Rappresentanza su via Dante**: gran salone, salotto e sala da pranzo in infilata, uniti da archi; gran salone e salotto si aprono sulla terrazza.
- **Zona notte**: camera baronale con cabina armadio, bagno privato e uscita in terrazza; camera da letto e bagno sulla galleria, al sole del retro.
- **Cucina e servizi sul retro**: cucina abitabile con ingresso di servizio, balcone e lavanderia.
- **Ala dello studio**: studio con giardino d'inverno, guardaroba, ripostiglio, toilette ospiti.

### Materiali per ambiente (stile Liberty)

| Ambiente | Parete | Pavimento |
|---|---|---|
| Pianerottolo | Terre Fiorentine grigio caldo (`#E9E4D8`) | marmo grigio |
| Ingresso | Terre Fiorentine ocra dorata (`#D9B982`) | marmo a scacchiera bianco e grigio Billiemi |
| Galleria | Terre Fiorentine ocra dorata (`#D9B982`) | marmo a scacchiera bianco e grigio Billiemi |
| Salotto | Terre Fiorentine rosa antico (`#D7A486`) | parquet di noce a spina di pesce |
| Sala da pranzo | Terre Fiorentine verde salvia (`#A8B598`) | parquet di noce a spina di pesce |
| Cucina | Terre Fiorentine avorio (`#EDE4CD`) | cementine a stella ocra e blu |
| Lavanderia | Terre Fiorentine avorio (`#EDE4CD`) | cementine a scacco grigio e crema |
| Camera da letto | Terre Fiorentine celeste polvere (`#B5C6CE`) | parquet di rovere a spina di pesce |
| Bagno | Terre Fiorentine sabbia chiara (`#E6E0D0`) | maiolica bianca e blu |
| Camera baronale | Terre Fiorentine cipria (`#CFA998`) | parquet di rovere a spina di pesce |
| Cabina armadio | Terre Fiorentine tortora chiaro (`#E3D6C2`) | parquet di rovere a spina di pesce |
| Bagno baronale | Terre Fiorentine verde acqua (`#BCCFC2`) | marmo a scacchiera bianco e verde |
| Gran salone | Terre Fiorentine giallo Napoli (`#E0C388`) | parquet di noce a spina di pesce |
| Disimpegno dello studio | Terre Fiorentine ocra chiara (`#E0CBA0`) | cementine a scacco grigio e crema |
| Studio | Terre Fiorentine verde bosco (`#8F9E86`) | parquet di noce a spina di pesce |
| Toilette ospiti | Terre Fiorentine tortora (`#D6C3B0`) | cementine a scacco grigio e crema |
| Guardaroba | Terre Fiorentine crema (`#E8DDC8`) | cementine a scacco grigio e crema |
| Ripostiglio | Terre Fiorentine bianco caldo (`#EEE8DA`) | cementine a scacco grigio e crema |
| Terrazza su via Dante | klinker bruno e intonaco beige, come oggi | cotto a spina di pesce, come oggi |
| Giardino d'inverno | klinker bruno e intonaco beige, come oggi | cotto a spina di pesce, come oggi |
| Balcone della cucina | klinker bruno e intonaco beige, come oggi | cotto a spina di pesce, come oggi |

Soffitti bianco caldo con cornice in stucco e rosone sotto ogni lampadario. Nei bagni e in cucina, zoccolatura in maiolica o marmo fino a 1,35 m. L'arredo completo, pezzo per pezzo, è in `spec/furnishing.json`; le regole di stile sono in `03-DESIGN.md`.

### Illuminazione

- **Mattina e mezzogiorno**: il sole è sul retro ed entra in cucina, camera, bagni, studio e giardino d'inverno; i saloni su via Dante hanno luce diffusa e morbida.
- **Tardo pomeriggio e tramonto**: il sole scende verso i monti in fondo a via Dante, passa sotto il soffitto della terrazza ed entra basso e dorato nei tre saloni e nella camera baronale.
- **Notte**: lampadari a bracci in ottone, lampade da tavolo e applique accesi con luce calda; cielo scuro, finestre accese negli edifici di fronte.
- Fotogrammi chiave e intensità sono in `spec/lighting.json`.

### Percorso del visitatore

Parte dal pianerottolo, entra dal portoncino e non torna mai due volte nello stesso salone: dalla camera baronale esce in terrazza, la percorre e rientra dal gran salone. La luce accompagna il cammino come una giornata: mattina nelle stanze sul retro, tramonto in terrazza e nei saloni, imbrunire nel finale.

| Sosta | Dove | Ora | Cosa mostra l'etichetta |
|---|---|---|---|
| 1 | Via Dante 28 - settimo piano | 8:00 | Unico appartamento al piano, scala B con ascensore |
| 2 | Ingresso |  | Il grande arco con vetrata Liberty: salotto e terrazza si vedono gia dalla soglia |
| 3 | Salotto | 8:24 | Nicchia divano di 4 metri e doppio affaccio sulla terrazza, al centro di tre saloni uniti da archi |
| 4 | Sala da pranzo | 8:48 | Tavolo per otto a un passo dalla cucina, in fila con salotto e gran salone |
| 5 | Cucina | 9:12 | Luminosa fin dal mattino: abitabile con isola in marmo, ingresso di servizio, balcone e lavanderia |
| 6 | Camera da letto | 9:36 | Matrimoniale silenziosa sul retro, esposta a sud, con portafinestra sul balcone |
| 7 | Bagno | 10:12 | Finestrato, con doccia a filo pavimento e maioliche siciliane |
| 8 | Camera baronale | 17:00 | Suite padronale: letto a baldacchino, cabina armadio, bagno privato e terrazza |
| 9 | Cabina armadio |  | Armadi a muro a tutta altezza tra camera e bagno |
| 10 | Bagno baronale | 17:48 | Quasi 8 m² finestrati: vasca su piedini, doppio lavabo in marmo e doccia |
| 11 | Terrazza su via Dante | 18:36 | Quasi 50 m² coperti: di fronte Palazzo Ziino, da un lato il Politeama, dall'altro il tramonto sui monti |
| 12 | Gran salone | 18:54 | Quasi 40 m² nella luce del tramonto: biblioteca, conversazione e pianoforte a coda |
| 13 | Ala dello studio | 19:06 | Guardaroba, ripostiglio e toilette ospiti: i servizi restano fuori dalla zona giorno |
| 14 | Studio | 19:12 | Ala indipendente con giardino d'inverno: studio oggi, terza camera domani |
| fine | Vista d'insieme | 19:36 | la camera si solleva: casa delle bambole |

Lunghezza del percorso 67 m, 14 soste, durata circa 128 secondi.

Lavanderia, ripostiglio, guardaroba, balcone della cucina e giardino d'inverno non hanno una sosta propria: si vedono dalla vista dall'alto finale e sono citati nelle etichette delle zone vicine.

### Verifica visiva

`spec/plan-overlay.png` sovrappone questa lettura alla planimetria originale: stanze colorate per zona, aperture, arredi e percorso del tour con le soste numerate. Le foto dell'annuncio usate per i controlli sono in `spec/riferimenti/foto/`.
