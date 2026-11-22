"""Percorso del tour guidato: punti di passaggio e soste con etichetta commerciale.

Il percorso parte dal pianerottolo, attraversa la porta d'ingresso e tocca ogni
ambiente nell'ordine in cui lo visiterebbe un acquirente. Le superfici (m²) NON
sono scritte qui: il tour le legge da plan.json tramite roomId.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

PATH: List[Dict[str, Any]] = []


def go(x: float, z: float) -> None:
    """Punto di passaggio senza sosta."""
    PATH.append({"p": [x, z]})


def stop(x: float, z: float, room: str, look: List[float], title: str, highlight: str,
         dwell: float = 4.5, hour: Optional[float] = None, look_y: float = 1.35) -> None:
    """Punto con sosta: la camera si ferma, guarda verso look e mostra l'etichetta."""
    PATH.append({
        "p": [x, z],
        "stop": {"room": room, "lookAt": [look[0], look_y, look[1]], "title": title, "highlight": highlight,
                 "dwell": dwell, "hour": hour},
    })


stop(16.98, 4.75, "pianerottolo", [16.98, 7.5], "Via Dante 28 - settimo piano",
     "Unico appartamento al piano, scala B con ascensore", dwell=3.5, hour=8.0)
go(16.98, 5.45)
stop(17.20, 6.40, "ingresso", [17.6, 10.5], "Ingresso",
     "Il grande arco con vetrata Liberty: salotto e terrazza si vedono gia dalla soglia")
go(17.60, 7.90)
go(17.60, 8.55)
go(17.60, 9.30)
stop(14.30, 11.30, "salotto", [14.3, 7.6], "Salotto",
     "Nicchia divano di 4 metri e doppio affaccio sulla terrazza, al centro di tre saloni uniti da archi", hour=8.4)
go(19.00, 10.28)
go(19.85, 10.28)
go(20.25, 10.28)
stop(20.30, 9.50, "sala_pranzo", [22.2, 10.7], "Sala da pranzo",
     "Tavolo per otto a un passo dalla cucina, in fila con salotto e gran salone", hour=8.8)
go(20.42, 8.90)
go(20.42, 8.55)
go(20.42, 7.90)
go(20.42, 7.27)
stop(20.42, 6.30, "cucina", [18.9, 4.0], "Cucina",
     "Luminosa fin dal mattino: abitabile con isola in marmo, ingresso di servizio, balcone e lavanderia", hour=9.2)
go(20.42, 7.27)
go(20.42, 7.92)
go(22.00, 7.92)
go(22.00, 7.27)
stop(22.20, 6.50, "camera2", [23.9, 4.7], "Camera da letto",
     "Matrimoniale silenziosa sul retro, esposta a sud, con portafinestra sul balcone", hour=9.6)
go(22.00, 7.27)
go(22.00, 7.92)
go(25.52, 7.92)
stop(25.52, 6.35, "bagno2", [25.6, 3.4], "Bagno",
     "Finestrato, con doccia a filo pavimento e maioliche siciliane", dwell=3.5, hour=10.2)
go(25.52, 7.92)
go(24.75, 7.92)
go(24.75, 8.55)
stop(24.90, 9.40, "camera_baronale", [27.4, 10.7], "Camera baronale",
     "Suite padronale: letto a baldacchino, cabina armadio, bagno privato e terrazza", dwell=5.0, hour=17.0)
go(27.15, 9.20)
go(27.15, 8.55)
stop(27.15, 7.65, "cabina_armadio", [27.9, 7.65], "Cabina armadio",
     "Armadi a muro a tutta altezza tra camera e bagno", dwell=2.5)
go(27.15, 6.75)
stop(27.55, 6.05, "bagno_baronale", [27.6, 3.3], "Bagno baronale",
     "Quasi 8 m² finestrati: vasca su piedini, doppio lavabo in marmo e doccia", dwell=5.0, hour=17.8)
go(27.15, 6.75)
go(27.15, 8.55)
go(27.15, 9.20)
go(25.50, 9.30)
go(25.50, 11.35)
go(26.05, 11.35)
go(26.05, 12.40)
go(26.05, 12.95)
stop(17.20, 12.95, "terrazza", [37.0, 33.0], "Terrazza su via Dante",
     "Quasi 50 m² coperti: di fronte Palazzo Ziino, da un lato il Politeama, dall'altro il tramonto sui monti",
     dwell=7.0, hour=18.6, look_y=2.0)
go(9.80, 12.95)
go(9.80, 12.40)
go(9.80, 11.40)
stop(10.50, 10.80, "gran_salone", [5.5, 10.2], "Gran salone",
     "Quasi 40 m² nella luce del tramonto: biblioteca, conversazione e pianoforte a coda", dwell=5.5, hour=18.9)
go(11.30, 9.60)
go(11.47, 8.40)
go(11.47, 7.20)
stop(11.47, 6.75, "disimpegno_studio", [12.9, 5.6], "Ala dello studio",
     "Guardaroba, ripostiglio e toilette ospiti: i servizi restano fuori dalla zona giorno", dwell=3.5, hour=19.1)
go(10.80, 6.75)
go(10.80, 6.30)
stop(10.60, 5.40, "studio", [9.5, 3.3], "Studio",
     "Ala indipendente con giardino d'inverno: studio oggi, terza camera domani", hour=19.2)

FINALE: Dict[str, Any] = {
    "title": "Vista d'insieme",
    "highlight": "{interni} m² interni e {esterni} m² tra terrazza e balconi, su un unico piano",
    "riseSeconds": 7.0,
    "hour": 19.6,
    "note": "al termine la camera sale e si passa alla vista dall'alto (casa delle bambole)",
}

SETTINGS: Dict[str, Any] = {
    "eyeHeight": 1.62,
    "walkSpeed": 1.15,
    "turnSeconds": 1.2,
    "clearance": 0.30,
    "cinematicLight": True,
    "note": "hour nelle soste: se cinematicLight e attivo il tour porta dolcemente l'ora del giorno a quel valore; "
            "la sequenza racconta una giornata: mattina nelle stanze sul retro, tramonto in terrazza e nei saloni, imbrunire nel finale",
}


def build_tour() -> Dict[str, Any]:
    """Assembla il dizionario che diventa spec/tour.json."""
    return {"settings": SETTINGS, "path": PATH, "finale": FINALE}
