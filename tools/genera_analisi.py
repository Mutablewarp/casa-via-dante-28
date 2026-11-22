"""Rigenera spec/01-ANALISI-PLANIMETRIA.md dai file JSON di spec/.

Uso: python3 tools/genera_analisi.py   (dopo tools/genera_spec.py)
"""

from __future__ import annotations

import json
import logging
import math
from pathlib import Path
from typing import Any, Dict, List

logger = logging.getLogger("genera_analisi")
SPEC = Path(__file__).resolve().parent.parent / "spec"

ZONE = {"giorno": "giorno", "notte": "notte", "servizi": "servizi", "ala_studio": "ala dello studio", "comune": "parte comune"}
TIPO = {"entry": "portoncino d'ingresso", "service": "porta di servizio", "double_door": "arco con vetrata", "arch": "arco",
        "door": "porta", "french": "portafinestra", "window": "finestra"}
TINTE = {"#D9B982": "ocra dorata", "#D7A486": "rosa antico", "#E0C388": "giallo Napoli", "#A8B598": "verde salvia", "#EDE4CD": "avorio",
         "#B5C6CE": "celeste polvere", "#E6E0D0": "sabbia chiara", "#CFA998": "cipria", "#E3D6C2": "tortora chiaro", "#BCCFC2": "verde acqua",
         "#E0CBA0": "ocra chiara", "#8F9E86": "verde bosco", "#D6C3B0": "tortora", "#E8DDC8": "crema", "#EEE8DA": "bianco caldo", "#E9E4D8": "grigio caldo"}
PAVIMENTI = {"marmo_scacchiera": "marmo a scacchiera bianco e grigio Billiemi", "parquet_spina_noce": "parquet di noce a spina di pesce",
             "parquet_spina_rovere": "parquet di rovere a spina di pesce", "cementine_stella": "cementine a stella ocra e blu",
             "cementine_semplici": "cementine a scacco grigio e crema", "maiolica_pavimento": "maiolica bianca e blu",
             "marmo_scacchiera_verde": "marmo a scacchiera bianco e verde", "marmo_condominio": "marmo grigio",
             "cotto_spina": "cotto a spina di pesce, come oggi"}
NOTE_ESTERNI = {"terrazza": "lunga 28,40 m: fascia profonda 1,25 m più avancorpo centrale di 19,00 × 0,75 m; sei pilastri; tutta coperta dal balcone del piano di sopra",
                "giardino_inverno": "oggi veranda vetrata; accesso dallo studio",
                "balcone_cucina": "accesso da cucina e camera; da qui si entra in lavanderia; affaccio a sud sui tetti"}
DUBBI = [
    ("Nessuna quota sul disegno", "Scala stimata a 35 px/m con due verifiche incrociate (vedi sopra)."),
    ("Sette vani non hanno etichetta", "Destinazione assegnata in base a posizione, collegamenti e richiesta: gran salone, salotto, sala da pranzo, camera baronale, camera da letto, studio, guardaroba."),
    ("Tre locali wc ma la richiesta è di due bagni", "Due bagni completi più una toilette ospiti; variante «dispensa e cantinetta» già pronta."),
    ("Orientamento: la bussola del disegno è ambigua", "Risolto con le foto: la terrazza guarda a nord-nord-ovest, il retro a sud-sud-est."),
    ("In facciata, porte strette affiancate a finestre", "Confermato dalle foto: portafinestra a un'anta più finestra con davanzale, sotto un unico cassonetto."),
    ("Due aperture in facciata con il segno tratteggiato", "Dalle foto sono finestre, non portefinestre: la prima del gran salone e quella della sala da pranzo."),
    ("Varco largo 2 m tra ingresso e salotto", "Dalle foto è un arco ribassato con mostra in legno: mantenuto, con vetrata Liberty."),
    ("Varchi larghi tra gran salone, salotto e sala da pranzo", "Oggi hanno porte scorrevoli; nel progetto diventano archi come quello dell'ingresso."),
    ("Le foto mostrano due tramezzi che il disegno non ha", "Uno divide il gran salone, l'altro restringe il salotto. Si segue la planimetria: tramezzi rimossi, resta una trave a soffitto nel gran salone."),
    ("Setto corto che sporge nel salotto", "Mantenuto come da disegno (0,95 m); nelle foto corrisponde alla spalla della nicchia."),
    ("Due rettangoli con diagonale vicino ai bagni", "Armadi a muro: confermati dalle foto, con ante rivestite in tessuto a fiori."),
    ("Linea tratteggiata verticale nel disimpegno dello studio", "Ignorata: non delimita ambienti."),
    ("Sei rettangolini sul bordo della terrazza", "Pilastri bianchi, confermati dalle foto."),
    ("Archi di cerchio agli estremi della terrazza", "Angoli arrotondati dei balconi, visibili nella foto della facciata: non modellati."),
    ("Balcone dello studio", "Dalle foto è una veranda chiusa da una vetrata: diventa giardino d'inverno."),
    ("Altezza di porte e davanzali non indicata", "Porte interne 2,30 m; archi 2,45 m in chiave con imposta a 1,85 m; portefinestre 2,50 m; davanzali 0,90 m, 1,10 m nei bagni."),
    ("Larghezza di via Dante e altezza degli edifici di fronte", "Circa 19 m tra i fronti; palazzi di fronte più bassi della terrazza di 3-7 m. Valori indicativi dalle foto."),
]


def num(v: float) -> str:
    """Numero con la virgola e due decimali."""
    return f"{v:.2f}".replace(".", ",")


def build() -> List[str]:
    """Compone il documento riga per riga."""
    p: Dict[str, Any] = json.loads((SPEC / "plan.json").read_text())
    t: Dict[str, Any] = json.loads((SPEC / "tour.json").read_text())
    st: Dict[str, Any] = json.loads((SPEC / "styles.json").read_text())["styles"]["liberty"]
    nomi = {s["id"]: s["name"] for s in p["rooms"] + p["outdoor"]}
    nomi.update({"_cortile": "esterno sul retro", "_rampe": "rampe della scala"})
    out: List[str] = []
    a = out.append
    a("# 01 · Analisi della planimetria e piano del tour\n")
    a("Questo documento è la risposta al primo dei cinque prompt («analizza la planimetria, elenca stanze, porte, finestre e scale, indica l'altezza delle pareti, segnala ciò che non è chiaro, poi pianifica il tour; non scrivere codice»). I numeri sono generati da `spec/plan.json`, fonte unica per gli agenti. Per rigenerarlo: `python3 tools/genera_analisi.py`.\n")
    a("## Dati di partenza\n")
    a("| Voce | Valore | Fonte |\n|---|---|---|")
    a("| Indirizzo | Via Dante 28, 90141 Palermo, angolo via Principe di Villafranca | negozio Expert al civico 28; annuncio immobiliare |")
    a("| Piano | Settimo, scala B, con ascensore; unico appartamento al piano | planimetria, annuncio |")
    a("| Altezza interna | **3,00 m** | planimetria («h = 3.00 m») |")
    a("| Superficie commerciale | 240 m², 8 locali, anno 1970, da ristrutturare | annuncio |")
    a(f"| Superficie netta calcolata | **{num(p['meta']['totals']['interni'])} m² interni**, **{num(p['meta']['totals']['esterni'])} m² tra terrazza, balcone e giardino d'inverno** | `plan.json` |")
    a("| Orientamento | Terrazza su via Dante a nord-nord-ovest; retro a sud-sud-est, soleggiato | bussola della planimetria, foto dell'annuncio |")
    a("| Vista | Di fronte Palazzo Ziino (via Dante 53); in fondo alla via da un lato il Politeama, dall'altro i monti; sul retro tetti in coppi | foto dell'annuncio, ricerca |")
    a("| Unità confinante | F.121 P.104 SUB 68, dal lato del Politeama | planimetria |\n")
    a("### Scala del disegno\n")
    a("La planimetria catastale non riporta quote. La scala adottata è **35 pixel = 1 metro**, ricavata da due vincoli indipendenti che danno lo stesso risultato:\n")
    a("1. **Superficie.** Con 35 px/m la somma di superficie lorda interna e terrazze ponderate al 30 % dà circa 240 m², cioè il dato dell'annuncio.")
    a("2. **Scala condominiale.** Ogni rampa ha 9 pedate disegnate in 95 pixel: con 35 px/m la pedata è 30 cm e la rampa è larga 1,00 m.\n")
    a("Tutte le misure sono arrotondate a 5 cm. Tolleranza stimata: circa 5 %.\n")
    a("### Sistema di coordinate\n")
    a("- `+x` corre lungo via Dante verso i monti; `-x` verso il Politeama.\n- `+z` va verso via Dante (facciata con la terrazza); `-z` verso il retro.\n- `y` è l'altezza; pavimento finito a quota 0, soffitto a 3,00.\n- Un rettangolo è sempre `[x0, z0, x1, z1]`.\n- Le direzioni si indicano con gli assi, non con i punti cardinali.\n")
    a("## Stanze\n")
    a("| Stanza | Etichetta in planimetria | Zona | Dimensioni | Superficie |\n|---|---|---|---|---|")
    for r in p["rooms"]:
        a(f"| **{r['name']}** (`{r['id']}`) | {r['planLabel']} | {ZONE[r['zone']]} | {r['dims'].replace('.', ',')} | {num(r['area'])} m² |")
    a("\n## Spazi esterni\n")
    a("| Spazio | Dimensioni | Superficie | Note |\n|---|---|---|---|")
    for s in p["outdoor"]:
        a(f"| **{s['name']}** (`{s['id']}`) | {s['dims'].replace('.', ',')} | {num(s['area'])} m² | {NOTE_ESTERNI[s['id']]} |")
    a("\n## Porte, archi e finestre\n")
    a("`Larghezza` è la luce del foro; `davanzale` e `chiave` sono le quote da pavimento del bordo inferiore e superiore. Le porte interne in planimetria misurano 60-70 cm e sono state portate a 75-85 cm mantenendo il centro.\n")
    a("| Id | Tipo | Collega | Larghezza | Davanzale | Chiave |\n|---|---|---|---|---|---|")
    conta: Dict[str, int] = {}
    for q in p["openings"]:
        conta[q["type"]] = conta.get(q["type"], 0) + 1
        a(f"| `{q['id']}` | {TIPO[q['type']]} | {nomi[q['from']]} ↔ {nomi[q['to']]} | {num(q['width'])} m | {num(q['sill'])} | {num(q['head'])} |")
    a(f"\nTotale: {len(p['openings'])} aperture ({', '.join(f'{v} {TIPO[k]}' for k, v in conta.items())}).\n")
    a("## Scala e ascensore\n")
    a("- **Vano scala** a due rampe parallele con pozzo centrale: interno 2,25 × 4,85 m. Rampe larghe 1,00 m con 9 pedate da 30 cm; gradini in marmo, ringhiera in ferro con corrimano in legno.\n- **Pianerottolo** 2,25 × 1,20 m: da qui partono il portoncino d'ingresso e la porta di servizio che entra direttamente in cucina (le due frecce della planimetria).\n- **Ascensore**: vano 1,25 × 1,50 m con porta sul pianerottolo.\n- Non ci sono scale interne all'appartamento.\n")
    a("## Elementi poco chiari e come sono stati risolti\n")
    a("| N. | Cosa non era chiaro | Scelta adottata |\n|---|---|---|")
    for n, (x, y) in enumerate(DUBBI, 1):
        a(f"| {n} | {x} | {y} |")
    a("\n## Piano del tour\n")
    a("### Idea guida\n")
    a("Un attico borghese del 1970 riletto come **casa Liberty palermitana**: il riferimento è la stagione di Ernesto Basile e dei mobili Ducrot. Legno di noce con linee a colpo di frusta, ottone, vetri colorati, velluti verde bottiglia e bordeaux, tappeti persiani, cementine e marmo grigio di Billiemi. Alle pareti una finitura tipo **Terre Fiorentine**: velature opache a nuvola nei toni delle terre, una tinta diversa per ogni ambiente. L'arco ribassato dell'ingresso, che la casa ha già, diventa il motivo ricorrente.\n")
    a("L'appartamento si organizza in quattro parti:\n")
    a("- **Rappresentanza su via Dante**: gran salone, salotto e sala da pranzo in infilata, uniti da archi; gran salone e salotto si aprono sulla terrazza.\n- **Zona notte**: camera baronale con cabina armadio, bagno privato e uscita in terrazza; camera da letto e bagno sulla galleria, al sole del retro.\n- **Cucina e servizi sul retro**: cucina abitabile con ingresso di servizio, balcone e lavanderia.\n- **Ala dello studio**: studio con giardino d'inverno, guardaroba, ripostiglio, toilette ospiti.\n")
    a("### Materiali per ambiente (stile Liberty)\n")
    a("| Ambiente | Parete | Pavimento |\n|---|---|---|")
    for r in p["rooms"]:
        a(f"| {r['name']} | Terre Fiorentine {TINTE[st['walls'][r['id']]]} (`{st['walls'][r['id']]}`) | {PAVIMENTI[st['floors'][r['id']]]} |")
    for s in p["outdoor"]:
        a(f"| {s['name']} | klinker bruno e intonaco beige, come oggi | {PAVIMENTI[st['floors'][s['id']]]} |")
    a("\nSoffitti bianco caldo con cornice in stucco e rosone sotto ogni lampadario. Nei bagni e in cucina, zoccolatura in maiolica o marmo fino a 1,35 m. L'arredo completo, pezzo per pezzo, è in `spec/furnishing.json`; le regole di stile sono in `03-DESIGN.md`.\n")
    a("### Illuminazione\n")
    a("- **Mattina e mezzogiorno**: il sole è sul retro ed entra in cucina, camera, bagni, studio e giardino d'inverno; i saloni su via Dante hanno luce diffusa e morbida.\n- **Tardo pomeriggio e tramonto**: il sole scende verso i monti in fondo a via Dante, passa sotto il soffitto della terrazza ed entra basso e dorato nei tre saloni e nella camera baronale.\n- **Notte**: lampadari a bracci in ottone, lampade da tavolo e applique accesi con luce calda; cielo scuro, finestre accese negli edifici di fronte.\n- Fotogrammi chiave e intensità sono in `spec/lighting.json`.\n")
    a("### Percorso del visitatore\n")
    a("Parte dal pianerottolo, entra dal portoncino e non torna mai due volte nello stesso salone: dalla camera baronale esce in terrazza, la percorre e rientra dal gran salone. La luce accompagna il cammino come una giornata: mattina nelle stanze sul retro, tramonto in terrazza e nei saloni, imbrunire nel finale.\n")
    a("| Sosta | Dove | Ora | Cosa mostra l'etichetta |\n|---|---|---|---|")
    n = 0
    for w in t["path"]:
        s = w.get("stop")
        if s:
            n += 1
            ora = "" if s["hour"] is None else f"{int(s['hour'])}:{round((s['hour'] % 1) * 60):02d}"
            a(f"| {n} | {s['title']} | {ora} | {s['highlight']} |")
    a(f"| fine | {t['finale']['title']} | {int(t['finale']['hour'])}:{round((t['finale']['hour'] % 1) * 60):02d} | la camera si solleva: casa delle bambole |\n")
    lung = sum(math.dist(x["p"], y["p"]) for x, y in zip(t["path"], t["path"][1:]))
    sosta = sum(w["stop"]["dwell"] for w in t["path"] if "stop" in w)
    a(f"Lunghezza del percorso {round(lung)} m, {n} soste, durata circa {round(lung / t['settings']['walkSpeed'] + sosta + t['finale']['riseSeconds'])} secondi.\n")
    a("Lavanderia, ripostiglio, guardaroba, balcone della cucina e giardino d'inverno non hanno una sosta propria: si vedono dalla vista dall'alto finale e sono citati nelle etichette delle zone vicine.\n")
    a("### Verifica visiva\n")
    a("`spec/plan-overlay.png` sovrappone questa lettura alla planimetria originale: stanze colorate per zona, aperture, arredi e percorso del tour con le soste numerate. Le foto dell'annuncio usate per i controlli sono in `spec/riferimenti/foto/`.")
    return out


def main() -> None:
    """Scrive il file."""
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    righe = build()
    (SPEC / "01-ANALISI-PLANIMETRIA.md").write_text("\n".join(righe) + "\n", encoding="utf-8")
    logger.info("scritto spec/01-ANALISI-PLANIMETRIA.md (%d righe)", len(righe))


if __name__ == "__main__":
    main()
