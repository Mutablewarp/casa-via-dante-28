# Rapporto finale · Attico Liberty, via Dante 28

Tour 3D nel browser di un attico al settimo piano di via Dante 28, a Palermo, di fronte a Palazzo Ziino.
Tutto sta in un solo file, `index.html` (1,1 MB): nessuna richiesta di rete, si apre con un doppio clic.

## Cosa c'è

- **La casa**: pianta ricostruita dalla planimetria catastale, 196 m² interni e 66 m² tra terrazza, balcone e giardino d'inverno. Muri, archi ribassati, vetrata Liberty, portefinestre, terrazza con pilastri e ringhiera a bacchette.
- **L'arredo**: circa 200 oggetti in tre stili, che si cambiano al volo: **Liberty palermitano** (noce, ottone, velluti, Terre Fiorentine alle pareti, tappeti persiani), **Moderno**, **Scandinavo**. Tavola apparecchiata per otto, letti rifatti, cucina con maioliche e rame, letto a baldacchino nella camera baronale.
- **Il contesto**: via Dante con Palazzo Ziino di fronte, il Politeama da un lato, il Monte Cuccio in fondo alla via, tetti in coppi sul retro.
- **La luce**: un cursore porta l'ora dalle 6 alle 23. Sole del mattino nelle stanze sul retro, tramonto dorato in terrazza e nei saloni, lampade accese di notte. Ombre morbide e riflessi sui pavimenti lucidi.
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

- 41 controlli automatici verdi (`npm test`): 11 sulla geometria della pianta, 30 nel browser su involucro, arredo, luce, tour, musica e comandi.
- 48 requisiti su 49 soddisfatti. L'unico aperto è la pubblicazione (R39), chiusa con questo rilascio.
- Prestazioni misurate: al massimo 380 chiamate di disegno in prima persona e 518 dall'alto, 423 000 triangoli, avvio in 1,5 s, fotogramma tra 2 e 7 ms.

## Difetti noti

- Nel legno chiaro di Moderno e Scandinavo la venatura è a onde larghe. (Il colore pallido e grigio-azzurro di questi due stili è stato corretto dopo il collaudo: meno luce ambiente, cielo dell'emisfero più caldo.)
- Tra l'isola e le basi della cucina il passaggio è stretto (55-60 cm): è un dato della pianta.
- Alla prima accensione delle luci serali e al primo cambio di stile può esserci un breve blocco, tra 0,1 e 0,5 s.
- Il Politeama è solo una sagoma; le piante viste da vicino sono un po' spigolose.

Proposta d'arredo. Misure indicative ricavate dalla planimetria catastale.
