"""Geometria 2D della planimetria: rettangoli allineati agli assi e griglia a celle.

Convenzioni (identiche a spec/02-CONTRATTO.md):
    +x corre lungo via Dante verso i monti (ovest-sud-ovest), -x verso il Politeama
    +z va verso via Dante (facciata con la terrazza), -z verso il retro
    unita: metri, coordinate multiple di SNAP
Un rettangolo e sempre (x0, z0, x1, z1) con x0 < x1 e z0 < z1.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

Rect = Tuple[float, float, float, float]

SNAP = 0.05
EPS = 1e-6

# Tipi di cella, in ordine di priorita decrescente durante la classificazione.
SOLID = "solid"
OPENING = "opening"
BUILTIN = "builtin"
ROOM = "room"
STAIRS = "stairs"
OUTDOOR = "outdoor"
WALL = "wall"
CONTEXT = "context"
OUTSIDE = "outside"


def rect_area(r: Rect) -> float:
    """Area di un rettangolo in metri quadrati."""
    return (r[2] - r[0]) * (r[3] - r[1])


def rects_area(rects: Iterable[Rect]) -> float:
    """Area di un'unione di rettangoli che non si sovrappongono."""
    return sum(rect_area(r) for r in rects)


def rect_contains(r: Rect, x: float, z: float, margin: float = 0.0) -> bool:
    """Vero se il punto e dentro il rettangolo ristretto di margin."""
    return r[0] + margin - EPS <= x <= r[2] - margin + EPS and r[1] + margin - EPS <= z <= r[3] - margin + EPS


def rects_contain(rects: Iterable[Rect], x: float, z: float) -> bool:
    """Vero se il punto cade in almeno uno dei rettangoli."""
    return any(rect_contains(r, x, z) for r in rects)


def rects_overlap(a: Rect, b: Rect, tol: float = 1e-4) -> bool:
    """Vero se due rettangoli si sovrappongono per piu di tol."""
    return a[0] < b[2] - tol and b[0] < a[2] - tol and a[1] < b[3] - tol and b[1] < a[3] - tol


def expand(r: Rect, m: float) -> Rect:
    """Rettangolo allargato di m su ogni lato."""
    return (r[0] - m, r[1] - m, r[2] + m, r[3] + m)


def is_snapped(v: float) -> bool:
    """Vero se v e multiplo di SNAP."""
    return abs(round(v / SNAP) * SNAP - v) < 1e-6


@dataclass(frozen=True)
class Cell:
    """Classificazione di una cella della griglia."""

    kind: str
    ref: Optional[str]


class Grid:
    """Griglia a celle ottenuta comprimendo tutte le coordinate distinte del piano."""

    def __init__(self, plan: Dict) -> None:
        self.plan = plan
        xs: set = set()
        zs: set = set()
        for r in self._all_rects(plan):
            xs.update((round(r[0], 3), round(r[2], 3)))
            zs.update((round(r[1], 3), round(r[3], 3)))
        self.xs: List[float] = sorted(xs)
        self.zs: List[float] = sorted(zs)
        self.cells: List[List[Cell]] = [
            [self._classify((self.xs[i] + self.xs[i + 1]) / 2, (self.zs[j] + self.zs[j + 1]) / 2) for i in range(len(self.xs) - 1)]
            for j in range(len(self.zs) - 1)
        ]

    @staticmethod
    def _all_rects(plan: Dict) -> List[Rect]:
        out: List[Rect] = [tuple(r) for r in plan["footprint"]]
        for group in ("rooms", "outdoor"):
            for item in plan[group]:
                out.extend(tuple(r) for r in item["rects"])
        for group in ("openings", "solids", "builtins"):
            out.extend(tuple(item["rect"]) for item in plan[group])
        out.append(tuple(plan["stairs"]["rect"]))
        out.extend(tuple(r) for b in plan["context"]["blocks"] for r in b["rects"])
        return out

    def _classify(self, x: float, z: float) -> Cell:
        plan = self.plan
        for s in plan["solids"]:
            if rect_contains(tuple(s["rect"]), x, z):
                return Cell(SOLID, s["id"])
        for o in plan["openings"]:
            if rect_contains(tuple(o["rect"]), x, z):
                return Cell(OPENING, o["id"])
        for b in plan["builtins"]:
            if rect_contains(tuple(b["rect"]), x, z):
                return Cell(BUILTIN, b["id"])
        for r in plan["rooms"]:
            if rects_contain((tuple(q) for q in r["rects"]), x, z):
                return Cell(ROOM, r["id"])
        if rect_contains(tuple(plan["stairs"]["rect"]), x, z):
            return Cell(STAIRS, "rampe")
        for o in plan["outdoor"]:
            if rects_contain((tuple(q) for q in o["rects"]), x, z):
                return Cell(OUTDOOR, o["id"])
        if rects_contain((tuple(q) for q in plan["footprint"]), x, z):
            return Cell(WALL, None)
        for b in plan["context"]["blocks"]:
            if rects_contain((tuple(q) for q in b["rects"]), x, z):
                return Cell(CONTEXT, b["id"])
        return Cell(OUTSIDE, None)

    def cell_at(self, x: float, z: float) -> Cell:
        """Cella che contiene il punto (OUTSIDE se fuori griglia)."""
        if not (self.xs[0] <= x < self.xs[-1] and self.zs[0] <= z < self.zs[-1]):
            return Cell(OUTSIDE, None)
        i = max(k for k in range(len(self.xs) - 1) if self.xs[k] <= x + EPS)
        j = max(k for k in range(len(self.zs) - 1) if self.zs[k] <= z + EPS)
        return self.cells[j][i]

    def space_at(self, x: float, z: float) -> Optional[str]:
        """Id della stanza o dello spazio esterno nel punto, altrimenti None."""
        c = self.cell_at(x, z)
        return c.ref if c.kind in (ROOM, OUTDOOR) else None

    def walkable(self, x: float, z: float, walk_openings: Sequence[str]) -> bool:
        """Vero se un visitatore puo stare nel punto (ignorando gli arredi)."""
        c = self.cell_at(x, z)
        if c.kind in (ROOM, OUTDOOR):
            return True
        return c.kind == OPENING and c.ref in walk_openings

    def cells_of_rect(self, r: Rect) -> List[Cell]:
        """Tutte le celle coperte da un rettangolo."""
        out: List[Cell] = []
        for j in range(len(self.zs) - 1):
            zc = (self.zs[j] + self.zs[j + 1]) / 2
            if not r[1] < zc < r[3]:
                continue
            for i in range(len(self.xs) - 1):
                xc = (self.xs[i] + self.xs[i + 1]) / 2
                if r[0] < xc < r[2]:
                    out.append(self.cells[j][i])
        return out
