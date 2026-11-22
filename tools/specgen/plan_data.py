"""Dati geometrici dell'appartamento, misurati sulla planimetria catastale.

Scala stimata: 35 px = 1 m (origine pixel 60, 520), calibrata su due vincoli
indipendenti: 240 m2 commerciali dell'annuncio e rampe da 9 pedate da 30 cm.
Tutte le quote sono in metri, arrotondate a 5 cm.
"""

from __future__ import annotations

from typing import Dict, List

H = 3.0  # altezza netta interna dichiarata in planimetria

FOOTPRINT: List[List[float]] = [
    [8.40, 2.10, 15.20, 8.60],    # ala ovest
    [15.00, 0.30, 17.65, 5.55],   # vano scala
    [14.90, 5.35, 18.90, 8.60],   # ascensore e ingresso
    [17.45, 2.60, 28.85, 8.60],   # ala est
    [17.45, 1.05, 19.75, 2.60],   # lavanderia
    [2.10, 8.35, 28.85, 12.50],   # corpo su via Dante
]


def _room(rid: str, name: str, zone: str, rects: List[List[float]], label: List[float], plan_label: str, kind: str = "interior") -> Dict:
    return {"id": rid, "name": name, "zone": zone, "kind": kind, "rects": rects, "label": label, "planLabel": plan_label}


ROOMS: List[Dict] = [
    _room("pianerottolo", "Pianerottolo", "comune", [[15.20, 4.15, 17.45, 5.35]], [16.3, 4.75], "pianerottolo scala B", "common"),
    _room("ingresso", "Ingresso", "giorno", [[16.35, 5.55, 18.90, 8.50]], [17.6, 6.9], "(senza etichetta)"),
    _room("corridoio", "Galleria", "notte", [[18.90, 7.35, 26.00, 8.50], [25.00, 6.05, 26.00, 7.35]], [22.4, 7.92], "dis."),
    _room("salotto", "Salotto", "giorno", [[12.25, 8.60, 19.80, 12.25], [12.25, 7.25, 16.25, 8.60]], [15.2, 10.6], "(senza etichetta)"),
    _room("sala_pranzo", "Sala da pranzo", "giorno", [[19.90, 8.60, 23.80, 12.25]], [21.85, 11.6], "(senza etichetta)"),
    _room("cucina", "Cucina", "giorno", [[17.65, 2.80, 21.25, 5.45], [19.00, 5.45, 21.25, 7.20]], [19.4, 4.9], "cucina"),
    _room("lavanderia", "Lavanderia", "servizi", [[17.65, 1.20, 19.65, 2.60]], [18.65, 2.1], "lav."),
    _room("camera2", "Camera da letto", "notte", [[21.35, 2.80, 24.85, 7.20]], [22.6, 5.6], "(senza etichetta)"),
    _room("bagno2", "Bagno", "notte", [[25.00, 2.80, 26.45, 5.95]], [25.95, 4.6], "wc"),
    _room("camera_baronale", "Camera baronale", "notte", [[23.90, 8.60, 28.55, 12.25]], [25.3, 10.4], "(senza etichetta)"),
    _room("cabina_armadio", "Cabina armadio", "notte", [[26.55, 6.80, 27.80, 8.50]], [27.15, 7.65], "dis."),
    _room("bagno_baronale", "Bagno baronale", "notte", [[26.55, 2.80, 28.55, 6.70]], [27.5, 4.6], "wc"),
    _room("gran_salone", "Gran salone", "giorno", [[2.35, 8.60, 12.15, 12.25], [8.65, 7.60, 10.70, 8.60], [10.70, 7.25, 12.15, 8.60]], [7.2, 11.3], "(senza etichetta)"),
    _room("disimpegno_studio", "Disimpegno dello studio", "ala_studio", [[11.55, 5.10, 12.95, 7.15], [8.65, 6.35, 11.55, 7.15], [8.65, 7.15, 10.60, 7.50]], [12.25, 6.2], "dis."),
    _room("studio", "Studio", "ala_studio", [[8.65, 2.30, 11.45, 6.25]], [10.2, 4.6], "(senza etichetta)"),
    _room("toilette", "Toilette ospiti", "ala_studio", [[11.55, 2.30, 12.95, 5.00]], [12.25, 3.9], "wc"),
    _room("guardaroba", "Guardaroba", "ala_studio", [[13.05, 2.30, 15.00, 5.35], [13.05, 5.35, 14.70, 6.00]], [13.9, 4.2], "(senza etichetta)"),
    _room("ripostiglio", "Ripostiglio", "ala_studio", [[13.05, 6.10, 14.70, 7.15]], [13.9, 6.65], "rip."),
]

OUTDOOR: List[Dict] = [
    {
        "id": "terrazza", "name": "Terrazza su via Dante",
        "rects": [[0.45, 12.50, 28.85, 13.75], [4.60, 13.75, 23.60, 14.50]],
        "label": [14.1, 13.6],
        "covered": [[0.45, 12.50, 28.85, 13.75], [4.60, 13.75, 23.60, 14.50]],
        "enclosure": "ringhiera",
        "railings": [
            [0.45, 12.50, 0.45, 13.75], [0.45, 13.75, 4.60, 13.75], [4.60, 13.75, 4.60, 14.50],
            [4.60, 14.50, 23.60, 14.50], [23.60, 13.75, 23.60, 14.50], [23.60, 13.75, 28.85, 13.75],
            [28.85, 12.50, 28.85, 13.75],
        ],
    },
    {
        "id": "giardino_inverno", "name": "Giardino d'inverno",
        "rects": [[8.60, 0.65, 15.00, 2.10]], "label": [11.8, 1.4], "covered": [[8.60, 0.65, 15.00, 2.10]],
        "enclosure": "veranda",
        "railings": [[8.60, 0.65, 15.00, 0.65], [8.60, 0.65, 8.60, 2.10]],
    },
    {
        "id": "balcone_cucina", "name": "Balcone della cucina",
        "rects": [[19.75, 1.05, 24.25, 2.60]], "label": [22.0, 1.8], "covered": [[19.75, 1.05, 24.25, 2.60]],
        "enclosure": "ringhiera",
        "railings": [[19.75, 1.05, 24.25, 1.05], [24.25, 1.05, 24.25, 2.60]],
    },
]


def _op(oid: str, kind: str, rect: List[float], a: str, b: str, sill: float = 0.0, head: float = 2.30, walk: bool = True, note: str = "",
        shape: str = "rettangolo", spring: float = 0.0) -> Dict:
    wall_along = "x" if (rect[2] - rect[0]) > (rect[3] - rect[1]) else "z"
    width = (rect[2] - rect[0]) if wall_along == "x" else (rect[3] - rect[1])
    return {
        "id": oid, "type": kind, "rect": rect, "wallAlong": wall_along, "width": round(width, 2),
        "sill": sill, "head": head, "walk": walk, "from": a, "to": b, "shape": shape, "spring": spring, "note": note,
    }


FACADE = [12.25, 12.50]
OPENINGS: List[Dict] = [
    _op("p_ingresso", "entry", [16.55, 5.35, 17.40, 5.55], "pianerottolo", "ingresso", note="portoncino d'ingresso (freccia in planimetria)"),
    _op("p_servizio", "service", [17.45, 4.35, 17.65, 5.15], "pianerottolo", "cucina", head=2.20, note="ingresso di servizio in cucina (freccia in planimetria)"),
    _op("p_salotto", "double_door", [16.60, 8.50, 18.60, 8.60], "ingresso", "salotto", head=2.45, shape="arco", spring=1.85,
        note="arco ribassato esistente (foto dell'annuncio), luce 2,00 m; in stile Liberty riceve una vetrata a due ante"),
    _op("v_salone_salotto", "arch", [12.15, 9.45, 12.25, 11.30], "gran_salone", "salotto", head=2.45, shape="arco", spring=1.85,
        note="varco dell'infilata 1,85 m, reso ad arco come quello dell'ingresso"),
    _op("v_salotto_pranzo", "arch", [19.80, 9.35, 19.90, 11.20], "salotto", "sala_pranzo", head=2.45, shape="arco", spring=1.85,
        note="varco dell'infilata 1,85 m, reso ad arco come quello dell'ingresso"),
    _op("p_pranzo", "door", [20.00, 8.50, 20.85, 8.60], "corridoio", "sala_pranzo"),
    _op("p_cucina", "door", [20.00, 7.20, 20.85, 7.35], "corridoio", "cucina"),
    _op("p_camera2", "door", [21.60, 7.20, 22.40, 7.35], "corridoio", "camera2"),
    _op("p_bagno2", "door", [25.15, 5.95, 25.90, 6.05], "corridoio", "bagno2"),
    _op("p_baronale", "door", [24.35, 8.50, 25.15, 8.60], "corridoio", "camera_baronale"),
    _op("p_cabina", "door", [26.75, 8.50, 27.55, 8.60], "cabina_armadio", "camera_baronale"),
    _op("p_bagno_baronale", "door", [26.75, 6.70, 27.55, 6.80], "bagno_baronale", "cabina_armadio"),
    _op("p_disimpegno", "door", [11.05, 7.15, 11.90, 7.25], "disimpegno_studio", "gran_salone"),
    _op("p_studio", "door", [10.40, 6.25, 11.20, 6.35], "studio", "disimpegno_studio"),
    _op("p_toilette", "door", [12.05, 5.00, 12.80, 5.10], "toilette", "disimpegno_studio"),
    _op("p_guardaroba", "door", [12.95, 5.15, 13.05, 5.90], "disimpegno_studio", "guardaroba"),
    _op("p_ripostiglio", "door", [12.95, 6.25, 13.05, 6.95], "disimpegno_studio", "ripostiglio"),
    _op("p_lavanderia", "door", [19.65, 1.50, 19.75, 2.30], "lavanderia", "balcone_cucina", head=2.20),
    # portefinestre sui balconi del cortile
    _op("pf_studio", "french", [9.45, 2.10, 10.60, 2.30], "giardino_inverno", "studio", head=2.50),
    _op("pf_cucina", "french", [19.95, 2.60, 20.95, 2.80], "balcone_cucina", "cucina", head=2.50),
    _op("pf_camera2", "french", [22.65, 2.60, 23.85, 2.80], "balcone_cucina", "camera2", head=2.50),
    # facciata su via Dante: portafinestra singola oppure portafinestra con finestra affiancata
    _op("f_salone_1", "window", [2.45, FACADE[0], 3.45, FACADE[1]], "gran_salone", "terrazza", sill=0.90, head=2.50, walk=False,
        note="finestra, non portafinestra: confermato dalle foto"),
    _op("pf_salone_2", "french", [5.25, FACADE[0], 6.05, FACADE[1]], "gran_salone", "terrazza", head=2.50),
    _op("f_salone_2", "window", [6.05, FACADE[0], 7.25, FACADE[1]], "gran_salone", "terrazza", sill=0.90, head=2.50, walk=False),
    _op("pf_salone_3", "french", [9.40, FACADE[0], 10.20, FACADE[1]], "gran_salone", "terrazza", head=2.50),
    _op("f_salone_3", "window", [10.20, FACADE[0], 11.35, FACADE[1]], "gran_salone", "terrazza", sill=0.90, head=2.50, walk=False),
    _op("pf_salotto_1", "french", [13.10, FACADE[0], 13.90, FACADE[1]], "salotto", "terrazza", head=2.50),
    _op("f_salotto_1", "window", [13.90, FACADE[0], 15.05, FACADE[1]], "salotto", "terrazza", sill=0.90, head=2.50, walk=False),
    _op("pf_salotto_2", "french", [16.75, FACADE[0], 17.55, FACADE[1]], "salotto", "terrazza", head=2.50),
    _op("f_salotto_2", "window", [17.55, FACADE[0], 18.75, FACADE[1]], "salotto", "terrazza", sill=0.90, head=2.50, walk=False),
    _op("f_pranzo", "window", [21.10, FACADE[0], 22.15, FACADE[1]], "sala_pranzo", "terrazza", sill=0.90, head=2.50, walk=False,
        note="solo finestra: dalle foto la sala da pranzo non ha uscita in terrazza"),
    _op("pf_baronale", "french", [25.70, FACADE[0], 26.75, FACADE[1]], "camera_baronale", "terrazza", head=2.50),
    # finestre sul retro
    _op("f_toilette", "window", [11.95, 2.10, 12.60, 2.30], "giardino_inverno", "toilette", sill=1.10, head=2.30, walk=False),
    _op("f_guardaroba", "window", [13.60, 2.10, 14.40, 2.30], "giardino_inverno", "guardaroba", sill=0.90, head=2.30, walk=False),
    _op("f_bagno2", "window", [25.60, 2.60, 26.30, 2.80], "_cortile", "bagno2", sill=1.10, head=2.30, walk=False),
    _op("f_bagno_baronale", "window", [26.70, 2.60, 27.35, 2.80], "_cortile", "bagno_baronale", sill=1.10, head=2.30, walk=False),
    _op("f_lavanderia", "window", [18.35, 1.05, 18.95, 1.20], "_cortile", "lavanderia", sill=1.40, head=2.20, walk=False),
    _op("f_scala", "window", [15.30, 0.30, 16.20, 0.50], "_cortile", "_rampe", sill=1.00, head=2.30, walk=False),
]

SOLIDS: List[Dict] = [
    {"id": "setto_salotto", "type": "stub", "rect": [16.25, 8.60, 16.35, 9.55], "h": H, "note": "setto residuo che divide le due campate del salotto"},
    {"id": "spalla_nicchia_o", "type": "stub", "rect": [12.25, 8.40, 12.90, 8.60], "h": H, "note": "spalla della nicchia dal lato -x"},
    {"id": "spalla_nicchia_e", "type": "stub", "rect": [16.10, 8.40, 16.25, 8.60], "h": H, "note": "spalla della nicchia dal lato +x"},
    {"id": "pilastro_salone", "type": "pilaster", "rect": [8.65, 8.40, 8.85, 8.60], "h": H, "note": "pilastro d'angolo"},
] + [
    {"id": f"pilastro_terrazza_{n}", "type": "pillar", "rect": [x, 13.35, round(x + 0.20, 2), 13.75], "h": H, "note": "pilastro della loggia"}
    for n, x in enumerate([4.40, 8.25, 12.20, 15.90, 19.75, 23.60], start=1)
]

BUILTINS: List[Dict] = [
    {"id": "armadio_muro_galleria", "rect": [26.00, 6.05, 26.45, 8.50], "front": "-x", "note": "armadio a muro (diagonale in planimetria)"},
    {"id": "armadio_muro_cabina", "rect": [27.80, 6.80, 28.55, 8.50], "front": "-x", "note": "armadio a muro (diagonale in planimetria)"},
]

BEAMS: List[Dict] = [
    {"id": "trave_salone", "room": "gran_salone", "rect": [8.65, 8.60, 8.85, 12.25], "y0": 2.60,
     "note": "trave ribassata tra le due campate del gran salone: oggi sotto c'è un tramezzo con porta scorrevole (foto), qui rimosso"},
    {"id": "trave_nicchia", "room": "salotto", "rect": [12.90, 8.40, 16.10, 8.60], "y0": 2.50,
     "note": "architrave ribassato sul fronte della nicchia del salotto (foto)"},
]

STAIRS: Dict = {
    "rect": [15.20, 0.50, 17.45, 4.15],
    "halfLanding": [15.20, 0.50, 17.45, 1.45],
    "flights": [
        {"id": "rampa_salita", "rect": [15.20, 1.45, 16.20, 4.15], "treads": 9, "direction": "sale andando verso -z, da quota 0 a +1,65"},
        {"id": "rampa_discesa", "rect": [16.45, 1.45, 17.45, 4.15], "treads": 9, "direction": "scende andando verso -z, da quota 0 a -1,65"},
    ],
    "well": [16.20, 1.45, 16.45, 4.15],
    "walkable": False,
}

COMMON: Dict = {
    "elevatorShaft": [14.90, 5.55, 16.15, 7.05],
    "elevatorDoor": {"x0": 15.35, "x1": 16.05, "z": 5.35, "facing": "-z", "note": "porta ascensore sul pianerottolo, chiusa, solo decorativa"},
}

CONTEXT: Dict = {
    "terraceLevel": 23.0,
    "blocks": [
        {"id": "edificio_confinante", "rects": [[-3.00, 0.30, 8.40, 8.35], [-3.00, 8.35, 2.10, 12.50]], "h": H,
         "note": "unita confinante F.121 P.104 SUB 68: volume neutro, nessun dettaglio"},
    ],
    "building": {"floorsBelow": 7, "floorsAbove": 1, "look": "condominio del 1970: intonaco beige, pannelli in klinker bruno tra le finestre, balconi continui con ringhiere scure a bacchette, negozi al piano terra con fascia rossa senza scritte"},
    "street": {"name": "via Dante", "zNear": 15.0, "zFar": 34.0,
               "note": "circa 19 m tra i fronti: marciapiedi alberati, due file di auto in sosta, due corsie; prosegue diritta in entrambe le direzioni"},
    "landmarks": [
        {"id": "palazzo_ziino", "name": "Palazzo Ziino (via Dante 53)", "rect": [-26.0, 34.0, 6.0, 52.0], "eavesY": -6.0, "ridgeY": -3.0,
         "note": "di fronte, spostato verso il Politeama: palazzo d'epoca di quattro piani, intonaco rosa, cornici e balconi bianchi, tetto a padiglione in coppi; dalla terrazza se ne vede il tetto"},
        {"id": "politeama", "name": "Teatro Politeama Garibaldi", "at": [-240.0, 24.0],
         "note": "in fondo a via Dante verso -x: rotonda con colonne e arco con gruppo scuro in cima; solo sagoma"},
        {"id": "monte_cuccio", "name": "Monte Cuccio", "at": [900.0, 24.0],
         "note": "in fondo a via Dante verso +x: monte dal profilo a punta, con altre creste ai lati; va nel fondale"},
    ],
    "surroundings": {
        "acrossStreet": "verso +x palazzi d'epoca ocra e gialli di 4-5 piani con tetti in coppi, più bassi della terrazza; dietro di loro condomini moderni chiari di 8-9 piani",
        "rear": "verso -z, oltre i balconi del retro: tetti in coppi di edifici bassi (colmi tra y = -14 e y = -8), un condominio grigio, vista aperta fino ai monti",
        "farTowardMinusX": "in lontananza gru del porto e foschia chiara",
    },
}

META: Dict = {
    "title": "Attico Liberty - Via Dante 28, Palermo",
    "address": "Via Dante 28, 90141 Palermo, angolo via Principe di Villafranca (sopra il negozio Expert, di fronte a Palazzo Ziino)",
    "floor": 7,
    "stair": "Scala B",
    "ceilingHeight": H,
    "units": "m",
    "snap": 0.05,
    "axes": {"x": "+x lungo via Dante verso i monti (ovest-sud-ovest); -x verso il Politeama", "y": "alto, pavimento finito a quota 0",
             "z": "+z verso via Dante (facciata con la terrazza); -z verso il retro (cucina, camere, sole)"},
    "rectFormat": "[x0, z0, x1, z1] con x0<x1 e z0<z1",
    "spaceFields": "label = punto dove scrivere il nome in pianta (puo cadere su un mobile); spawn = punto libero dove arriva il visitatore con teleport(id)",
    "scale": {"pxPerMeter": 35, "originPx": [60, 520], "tolerance": "circa 5 percento: la planimetria non riporta quote"},
    "orientation": {"facadeNormal": "+z", "bearings": {"+z": 330, "+x": 240, "-z": 150, "-x": 60},
                    "note": "la terrazza su via Dante guarda a nord-nord-ovest; il retro (cucina, camere, bagni) guarda a sud-sud-est e prende il sole di giorno; "
                            "il sole tramonta verso +x e +z, sui monti in fondo alla via. Fonti: bussola della planimetria, foto dell'annuncio (sole dietro l'edificio, monti in fondo alla via)"},
    "listing": {"commercialArea": 240, "rooms": 8, "year": 1970, "note": "unico al piano; terrazza in parte coperta"},
}


def build_plan() -> Dict:
    """Assembla il dizionario completo che diventa spec/plan.json."""
    return {
        "meta": META, "footprint": FOOTPRINT, "rooms": ROOMS, "outdoor": OUTDOOR, "openings": OPENINGS,
        "solids": SOLIDS, "builtins": BUILTINS, "beams": BEAMS, "stairs": STAIRS, "common": COMMON, "context": CONTEXT,
    }
