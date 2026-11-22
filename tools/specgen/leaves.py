"""Ante di porte e portefinestre: da dove ruotano e dove arrivano quando sono aperte.

Il risultato finisce in plan.json (campo `leaves` di ogni apertura), cosi chi disegna i serramenti non deve
indovinare il verso, e i controlli possono verificare che un'anta aperta non entri in un mobile o in un muro.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple

from .geometry import Grid

LEAF_CLEAR = 0.04      # distanza minima tra un'anta aperta e un mobile
LEAF_PATH_CLEAR = 0.30  # distanza minima tra un'anta aperta e il percorso del tour
SINGLE = {"door": 100.0, "service": 100.0, "entry": 95.0}
DOUBLE = {"french": 95.0}

Point = Tuple[float, float]


def _side(o: Dict[str, Any], grid: Grid, room: str) -> int:
    """+1 se la stanza sta dal lato delle coordinate crescenti del muro, -1 dall'altro, 0 se non confina."""
    x0, z0, x1, z1 = o["rect"]
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    plus, minus = ((cx, z1 + 0.06), (cx, z0 - 0.06)) if o["wallAlong"] == "x" else ((x1 + 0.06, cz), (x0 - 0.06, cz))
    if grid.space_at(*plus) == room:
        return 1
    return -1 if grid.space_at(*minus) == room else 0


def _point(o: Dict[str, Any], along: float, side: int, depth: float) -> Point:
    """Punto a quota `along` lungo il muro, `depth` metri dentro la stanza a partire dal filo del muro."""
    x0, z0, x1, z1 = o["rect"]
    if o["wallAlong"] == "x":
        return along, (z1 if side > 0 else z0) + side * depth
    return (x1 if side > 0 else x0) + side * depth, along


def _run(o: Dict[str, Any], grid: Grid, room: str, side: int, start: float, step: float) -> float:
    """Metri di parete libera oltre lo stipite, misurati dentro la stanza, fino al primo muro laterale."""
    d = 0.0
    while d < 3.0 and grid.space_at(*_point(o, start + step * (d + 0.02), side, 0.06)) == room:
        d += 0.02
    return d


def _leaf(o: Dict[str, Any], side: int, hinge: float, toward: int, length: float, angle: float) -> Dict[str, Any]:
    """Anta lunga `length` incernierata a `hinge`: chiusa punta verso `toward` lungo il muro, aperta ruota in stanza."""
    a = math.radians(angle)
    along, depth = hinge + toward * length * math.cos(a), length * math.sin(a)
    hx, hz = _point(o, hinge, side, 0.0)
    tx, tz = _point(o, along, side, depth)
    return {"hinge": [round(hx, 3), round(hz, 3)], "tip": [round(tx, 3), round(tz, 3)], "angle": angle}


def _inside(leaf: Dict[str, Any], grid: Grid, room: str) -> bool:
    return all(grid.space_at(*p) == room for p in samples(leaf, start=0.15))


def samples(leaf: Dict[str, Any], start: float = 0.0, n: int = 24) -> List[Point]:
    """Punti lungo l'anta aperta, dalla frazione `start` fino alla punta."""
    (hx, hz), (tx, tz) = leaf["hinge"], leaf["tip"]
    return [(hx + (tx - hx) * t, hz + (tz - hz) * t) for t in (start + (1 - start) * k / n for k in range(n + 1))]


def leaves_of(o: Dict[str, Any], plan: Dict[str, Any], grid: Grid) -> Optional[Dict[str, Any]]:
    """Ante aperte di un'apertura: `{ room, list: [{ hinge, tip, angle }] }`, oppure None se non ne ha."""
    kind = o["type"]
    if kind not in SINGLE and kind not in DOUBLE:
        return None
    a0, a1 = (o["rect"][0], o["rect"][2]) if o["wallAlong"] == "x" else (o["rect"][1], o["rect"][3])
    if kind in DOUBLE:
        interior = {r["id"] for r in plan["rooms"]}
        room = o["to"] if o["to"] in interior else o["from"]
        side = _side(o, grid, room)
        half = (a1 - a0) / 2
        return {"room": room, "list": [_leaf(o, side, a0, 1, half, DOUBLE[kind]), _leaf(o, side, a1, -1, half, DOUBLE[kind])]}
    room = o["to"]
    side = _side(o, grid, room)
    low, high = _run(o, grid, room, side, a0, -1.0), _run(o, grid, room, side, a1, 1.0)
    hinge, toward = (a0, 1) if low <= high else (a1, -1)
    leaf = _leaf(o, side, hinge, toward, a1 - a0, SINGLE[kind])
    if not _inside(leaf, grid, room):
        leaf = _leaf(o, side, hinge, toward, a1 - a0, 90.0)
    return {"room": room, "list": [leaf]}


def add_leaves(plan: Dict[str, Any], grid: Grid) -> None:
    """Scrive il campo `leaves` in ogni apertura di plan (None dove non ci sono ante da tenere aperte)."""
    for o in plan["openings"]:
        o["leaves"] = leaves_of(o, plan, grid)


def _dist(p: Point, a: Point, b: Point) -> float:
    (px, pz), (ax, az), (bx, bz) = p, a, b
    dx, dz = bx - ax, bz - az
    t = max(0.0, min(1.0, ((px - ax) * dx + (pz - az) * dz) / ((dx * dx + dz * dz) or 1.0)))
    return math.hypot(px - ax - t * dx, pz - az - t * dz)


def check_leaves(plan: Dict[str, Any], furn: Optional[Dict[str, Any]], tour: Optional[Dict[str, Any]], grid: Grid) -> List[str]:
    """Nessun'anta aperta esce dalla sua stanza, entra in un mobile, tocca un'altra anta o sfiora il tour."""
    errs: List[str] = []
    items = [it for it in (furn or {}).get("items", []) if it.get("mount") == "floor" and it["type"] != "rug"]
    path = [tuple(w["p"]) for w in (tour or {}).get("path", [])]
    all_leaves = [(o["id"], o["leaves"]["room"], leaf) for o in plan["openings"] if o.get("leaves") for leaf in o["leaves"]["list"]]
    for oid, room, leaf in all_leaves:
        if not _inside(leaf, grid, room):
            errs.append(f"l'anta di {oid} esce da {room}")
        pts = samples(leaf)
        for it in items:
            x0, z0, x1, z1 = it["rect"]
            if any(x0 - LEAF_CLEAR < x < x1 + LEAF_CLEAR and z0 - LEAF_CLEAR < z < z1 + LEAF_CLEAR for x, z in pts):
                errs.append(f"l'anta di {oid} entra in {it['id']}")
        hinge, tip = tuple(leaf["hinge"]), tuple(leaf["tip"])
        for k in range(len(path) - 1):
            (ax, az), (bx, bz) = path[k], path[k + 1]
            n = max(1, int(math.hypot(bx - ax, bz - az) / 0.05))
            near = min(_dist((ax + (bx - ax) * s / n, az + (bz - az) * s / n), hinge, tip) for s in range(n + 1))
            if near < LEAF_PATH_CLEAR:
                errs.append(f"l'anta di {oid} sta a {near:.2f} m dal tratto {k} del tour")
    for i, (ia, ra, la) in enumerate(all_leaves):
        for ib, rb, lb in all_leaves[i + 1:]:
            if ia != ib and ra == rb and any(_dist(p, tuple(lb["hinge"]), tuple(lb["tip"])) < LEAF_CLEAR for p in samples(la)):
                errs.append(f"le ante di {ia} e {ib} si toccano")
    return errs


__all__ = ["add_leaves", "check_leaves", "leaves_of", "samples", "LEAF_CLEAR", "LEAF_PATH_CLEAR"]
