# Rapporto finale · Attico Liberty, via Dante 28

Tour 3D nel browser di un attico al settimo piano di via Dante 28, a Palermo, di fronte a Palazzo Ziino.
Tutto sta in un solo file, `index.html` (1,2 MB): nessuna richiesta di rete, si apre con un doppio clic.

## Cosa c'è

- **La casa**: pianta ricostruita dalla planimetria catastale, 196 m² interni e 66 m² tra terrazza, balcone e giardino d'inverno. Muri, archi ribassati, vetrata Liberty, portefinestre, terrazza con pilastri e ringhiera a bacchette.
- **L'arredo**: circa 200 oggetti in tre stili, che si cambiano al volo: **Liberty palermitano** (noce, ottone, velluti, Terre Fiorentine alle pareti, tappeti persiani), **Moderno**, **Scandinavo**. Tavola apparecchiata per otto, letti rifatti, cucina con maioliche e rame, letto a baldacchino nella camera baronale.
- **Il contesto**: via Dante con Palazzo Ziino di fronte, il Politeama da un lato, il Monte Cuccio in fondo alla via. Palazzi con balconi e persiane, tetti in coppi con comignoli e antenne, viale alberato con auto, cielo con nuvole che scorrono con l'ora.
- **La luce**: un cursore porta l'ora dalle 6 alle 23. Sole del mattino nelle stanze sul retro, tramonto dorato in terrazza e nei saloni, lampade accese di notte. La resa è fotografica: ogni stanza ha la propria luce indiretta, gli angoli e i contatti dei mobili sono ombreggiati, le finestre in controluce si bruciano con un leggero alone, l'esposizione si adatta come in una macchina fotografica passando da dentro a fuori, il sole proietta le ombre dei palazzi e degli alberi sulle vie.
- **I materiali**: parquet con venatura, cotto e maioliche con rilievo, specchi che riflettono la stanza, vetri trasparenti con il riflesso del cielo ad angolo radente.
- **Il tour guidato**: 14 soste, ognuna con nome della stanza, superficie e una frase. La luce passa dal mattino al tramonto e il tour finisce con la salita alla vista dall'alto. Sottofondo musicale generato dal codice, che si può spegnere.

## Comandi

| Comando | Effetto |
|---|---|
| **Avvia tour** (o tasto `T`) | parte il tour guidato; `Spazio` lo mette in pausa |
| `W` `A` `S` `D` o frecce | camminare in prima persona |
| clic sulla scena, poi mouse | guardarsi intorno (`Esc` libera il mouse) |
| **Vista dall'alto** (o tasto `M`) | casa delle bambole senza soffitti; doppio clic su una stanza per entrarci |
| `1` `2` `3` | Liberty, Moderno, Scandinavo |
| cursore dell'ora, `,` e `.` | ora del giorno |
| `N` | musica |
| `H` | elenco dei comandi |

Sul telefono: joystick a sinistra per camminare, trascinamento a destra per guardare.

## Verifiche

- 41 controlli automatici (`npm test`): 11 sulla geometria della pianta, 30 nel browser su involucro, arredo, luce, tour, musica e comandi. Dopo il rifacimento della resa (novembre 2026): 11 su 11 e 29 su 30 verdi. Il trentesimo, la dissolvenza della musica (T3.9), non è stato verificabile: sulla macchina di prova l'audio non avanzava e lo stesso controllo falliva anche sulla versione precedente, che non è stata toccata nel codice della musica.
- 48 requisiti su 49 soddisfatti. L'unico aperto è la pubblicazione (R39), chiusa con questo rilascio.
- Prestazioni misurate: al massimo 418 chiamate di disegno in prima persona e 551 dall'alto, 510 000 triangoli, 113 texture, avvio in 2,5 s, 60 fotogrammi al secondo a riposo e circa 45 mentre l'ora cambia.

## Difetti noti

- Nel legno chiaro di Moderno e Scandinavo la venatura è a onde larghe. (Il colore pallido e grigio-azzurro di questi due stili è stato corretto dopo il collaudo: meno luce ambiente, cielo dell'emisfero più caldo.)
- Tra l'isola e le basi della cucina il passaggio è stretto (55-60 cm): è un dato della pianta.
- Alla prima accensione delle luci serali e al primo cambio di stile può esserci un breve blocco, tra 0,1 e 0,5 s. Al cambio di vista e ai salti d'ora la luce delle stanze si ricalcola: una pausa di circa mezzo secondo.
- In qualità bassa (telefoni lenti) non ci sono ombre del sole, occlusione né alone.
- I vetri riflettono la stanza in cui ci si trova, non ciò che hanno davvero di fronte: da vicino il riflesso può non corrispondere.
- Il Politeama è solo una sagoma; le piante viste da vicino sono un po' spigolose.

Proposta d'arredo. Misure indicative ricavate dalla planimetria catastale.
