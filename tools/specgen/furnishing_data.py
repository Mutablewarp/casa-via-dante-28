"""Arredo in stile Liberty: ogni oggetto ha posizione, ingombro e orientamento gia decisi.

Gli agenti NON progettano la disposizione: la leggono da spec/furnishing.json.
Tipi di riga:
    fl   oggetto a pavimento (rettangolo d'ingombro, altezza, lato frontale)
    rug  tappeto (nessuna collisione)
    wl   oggetto a parete (punto di ancoraggio sul filo muro, lato verso cui guarda)
    cl   oggetto a soffitto (punto, lunghezza di caduta)
    cur  tende, legate a una o piu aperture
"""

from __future__ import annotations

from typing import Any, Dict, List

ROT = {"S": 0, "E": 90, "N": 180, "W": 270}  # gradi attorno a Y; 0 = fronte verso +z
# Qui le lettere sono solo una scorciatoia di scrittura: S = +z (via Dante), E = +x, N = -z (retro), W = -x.
# Nel JSON finiscono come assi, perche la facciata reale guarda a nord-nord-ovest e i punti cardinali confonderebbero.
AXIS = {"S": "+z", "E": "+x", "N": "-z", "W": "-x"}

ITEMS: List[Dict[str, Any]] = []


def fl(iid: str, room: str, kind: str, rect: List[float], h: float, face: str, **opts: Any) -> None:
    """Oggetto a pavimento."""
    x0, z0, x1, z1 = rect
    along_x = face in ("S", "N")
    size = [round((x1 - x0) if along_x else (z1 - z0), 3), round((z1 - z0) if along_x else (x1 - x0), 3), h]
    ITEMS.append({
        "id": iid, "room": room, "mount": "floor", "type": kind, "rect": rect, "face": AXIS[face],
        "at": [round((x0 + x1) / 2, 3), round((z0 + z1) / 2, 3)], "size": size, "rot": ROT[face],
        "collide": opts.pop("collide", True), "variant": opts.pop("variant", None),
        "props": opts.pop("props", []), "light": opts.pop("light", None), "opts": opts,
    })


def rug(iid: str, room: str, rect: List[float], pattern: str) -> None:
    """Tappeto: sempre calpestabile."""
    x0, z0, x1, z1 = rect
    ITEMS.append({
        "id": iid, "room": room, "mount": "floor", "type": "rug", "rect": rect, "face": "+z",
        "at": [round((x0 + x1) / 2, 3), round((z0 + z1) / 2, 3)], "size": [round(x1 - x0, 3), round(z1 - z0, 3), 0.015],
        "rot": 0, "collide": False, "variant": None, "props": [], "light": None, "opts": {"pattern": pattern},
    })


def wl(iid: str, room: str, kind: str, x: float, z: float, face: str, w: float, hgt: float, y: float, **opts: Any) -> None:
    """Oggetto a parete: (x, z) e sul filo del muro, face e il lato verso cui guarda."""
    ITEMS.append({
        "id": iid, "room": room, "mount": "wall", "type": kind, "at": [x, z], "face": AXIS[face], "rot": ROT[face],
        "size": [w, 0.06, hgt], "y": y, "collide": False, "variant": opts.pop("variant", None),
        "props": [], "light": opts.pop("light", None), "opts": opts,
    })


def cl(iid: str, room: str, kind: str, x: float, z: float, drop: float, dia: float, prio: int, **opts: Any) -> None:
    """Oggetto a soffitto: prio 1 = luce reale garantita di notte, 3 = solo emissivo se serve risparmiare."""
    ITEMS.append({
        "id": iid, "room": room, "mount": "ceiling", "type": kind, "at": [x, z], "face": "+z", "rot": 0,
        "size": [dia, dia, drop], "collide": False, "variant": opts.pop("variant", None), "props": [],
        "light": {"prio": prio, "y": round(3.0 - drop, 2)}, "opts": opts,
    })


def cur(iid: str, room: str, openings: List[str]) -> None:
    """Tende sul lato interno delle aperture indicate."""
    ITEMS.append({
        "id": iid, "room": room, "mount": "opening", "type": "curtain", "openings": openings,
        "collide": False, "variant": None, "props": [], "light": None, "opts": {},
    })


LAMP2 = {"prio": 2, "y": 1.35}
LAMP3 = {"prio": 3, "y": 1.35}

# ---------------------------------------------------------------- pianerottolo
rug("pia_zerbino", "pianerottolo", [16.60, 4.95, 17.35, 5.30], "zerbino")
fl("pia_pianta", "pianerottolo", "plant", [15.25, 4.20, 15.60, 4.55], 1.5, "S", species="kentia")
wl("pia_applique", "pianerottolo", "sconce", 16.30, 5.35, "N", 0.25, 0.35, 2.0, light={"prio": 2, "y": 2.0})

# -------------------------------------------------------------------- ingresso
fl("ing_console", "ingresso", "console", [18.45, 5.90, 18.85, 7.10], 0.85, "W", props=["table_lamp", "vase_flowers"], light=LAMP2)
wl("ing_specchio", "ingresso", "mirror_wall", 18.90, 6.50, "W", 1.00, 1.40, 1.70)
fl("ing_cassapanca", "ingresso", "bench", [16.40, 6.50, 16.80, 7.80], 0.50, "E")
wl("ing_quadro", "ingresso", "painting", 16.35, 7.15, "E", 1.10, 0.80, 1.65, art="manifesto_iris")
fl("ing_pianta", "ingresso", "plant", [18.45, 5.57, 18.80, 5.87], 1.7, "S", species="kentia")
fl("ing_portaombrelli", "ingresso", "umbrella_stand", [17.55, 5.62, 17.80, 5.87], 0.60, "S")
rug("ing_tappeto", "ingresso", [17.00, 6.00, 18.30, 8.20], "heriz")
cl("ing_lanterna", "ingresso", "lantern", 17.60, 7.00, 0.70, 0.45, 1)

# --------------------------------------------------------------------- salotto
fl("sal_divano", "salotto", "sofa", [13.15, 7.40, 15.45, 8.35], 0.95, "S", seats=3)
fl("sal_tavolino_o", "salotto", "side_table", [12.55, 7.60, 13.05, 8.10], 0.60, "S", props=["table_lamp"], light=LAMP2)
fl("sal_tavolino_e", "salotto", "side_table", [15.55, 7.60, 16.05, 8.10], 0.60, "S", props=["table_lamp"], light=LAMP2)
fl("sal_tavolo_basso", "salotto", "coffee_table", [13.70, 9.00, 14.90, 9.60], 0.45, "S", props=["books", "vase_flowers"])
fl("sal_poltrona_o", "salotto", "armchair", [12.90, 8.75, 13.60, 9.45], 0.95, "E")
fl("sal_poltrona_e", "salotto", "armchair", [15.00, 8.75, 15.70, 9.45], 0.95, "W")
rug("sal_tappeto", "salotto", [12.95, 7.90, 15.65, 9.95], "tabriz")
rug("sal_tappeto_e", "salotto", [16.70, 9.50, 19.30, 11.10], "kashan")
fl("sal_vetrina", "salotto", "display_cabinet", [15.35, 11.80, 16.45, 12.20], 1.90, "N")
fl("sal_pianta_so", "salotto", "plant", [12.35, 11.50, 12.95, 12.10], 1.9, "N", species="ficus")
fl("sal_pianta_ne", "salotto", "plant", [19.20, 8.65, 19.75, 9.20], 1.8, "S", species="kentia")
fl("sal_poltrona_lettura", "salotto", "armchair", [18.95, 11.40, 19.70, 12.15], 0.95, "W")
fl("sal_lampada_terra", "salotto", "floor_lamp", [18.55, 11.45, 18.85, 11.75], 1.65, "N", light={"prio": 2, "y": 1.5})
cl("sal_lampadario_o", "salotto", "chandelier", 14.30, 9.30, 0.90, 0.90, 1)
cl("sal_lampadario_e", "salotto", "chandelier", 18.00, 10.40, 0.80, 0.70, 2)
wl("sal_quadro_nicchia", "salotto", "painting", 14.30, 7.25, "S", 1.60, 1.00, 1.80, art="conca_doro")
cur("sal_tende_1", "salotto", ["pf_salotto_1", "f_salotto_1"])
cur("sal_tende_2", "salotto", ["pf_salotto_2", "f_salotto_2"])

# -------------------------------------------------------------- sala da pranzo
fl("pra_tavolo", "sala_pranzo", "dining_table", [21.15, 9.95, 23.15, 10.95], 0.76, "S",
   props=["table_runner", "table_setting:8", "centerpiece_flowers", "candelabra:2"])
for n, x in enumerate([21.33, 21.93, 22.53], start=1):
    fl(f"pra_sedia_n{n}", "sala_pranzo", "chair_dining", [x, 9.42, round(x + 0.45, 2), 9.87], 0.95, "S")
    fl(f"pra_sedia_s{n}", "sala_pranzo", "chair_dining", [x, 11.03, round(x + 0.45, 2), 11.48], 0.95, "N")
fl("pra_sedia_o", "sala_pranzo", "chair_dining", [20.70, 10.22, 21.10, 10.68], 0.95, "E")
fl("pra_sedia_e", "sala_pranzo", "chair_dining", [23.23, 10.22, 23.68, 10.68], 0.95, "W")
fl("pra_credenza", "sala_pranzo", "sideboard", [21.60, 8.65, 23.40, 9.10], 0.95, "S", props=["vase_flowers", "fruit_bowl"])
fl("pra_vetrina", "sala_pranzo", "display_cabinet", [23.30, 11.25, 23.75, 12.20], 2.00, "W")
fl("pra_agrume", "sala_pranzo", "plant", [19.95, 11.75, 20.25, 12.20], 1.4, "N", species="limone_in_vaso")
rug("pra_tappeto", "sala_pranzo", [20.75, 9.35, 23.55, 11.55], "kashan")
cl("pra_lampadario", "sala_pranzo", "chandelier", 22.15, 10.45, 1.00, 0.90, 1)
wl("pra_quadro", "sala_pranzo", "painting", 22.50, 8.60, "S", 1.40, 0.90, 1.90, art="natura_morta_agrumi")
cur("pra_tende", "sala_pranzo", ["f_pranzo"])

# ---------------------------------------------------------------------- cucina
fl("cuc_base_nord", "cucina", "kitchen_base_run", [17.70, 2.85, 19.85, 3.45], 0.92, "S",
   modules=["base", "range", "base"], wallCabinets=True, hood=True, props=["copper_pots", "moka_cups"])
fl("cuc_base_ovest", "cucina", "kitchen_base_run", [17.70, 3.45, 18.30, 4.25], 0.92, "E", modules=["sink"], wallCabinets=False, hood=False)
fl("cuc_isola", "cucina", "kitchen_island", [18.85, 4.05, 19.95, 4.75], 0.92, "S", potRack=True,
   props=["fruit_bowl_lemons", "bread_board", "herbs_pot"])
fl("cuc_piattaia", "cucina", "plate_rack", [20.75, 3.50, 21.25, 5.40], 2.10, "W")
fl("cuc_frigo", "cucina", "fridge_column", [20.75, 5.55, 21.25, 6.25], 2.05, "W")  # sotto 6.30: l'anta aperta di p_cucina arriva a z = 6.36
fl("cuc_panca", "cucina", "banquette", [19.05, 5.55, 19.50, 7.10], 0.85, "E")
fl("cuc_bistrot", "cucina", "bistro_table", [19.55, 5.95, 20.00, 6.55], 0.74, "S", props=["moka_cups"])
cl("cuc_sospensione_1", "cucina", "pendant", 19.10, 4.40, 0.90, 0.30, 1)
cl("cuc_sospensione_2", "cucina", "pendant", 19.70, 4.40, 0.90, 0.30, 3)
cl("cuc_sospensione_3", "cucina", "pendant", 19.80, 6.25, 0.80, 0.30, 2)
rug("cuc_passatoia", "cucina", [18.45, 3.52, 19.85, 3.98], "passatoia")
wl("cuc_quadro", "cucina", "painting", 19.00, 6.30, "E", 0.90, 0.65, 1.75, art="natura_morta_agrumi")

# ------------------------------------------------- lavanderia e balcone della cucina
fl("lav_colonna", "lavanderia", "washer_stack", [17.70, 1.25, 18.30, 1.85], 1.75, "S")
fl("lav_lavatoio", "lavanderia", "laundry_sink", [18.35, 1.25, 19.00, 1.80], 0.90, "S")
fl("lav_scaffale", "lavanderia", "shelf_unit", [17.70, 2.15, 18.60, 2.55], 1.90, "N", props=["boxes"])
cl("lav_luce", "lavanderia", "pendant", 18.65, 1.90, 0.30, 0.25, 3)
fl("bc_aromatiche", "balcone_cucina", "planter", [20.95, 1.10, 22.45, 1.40], 0.75, "S", species="aromatiche")
fl("bc_agrume", "balcone_cucina", "plant", [23.90, 1.10, 24.20, 1.40], 1.4, "S", species="limone_in_vaso")

# -------------------------------------------------------------------- galleria
rug("gal_passatoia", "corridoio", [19.30, 7.55, 24.70, 8.30], "passatoia")
cl("gal_lanterna_1", "corridoio", "lantern", 20.40, 7.92, 0.55, 0.30, 2)
cl("gal_lanterna_2", "corridoio", "lantern", 22.80, 7.92, 0.55, 0.30, 3)
cl("gal_lanterna_3", "corridoio", "lantern", 25.40, 7.40, 0.55, 0.30, 2)
wl("gal_applique", "corridoio", "sconce", 21.22, 7.35, "S", 0.25, 0.35, 1.90, light={"prio": 3, "y": 1.9})
wl("gal_quadro_1", "corridoio", "painting", 23.20, 7.35, "S", 0.60, 0.80, 1.65, art="manifesto_glicine")
wl("gal_quadro_2", "corridoio", "painting", 24.20, 7.35, "S", 0.60, 0.80, 1.65, art="manifesto_pavone")
wl("gal_quadro_3", "corridoio", "painting", 21.80, 8.50, "N", 0.60, 0.80, 1.65, art="manifesto_iris")
wl("gal_quadro_4", "corridoio", "painting", 23.00, 8.50, "N", 0.60, 0.80, 1.65, art="manifesto_ninfee")

# -------------------------------------------------------------- camera da letto
fl("c2_letto", "camera2", "bed_double", [22.75, 4.20, 24.80, 5.90], 1.25, "W", mattress=[1.60, 2.00])
fl("c2_comodino_n", "camera2", "nightstand", [24.35, 3.65, 24.80, 4.10], 0.60, "W", props=["table_lamp"], light=LAMP2)
fl("c2_comodino_s", "camera2", "nightstand", [24.35, 6.00, 24.80, 6.45], 0.60, "W", props=["table_lamp"], light=LAMP3)
fl("c2_armadio", "camera2", "wardrobe", [21.40, 3.20, 22.00, 5.20], 2.25, "E")
fl("c2_scrittoio", "camera2", "desk", [22.90, 6.60, 24.10, 7.15], 0.76, "N", props=["table_lamp", "books"], light=LAMP3)
fl("c2_sedia", "camera2", "chair_desk", [23.25, 6.08, 23.70, 6.53], 0.90, "S")
fl("c2_poltroncina", "camera2", "armchair", [24.05, 2.90, 24.75, 3.55], 0.85, "W")
rug("c2_tappeto", "camera2", [22.10, 3.90, 24.20, 6.20], "isfahan_chiaro")
cl("c2_lampadario", "camera2", "chandelier", 23.00, 5.00, 0.70, 0.60, 1)
wl("c2_quadro", "camera2", "painting", 24.85, 5.05, "W", 1.20, 0.70, 1.95, art="glicine_orizzontale")
cur("c2_tende", "camera2", ["pf_camera2"])
fl("c2_pianta", "camera2", "plant", [24.30, 6.65, 24.75, 7.10], 1.6, "W", species="kentia")

# ----------------------------------------------------------------------- bagno
fl("b2_doccia", "bagno2", "shower_walkin", [25.05, 2.85, 26.40, 3.65], 2.10, "S")
fl("b2_wc", "bagno2", "wc", [25.90, 3.78, 26.45, 4.15], 0.42, "W")
fl("b2_bidet", "bagno2", "bidet", [25.90, 4.25, 26.45, 4.62], 0.40, "W")
fl("b2_lavabo", "bagno2", "vanity_single", [26.00, 4.75, 26.45, 5.65], 0.88, "W", props=["bath_mirror"], light={"prio": 3, "y": 1.9})
wl("b2_portasciugamani", "bagno2", "towel_rail", 25.00, 4.60, "E", 0.60, 0.90, 1.20)
rug("b2_tappetino", "bagno2", [25.15, 4.80, 25.80, 5.60], "bagno")
cl("b2_luce", "bagno2", "pendant", 25.70, 4.50, 0.35, 0.30, 2)

# -------------------------------------------------------------- camera baronale
fl("cb_letto", "camera_baronale", "bed_canopy", [26.40, 9.70, 28.50, 11.60], 2.60, "W", mattress=[1.80, 2.00])
fl("cb_comodino_n", "camera_baronale", "nightstand", [28.00, 9.20, 28.50, 9.65], 0.62, "W", props=["table_lamp"], light=LAMP2)
fl("cb_comodino_s", "camera_baronale", "nightstand", [28.00, 11.70, 28.50, 12.15], 0.62, "W", props=["table_lamp"], light=LAMP2)
fl("cb_panca", "camera_baronale", "bench", [25.90, 10.00, 26.30, 11.00], 0.48, "W")  # corta: il tour gira a z = 11.35 verso la portafinestra
fl("cb_toeletta", "camera_baronale", "vanity_table", [23.95, 10.20, 24.45, 11.40], 0.78, "E", props=["mirror_triptych", "perfume_set"])
fl("cb_pouf", "camera_baronale", "pouf", [24.55, 10.60, 24.95, 11.00], 0.45, "W")
fl("cb_poltrona", "camera_baronale", "armchair", [23.95, 11.50, 24.70, 12.20], 0.95, "E")
fl("cb_tavolino", "camera_baronale", "side_table", [24.75, 11.75, 25.15, 12.15], 0.60, "S", props=["vase_flowers"])
rug("cb_tappeto", "camera_baronale", [24.70, 9.25, 27.20, 11.55], "isfahan_seta")
cl("cb_lampadario", "camera_baronale", "chandelier", 25.90, 10.30, 0.90, 0.80, 1)
wl("cb_quadro", "camera_baronale", "painting", 25.95, 8.60, "S", 1.20, 0.90, 1.85, art="dama_liberty")
cur("cb_tende", "camera_baronale", ["pf_baronale"])
fl("cb_pianta", "camera_baronale", "plant", [23.95, 9.62, 24.32, 9.99], 1.7, "E", species="kentia")

# ------------------------------------------------- cabina armadio e bagno baronale
fl("ca_scaffale", "cabina_armadio", "shelf_unit", [26.60, 7.70, 26.75, 8.40], 2.30, "E", props=["boxes"])  # lascia libera l'anta di p_bagno_baronale
cl("ca_luce", "cabina_armadio", "pendant", 27.15, 7.65, 0.30, 0.25, 3)
fl("bb_vasca", "bagno_baronale", "bathtub_clawfoot", [26.75, 2.95, 28.35, 3.70], 0.62, "S")
fl("bb_lavabo", "bagno_baronale", "vanity_double", [27.95, 4.20, 28.50, 5.80], 0.90, "W", props=["bath_mirror_double"], light={"prio": 2, "y": 1.9})
fl("bb_doccia", "bagno_baronale", "shower_walkin", [26.60, 3.95, 27.45, 4.95], 2.10, "E")
fl("bb_wc", "bagno_baronale", "wc", [26.60, 5.05, 27.15, 5.42], 0.42, "E")
fl("bb_bidet", "bagno_baronale", "bidet", [26.60, 5.52, 27.15, 5.89], 0.40, "E")
fl("bb_felce", "bagno_baronale", "plant", [28.10, 5.95, 28.45, 6.30], 1.1, "W", species="felce")
rug("bb_tappeto", "bagno_baronale", [27.30, 4.20, 27.90, 5.60], "bagno")
cl("bb_lampadario", "bagno_baronale", "chandelier", 27.60, 4.60, 0.60, 0.50, 1)

# -------------------------------------------------------------------- terrazza
fl("ter_bistrot", "terrazza", "bistro_table", [27.55, 12.95, 28.05, 13.45], 0.74, "S", props=["moka_cups"])
fl("ter_sedia_e1", "terrazza", "outdoor_chair", [27.02, 12.98, 27.42, 13.42], 0.88, "E")
fl("ter_sedia_e2", "terrazza", "outdoor_chair", [28.18, 12.98, 28.58, 13.42], 0.88, "W")
for n, x in enumerate([24.20, 25.20, 26.20], start=1):
    fl(f"ter_limone_{n}", "terrazza", "plant", [x, 13.30, round(x + 0.40, 2), 13.70], 1.6, "S", species="limone_in_vaso")
fl("ter_panca_pranzo", "terrazza", "banquette", [20.30, 14.05, 22.90, 14.45], 0.85, "N")
fl("ter_tavolo", "terrazza", "outdoor_table", [20.60, 13.40, 22.60, 14.00], 0.74, "S", props=["table_setting:4", "lantern_candle"])
fl("ter_sedia_p1", "terrazza", "outdoor_chair", [20.12, 13.48, 20.52, 13.92], 0.88, "E")
fl("ter_sedia_p2", "terrazza", "outdoor_chair", [22.68, 13.48, 23.08, 13.92], 0.88, "W")
fl("ter_lettino", "terrazza", "sunbed", [16.40, 13.80, 18.30, 14.45], 0.75, "E")
fl("ter_tavolino_lettino", "terrazza", "side_table", [18.45, 13.90, 18.85, 14.30], 0.45, "S")
fl("ter_bouganville", "terrazza", "planter", [19.00, 13.85, 19.60, 14.45], 2.0, "N", species="bouganville")
fl("ter_divano", "terrazza", "outdoor_sofa", [13.10, 13.80, 15.30, 14.45], 0.80, "N")
fl("ter_tavolino", "terrazza", "coffee_table", [13.70, 13.30, 14.70, 13.65], 0.40, "S", props=["lantern_candle"])
fl("ter_poltrona_1", "terrazza", "outdoor_armchair", [12.45, 13.80, 13.05, 14.40], 0.80, "E")
fl("ter_poltrona_2", "terrazza", "outdoor_armchair", [15.35, 13.80, 15.85, 14.40], 0.80, "W")
fl("ter_dondolo", "terrazza", "swing_bench", [8.90, 13.80, 10.90, 14.45], 1.90, "N")
fl("ter_fioriera_1", "terrazza", "planter", [4.75, 13.85, 6.25, 14.45], 1.9, "N", species="bouganville")
fl("ter_fioriera_2", "terrazza", "planter", [6.60, 13.85, 8.10, 14.45], 1.6, "N", species="gelsomino")
fl("ter_fioriera_3", "terrazza", "planter", [11.10, 13.85, 12.10, 14.45], 1.5, "N", species="agrumi")
fl("ter_agave", "terrazza", "plant", [0.70, 13.20, 1.20, 13.70], 0.9, "S", species="agave")
fl("ter_palma", "terrazza", "plant", [1.90, 13.25, 2.35, 13.70], 1.9, "S", species="kentia")
fl("ter_limone_4", "terrazza", "plant", [3.30, 13.25, 3.75, 13.70], 1.6, "S", species="limone_in_vaso")
fl("ter_poltrona_ovest", "terrazza", "outdoor_armchair", [0.55, 12.58, 1.20, 13.12], 0.80, "E")
for n, x in enumerate([8.30, 12.20, 15.95, 19.85, 23.85], start=1):
    wl(f"ter_lanterna_{n}", "terrazza", "outdoor_lantern", x, 12.50, "S", 0.25, 0.40, 2.10, light={"prio": 2 if n % 2 else 3, "y": 2.1})

# ----------------------------------------------------------------- gran salone
fl("gs_libreria_o", "gran_salone", "bookcase", [2.40, 8.90, 2.85, 11.50], 2.60, "E")
fl("gs_libreria_n", "gran_salone", "bookcase", [3.00, 8.65, 5.00, 9.05], 2.60, "S")
fl("gs_scrittoio", "gran_salone", "desk", [3.30, 10.20, 4.70, 10.95], 0.76, "S", props=["table_lamp", "globe", "books"], light=LAMP3)
fl("gs_sedia_scrittoio", "gran_salone", "chair_desk", [3.75, 9.62, 4.25, 10.12], 0.95, "S")
fl("gs_poltrona_lettura", "gran_salone", "armchair", [3.55, 11.30, 4.30, 12.05], 0.95, "N")
fl("gs_lampada_terra", "gran_salone", "floor_lamp", [4.40, 11.75, 4.70, 12.05], 1.65, "N", light={"prio": 2, "y": 1.5})
fl("gs_divano", "gran_salone", "sofa", [6.00, 8.70, 8.40, 9.65], 0.95, "S", seats=3)
fl("gs_tavolo_basso", "gran_salone", "coffee_table", [6.60, 10.05, 7.80, 10.75], 0.45, "S", props=["books", "vase_flowers"])
fl("gs_poltrona_o", "gran_salone", "armchair", [5.35, 9.95, 6.15, 10.70], 0.95, "E")
fl("gs_poltrona_e", "gran_salone", "armchair", [8.25, 9.95, 9.05, 10.70], 0.95, "W")
fl("gs_pianoforte", "gran_salone", "grand_piano", [9.00, 7.75, 10.50, 9.75], 1.00, "S")
fl("gs_sgabello", "gran_salone", "stool_piano", [9.50, 9.82, 10.00, 10.22], 0.48, "N")
fl("gs_consolle", "gran_salone", "console", [7.75, 11.85, 8.95, 12.20], 0.85, "N", props=["table_lamp:2", "clock"], light=LAMP2)
fl("gs_pianta_se", "gran_salone", "plant", [11.50, 11.55, 12.10, 12.15], 2.0, "N", species="kentia")
rug("gs_tappeto", "gran_salone", [5.20, 9.20, 9.20, 11.50], "heriz_grande")
rug("gs_tappeto_biblioteca", "gran_salone", [2.95, 9.40, 5.00, 11.40], "bukhara")
cl("gs_lampadario_1", "gran_salone", "chandelier", 7.20, 10.40, 1.00, 1.00, 1)
cl("gs_lampadario_2", "gran_salone", "chandelier", 10.60, 10.60, 0.90, 0.80, 2)
cl("gs_lampadario_3", "gran_salone", "chandelier", 3.90, 10.50, 0.80, 0.70, 2)
wl("gs_specchio", "gran_salone", "mirror_wall", 8.35, 12.25, "N", 1.00, 1.50, 1.80)
wl("gs_quadro_divano", "gran_salone", "painting", 7.20, 8.60, "S", 1.80, 1.10, 1.90, art="veduta_palermo")
wl("gs_quadro_e", "gran_salone", "painting", 12.15, 9.00, "W", 0.60, 0.80, 1.70, art="manifesto_ninfee")
cur("gs_tende_1", "gran_salone", ["f_salone_1"])
cur("gs_tende_2", "gran_salone", ["pf_salone_2", "f_salone_2"])
cur("gs_tende_3", "gran_salone", ["pf_salone_3", "f_salone_3"])

# ------------------------------------------------- ala dello studio e giardino d'inverno
fl("dis_console", "disimpegno_studio", "console", [8.70, 6.45, 9.05, 7.40], 0.85, "E", props=["table_lamp", "vase_flowers"], light=LAMP3)
wl("dis_quadro", "disimpegno_studio", "painting", 8.65, 6.90, "E", 0.60, 0.80, 1.75, art="manifesto_pavone")
rug("dis_passatoia", "disimpegno_studio", [9.40, 6.45, 11.40, 7.05], "passatoia")
cl("dis_lanterna", "disimpegno_studio", "lantern", 11.90, 6.30, 0.50, 0.30, 2)
fl("st_scrivania", "studio", "desk", [8.70, 3.20, 9.40, 4.80], 0.76, "E", props=["table_lamp", "books", "globe"], light=LAMP2)
fl("st_sedia", "studio", "chair_desk", [9.48, 3.75, 9.98, 4.25], 0.95, "W")
fl("st_libreria", "studio", "bookcase", [11.00, 2.60, 11.40, 5.00], 2.50, "W")
fl("st_poltrona", "studio", "armchair", [8.75, 5.30, 9.50, 6.10], 0.95, "E")
fl("st_lampada", "studio", "floor_lamp", [8.72, 4.92, 8.98, 5.18], 1.60, "E", light={"prio": 3, "y": 1.5})
rug("st_tappeto", "studio", [9.30, 3.20, 10.90, 5.60], "bukhara")
cl("st_lampadario", "studio", "pendant", 10.00, 4.30, 0.80, 0.45, 1)
wl("st_quadro", "studio", "painting", 8.65, 5.70, "E", 0.70, 0.90, 1.85, art="manifesto_glicine")
cur("st_tende", "studio", ["pf_studio"])
fl("st_pianta", "studio", "plant", [8.72, 2.38, 9.12, 2.78], 1.8, "E", species="ficus")
fl("to_lavabo", "toilette", "vanity_single", [11.60, 2.40, 12.50, 2.85], 0.88, "S", variant="toilette_cortesia")
fl("to_wc", "toilette", "wc", [12.40, 3.40, 12.95, 3.77], 0.42, "W", variant="toilette_cortesia")
wl("to_specchio", "toilette", "mirror_wall", 11.55, 3.40, "E", 0.60, 0.90, 1.60, variant="toilette_cortesia")
fl("to_cantinetta", "toilette", "wine_rack", [11.60, 2.40, 11.95, 4.30], 2.20, "E", variant="dispensa_cantinetta")
fl("to_dispensa", "toilette", "shelf_unit", [12.55, 2.45, 12.90, 4.30], 2.20, "W", variant="dispensa_cantinetta", props=["boxes"])
cl("to_luce", "toilette", "pendant", 12.25, 3.80, 0.35, 0.25, 3)
fl("gu_armadi", "guardaroba", "wardrobe", [14.40, 2.40, 14.95, 5.30], 2.60, "W")
fl("gu_cassettiera", "guardaroba", "chest", [13.10, 2.40, 13.55, 3.50], 0.95, "E")
fl("gu_panca", "guardaroba", "bench", [13.10, 3.80, 13.50, 4.90], 0.48, "E")
cl("gu_luce", "guardaroba", "pendant", 13.90, 4.00, 0.40, 0.30, 3)
fl("ri_scaffali", "ripostiglio", "shelf_unit", [14.25, 6.15, 14.65, 7.10], 2.20, "W", props=["boxes", "luggage"])
cl("ri_luce", "ripostiglio", "pendant", 13.70, 6.60, 0.30, 0.25, 3)
fl("gi_gelsomino", "giardino_inverno", "planter", [8.75, 0.70, 9.40, 1.00], 1.4, "S", species="gelsomino")
fl("gi_poltrona_1", "giardino_inverno", "outdoor_armchair", [11.10, 0.80, 11.70, 1.40], 0.80, "S")
fl("gi_tavolino", "giardino_inverno", "side_table", [11.90, 0.85, 12.30, 1.25], 0.45, "S")
fl("gi_poltrona_2", "giardino_inverno", "outdoor_armchair", [12.50, 0.80, 13.10, 1.40], 0.80, "S")
fl("gi_felci", "giardino_inverno", "planter", [13.60, 0.70, 14.80, 1.00], 1.1, "S", species="felci")
fl("gi_kentia", "giardino_inverno", "plant", [14.40, 1.45, 14.90, 1.95], 2.2, "S", species="kentia")
fl("gi_limone", "giardino_inverno", "plant", [8.70, 1.50, 9.10, 1.90], 1.6, "S", species="limone_in_vaso")
cl("gi_lanterna", "giardino_inverno", "lantern", 11.90, 1.40, 0.50, 0.30, 3)

# --------------------------------------------------- varianti e sostituzioni di stile
VARIANTS: Dict[str, Any] = {
    "active": {"toilette": "toilette_cortesia"},
    "options": {
        "toilette_cortesia": {"room": "toilette", "roomName": "Toilette ospiti"},
        "dispensa_cantinetta": {"room": "toilette", "roomName": "Dispensa e cantinetta"},
    },
    "note": "La planimetria ha 3 wc; la richiesta e 2 bagni. Predefinito: 2 bagni completi piu toilette ospiti. "
            "Per avere esattamente 2 locali bagno impostare active.toilette = dispensa_cantinetta.",
}

STYLE_OVERRIDES: Dict[str, Any] = {
    "liberty": {"omit": [], "retype": {}},
    "moderno": {
        "omit": ["ing_portaombrelli", "pra_vetrina", "sal_vetrina", "cb_pouf", "gs_libreria_n"],
        "retype": {"cb_letto": "bed_double", "bb_vasca": "bathtub_freestanding", "gs_pianoforte": "grand_piano", "cuc_piattaia": "tall_cabinet"},
    },
    "scandinavo": {
        "omit": ["ing_portaombrelli", "pra_vetrina", "cb_pouf", "gs_lampadario_3"],
        "retype": {"cb_letto": "bed_double", "bb_vasca": "bathtub_freestanding", "cuc_piattaia": "tall_cabinet", "sal_vetrina": "sideboard"},
    },
}


def build_furnishing() -> Dict[str, Any]:
    """Assembla il dizionario che diventa spec/furnishing.json."""
    return {
        "conventions": {
            "rot": "gradi attorno a Y; 0 = fronte dell'oggetto verso +z, 90 = verso +x, 180 = verso -z, 270 = verso -x",
            "face": "lato verso cui guarda il fronte: +z, +x, -z oppure -x; coincide con rot",
            "size": "[larghezza lungo X locale, profondita lungo Z locale, altezza]; origine del modello = centro dell'ingombro a pavimento",
            "rect": "[x0, z0, x1, z1] ingombro a pavimento gia ruotato; e anche il collider quando collide = true",
            "wall": "at = punto sul filo del muro; l'oggetto sporge verso face; y = quota del centro",
            "ceiling": "at = punto in pianta; l'oggetto pende dal soffitto (y = 3.00) per size[2] metri",
            "light": "prio 1 luce reale sempre, 2 se il livello di qualita lo permette, 3 solo paralume emissivo; y = quota della sorgente",
        },
        "variants": VARIANTS,
        "styleOverrides": STYLE_OVERRIDES,
        "items": ITEMS,
    }
