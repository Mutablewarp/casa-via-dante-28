"""Controlli di coerenza su plan.json, furnishing.json e tour.json.

Ogni controllo restituisce una lista di messaggi d'errore: lista vuota = superato.
"""

from __future__ import annotations

import math
from collections import deque
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

from .geometry import (BUILTIN, OPENING, OUTDOOR, OUTSIDE, ROOM, SOLID, STAIRS, WALL, Grid, Rect, expand, is_snapped,
                       rect_area, rects_area, rects_overlap)
from .leaves import check_leaves

DOOR_CLEAR = 0.60   # profondita libera davanti a ogni apertura percorribile
PATH_CLEAR = 0.30   # distanza minima del percorso da muri e arredi


def walk_ids(plan: Dict) -> List[str]:
    """Id delle aperture attraversabili a piedi."""
    return [o["id"] for o in plan["openings"] if o["walk"]]


def check_snap(plan: Dict) -> List[str]:
    """Tutte le quote della pianta devono essere multiple di 5 cm."""
    errs: List[str] = []
    for r in Grid._all_rects(plan):
        if not all(is_snapped(v) for v in r):
            errs.append(f"quota non a passo 5 cm: {r}")
    return errs


def check_rooms(plan: Dict, grid: Grid) -> List[str]:
    """Stanze dentro la sagoma, senza sovrapposizioni reciproche."""
    errs: List[str] = []
    spaces = plan["rooms"] + plan["outdoor"]
    for i, a in enumerate(spaces):
        for ra in a["rects"]:
            for rb in a["rects"]:
                if ra is not rb and rects_overlap(tuple(ra), tuple(rb)):
                    errs.append(f"{a['id']}: rettangoli sovrapposti {ra} {rb}")
        for b in spaces[i + 1:]:
            for ra in a["rects"]:
                for rb in b["rects"]:
                    if rects_overlap(tuple(ra), tuple(rb)):
                        errs.append(f"{a['id']} e {b['id']} si sovrappongono: {ra} {rb}")
    for room in plan["rooms"]:
        for r in room["rects"]:
            for c in grid.cells_of_rect(tuple(r)):
                if c.kind not in (ROOM, SOLID):
                    errs.append(f"{room['id']}: cella {c.kind} dentro {r}")
                    break
    return errs


def _side_kind(grid: Grid, x: float, z: float) -> str:
    c = grid.cell_at(x, z)
    if c.kind in (ROOM, OUTDOOR):
        return str(c.ref)
    return {STAIRS: "_rampe", OUTSIDE: "_cortile"}.get(c.kind, f"<{c.kind}>")


def check_openings(plan: Dict, grid: Grid) -> List[str]:
    """Ogni apertura attraversa un muro e collega esattamente i due spazi dichiarati."""
    errs: List[str] = []
    for o in plan["openings"]:
        x0, z0, x1, z1 = o["rect"]
        for c in grid.cells_of_rect((x0, z0, x1, z1)):
            if c.kind != OPENING or c.ref != o["id"]:
                errs.append(f"{o['id']}: il foro copre una cella {c.kind}/{c.ref}")
        for sp in plan["rooms"] + plan["outdoor"]:
            if any(rects_overlap((x0, z0, x1, z1), tuple(r)) for r in sp["rects"]):
                errs.append(f"{o['id']}: il foro invade {sp['id']}")
        if not any(r[0] - 1e-6 <= x0 and x1 <= r[2] + 1e-6 and r[1] - 1e-6 <= z0 and z1 <= r[3] + 1e-6 for r in plan["footprint"]):
            errs.append(f"{o['id']}: il foro non sta dentro un solo rettangolo della sagoma")
        if o["wallAlong"] == "x":
            probes = [((x0 + x1) / 2, z0 - 0.02), ((x0 + x1) / 2, z1 + 0.02)]
            ends = [(x0 + 0.02, z0 - 0.02), (x1 - 0.02, z0 - 0.02), (x0 + 0.02, z1 + 0.02), (x1 - 0.02, z1 + 0.02)]
        else:
            probes = [(x0 - 0.02, (z0 + z1) / 2), (x1 + 0.02, (z0 + z1) / 2)]
            ends = [(x0 - 0.02, z0 + 0.02), (x0 - 0.02, z1 - 0.02), (x1 + 0.02, z0 + 0.02), (x1 + 0.02, z1 - 0.02)]
        found = {_side_kind(grid, *p) for p in probes}
        if found != {o["from"], o["to"]}:
            errs.append(f"{o['id']}: collega {sorted(found)} ma dichiara {sorted([o['from'], o['to']])}")
        for p in ends:
            if _side_kind(grid, *p) not in (o["from"], o["to"]):
                errs.append(f"{o['id']}: lo stipite in {p} non affaccia su {o['from']}/{o['to']}")
        if not 0.55 <= o["width"] <= 2.2:
            errs.append(f"{o['id']}: larghezza anomala {o['width']}")
        if o["walk"] and o["width"] < 0.70:
            errs.append(f"{o['id']}: passaggio piu stretto di 70 cm")
    return errs


def check_connectivity(plan: Dict) -> List[str]:
    """Dal pianerottolo si raggiunge a piedi ogni stanza e ogni spazio esterno."""
    adj: Dict[str, Set[str]] = {}
    for o in plan["openings"]:
        if o["walk"]:
            adj.setdefault(o["from"], set()).add(o["to"])
            adj.setdefault(o["to"], set()).add(o["from"])
    seen = {"pianerottolo"}
    queue = deque(["pianerottolo"])
    while queue:
        for nxt in adj.get(queue.popleft(), ()):
            if nxt not in seen:
                seen.add(nxt)
                queue.append(nxt)
    wanted = {s["id"] for s in plan["rooms"] + plan["outdoor"]}
    return [f"non raggiungibile a piedi: {sid}" for sid in sorted(wanted - seen)]


def colliders(furn: Dict, active_only: bool = True) -> List[Dict]:
    """Oggetti a pavimento che bloccano il passo, nella variante attiva."""
    active = furn["variants"]["active"]
    out: List[Dict] = []
    for it in furn["items"]:
        if it.get("mount") != "floor" or not it["collide"]:
            continue
        if active_only and it["variant"] and active.get(it["room"]) != it["variant"]:
            continue
        out.append(it)
    return out


def check_furnishing(plan: Dict, furn: Dict, grid: Grid) -> List[str]:
    """Arredi dentro la propria stanza, non compenetrati, con le porte libere."""
    errs: List[str] = []
    ids = [it["id"] for it in furn["items"]]
    errs += [f"id duplicato: {i}" for i in sorted({i for i in ids if ids.count(i) > 1})]
    known = {s["id"] for s in plan["rooms"] + plan["outdoor"]}
    opening_ids = {o["id"] for o in plan["openings"]}
    for it in furn["items"]:
        if it["room"] not in known:
            errs.append(f"{it['id']}: stanza sconosciuta {it['room']}")
        if it.get("mount") == "opening":
            errs += [f"{it['id']}: apertura sconosciuta {o}" for o in it["openings"] if o not in opening_ids]
        elif it.get("mount") in ("wall", "ceiling"):
            x, z = it["at"]
            near = [grid.space_at(x + dx, z + dz) for dx, dz in ((0, 0), (0.06, 0), (-0.06, 0), (0, 0.06), (0, -0.06))]
            if it["room"] not in near:
                errs.append(f"{it['id']}: punto {it['at']} fuori da {it['room']}")
    floor_items = [it for it in furn["items"] if it.get("mount") == "floor" and it["type"] != "rug"]
    for it in floor_items:
        x0, z0, x1, z1 = it["rect"]
        pts = [(x0 + 0.01, z0 + 0.01), (x1 - 0.01, z0 + 0.01), (x0 + 0.01, z1 - 0.01), (x1 - 0.01, z1 - 0.01), ((x0 + x1) / 2, (z0 + z1) / 2)]
        if any(grid.space_at(*p) != it["room"] for p in pts):
            errs.append(f"{it['id']}: ingombro {it['rect']} esce da {it['room']}")
    for variant in furn["variants"]["options"]:
        group = [it for it in floor_items if it["variant"] in (None, variant)]
        for i, a in enumerate(group):
            for b in group[i + 1:]:
                if a["room"] == b["room"] and rects_overlap(tuple(a["rect"]), tuple(b["rect"])):
                    msg = f"{a['id']} e {b['id']} si compenetrano"
                    if msg not in errs:
                        errs.append(msg)
    for o in plan["openings"]:
        if not o["walk"]:
            continue
        x0, z0, x1, z1 = o["rect"]
        zones: List[Rect] = ([(x0, z0 - DOOR_CLEAR, x1, z0), (x0, z1, x1, z1 + DOOR_CLEAR)] if o["wallAlong"] == "x"
                             else [(x0 - DOOR_CLEAR, z0, x0, z1), (x1, z0, x1 + DOOR_CLEAR, z1)])
        for it in colliders(furn, active_only=False):
            if any(rects_overlap(tuple(it["rect"]), zn) for zn in zones):
                errs.append(f"{it['id']} ostruisce l'apertura {o['id']}")
    return errs


def _samples(path: List[Dict], step: float = 0.05) -> Iterable[Tuple[float, float, int]]:
    for k in range(len(path) - 1):
        (ax, az), (bx, bz) = path[k]["p"], path[k + 1]["p"]
        n = max(1, int(math.hypot(bx - ax, bz - az) / step))
        for s in range(n + 1):
            t = s / n
            yield ax + (bx - ax) * t, az + (bz - az) * t, k


def check_tour(plan: Dict, furn: Dict, tour: Dict, grid: Grid) -> List[str]:
    """Il percorso resta su superfici calpestabili, lontano da muri e arredi, e tocca ogni stanza principale."""
    errs: List[str] = []
    walk = walk_ids(plan)
    boxes = [expand(tuple(it["rect"]), PATH_CLEAR) for it in colliders(furn)]
    ring = [(PATH_CLEAR * math.cos(a), PATH_CLEAR * math.sin(a)) for a in (k * math.pi / 4 for k in range(8))]
    bad: Set[int] = set()
    for x, z, k in _samples(tour["path"]):
        if k in bad:
            continue
        if not grid.walkable(x, z, walk):
            errs.append(f"tratto {k}: ({x:.2f}, {z:.2f}) non calpestabile")
            bad.add(k)
            continue
        cell = grid.cell_at(x, z)
        if cell.kind != OPENING and any(not grid.walkable(x + dx, z + dz, walk) for dx, dz in ring):
            errs.append(f"tratto {k}: ({x:.2f}, {z:.2f}) a meno di {PATH_CLEAR} m da un muro")
            bad.add(k)
        hit = next((it for it, bx in zip(colliders(furn), boxes) if bx[0] < x < bx[2] and bx[1] < z < bx[3]), None)
        if hit:
            errs.append(f"tratto {k}: ({x:.2f}, {z:.2f}) troppo vicino a {hit['id']}")
            bad.add(k)
    visited = {grid.space_at(*w["p"]) for w in tour["path"]}
    for w in tour["path"]:
        st = w.get("stop")
        if st and grid.space_at(*w["p"]) != st["room"] and not (st["room"] == "bagno2"):
            errs.append(f"sosta {st['title']}: il punto {w['p']} non e in {st['room']}")
    must = {r["id"] for r in plan["rooms"] if r["zone"] in ("giorno", "notte") and r["id"] not in ("lavanderia", "bagno2")}
    must |= {"studio", "disimpegno_studio", "terrazza"}
    errs += [f"il tour non entra in {m}" for m in sorted(must - visited)]
    return errs


def areas(plan: Dict) -> Dict[str, float]:
    """Superficie netta calpestabile di ogni spazio, al netto di pilastri e setti."""
    out: Dict[str, float] = {}
    for s in plan["rooms"] + plan["outdoor"]:
        a = rects_area(tuple(r) for r in s["rects"])
        for sol in plan["solids"]:
            if any(rects_overlap(tuple(sol["rect"]), tuple(r)) for r in s["rects"]):
                a -= rect_area(tuple(sol["rect"]))
        out[s["id"]] = round(a, 2)
    return out


def run_all(plan: Dict, furn: Optional[Dict], tour: Optional[Dict]) -> Dict[str, List[str]]:
    """Esegue tutti i controlli disponibili e restituisce gli errori per gruppo."""
    grid = Grid(plan)
    report: Dict[str, List[str]] = {
        "quote": check_snap(plan), "stanze": check_rooms(plan, grid), "aperture": check_openings(plan, grid),
        "collegamenti": check_connectivity(plan),
    }
    if furn is not None:
        report["arredo"] = check_furnishing(plan, furn, grid)
    if furn is not None and tour is not None:
        report["tour"] = check_tour(plan, furn, tour, grid)
    if any(o.get("leaves") for o in plan["openings"]):
        report["ante"] = check_leaves(plan, furn, tour, grid)
    return report


def _solid_at(plan: Dict, cell: Any, y: float) -> bool:
    """Vero se la cella e piena alla quota y."""
    if cell.kind in (WALL, BUILTIN, "context"):
        return True
    if cell.kind == SOLID:
        return next(s["h"] for s in plan["solids"] if s["id"] == cell.ref) > y
    if cell.kind == OPENING:
        o = next(o for o in plan["openings"] if o["id"] == cell.ref)
        return y < o["sill"] or y > o["head"]
    return False


def oracle(plan: Dict) -> Dict[str, Any]:
    """Valori di riferimento che la griglia JavaScript deve riprodurre identici (test T1.2)."""
    grid = Grid(plan)
    nx, nz = len(grid.xs) - 1, len(grid.zs) - 1
    kinds: Dict[str, int] = {}
    runs: Dict[str, Dict[str, float]] = {}
    for j in range(nz):
        for i in range(nx):
            c = grid.cells[j][i]
            kinds[c.kind] = kinds.get(c.kind, 0) + 1
            if c.kind not in (ROOM, OUTDOOR):
                continue
            r = runs.setdefault(str(c.ref), {"wallRun": 0.0, "openRun": 0.0})
            w, d = grid.xs[i + 1] - grid.xs[i], grid.zs[j + 1] - grid.zs[j]
            for di, dj, length in ((-1, 0, d), (1, 0, d), (0, -1, w), (0, 1, w)):
                ii, jj = i + di, j + dj
                if not (0 <= ii < nx and 0 <= jj < nz):
                    continue
                n = grid.cells[jj][ii]
                if n.kind == OPENING and not _solid_at(plan, n, 1.5):
                    r["openRun"] += length
                elif _solid_at(plan, n, 1.5):
                    r["wallRun"] += length
    for r in runs.values():
        r["wallRun"], r["openRun"] = round(r["wallRun"], 2), round(r["openRun"], 2)
    return {
        "definition": {
            "axes": "xs e zs = valori distinti ordinati di tutte le x e z dei rettangoli di footprint, rooms, outdoor, openings, solids, builtins, stairs.rect, context.blocks",
            "priority": "solid > opening > builtin > room > stairs > outdoor > wall (dentro footprint) > context > outside, valutata nel centro cella",
            "wallRun": "metri di lati di cella tra lo spazio e una cella piena a quota 1.5 (wall, builtin, context, solid con h>1.5, opening fuori da sill..head)",
            "openRun": "metri di lati di cella tra lo spazio e una cella opening aperta a quota 1.5",
        },
        "nx": nx, "nz": nz, "cellsByKind": dict(sorted(kinds.items())), "areas": areas(plan), "runs": dict(sorted(runs.items())),
    }


__all__ = ["run_all", "areas", "oracle", "colliders", "walk_ids", "DOOR_CLEAR", "PATH_CLEAR", "WALL", "BUILTIN"]
