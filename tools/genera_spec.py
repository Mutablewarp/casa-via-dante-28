"""Genera spec/plan.json, spec/furnishing.json e spec/tour.json dai dati in tools/specgen e li verifica.

Uso:
    python3 tools/genera_spec.py            rigenera i tre file e stampa l'esito dei controlli
    python3 tools/genera_spec.py --overlay  in piu disegna spec/plan-overlay.png (richiede Pillow)

Esce con codice 1 se un controllo fallisce.
"""

from __future__ import annotations

import argparse
import json
import logging
import math
import sys
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parent))

from specgen.checks import areas, colliders, oracle, run_all  # noqa: E402
from specgen.furnishing_data import build_furnishing  # noqa: E402
from specgen.geometry import Grid, expand  # noqa: E402
from specgen.leaves import add_leaves  # noqa: E402
from specgen.plan_data import build_plan  # noqa: E402
from specgen.tour_data import build_tour  # noqa: E402

logger = logging.getLogger("genera_spec")
ROOT = Path(__file__).resolve().parent.parent
SPEC = ROOT / "spec"


def _dims(rects: List[List[float]]) -> str:
    """Dimensioni leggibili: rettangolo principale piu eventuali appendici."""
    main = max(rects, key=lambda r: (r[2] - r[0]) * (r[3] - r[1]))
    text = f"{main[2] - main[0]:.2f} x {main[3] - main[1]:.2f} m"
    return text if len(rects) == 1 else text + f" piu {len(rects) - 1} appendic{'e' if len(rects) == 2 else 'i'}"


def _spawn(plan: Dict[str, Any], furn: Dict[str, Any], space: Dict[str, Any], grid: Grid) -> List[float]:
    """Punto libero piu vicino all'etichetta: almeno 35 cm da muri e arredi, dentro lo stesso spazio."""
    boxes = [expand(tuple(i["rect"]), 0.35) for i in colliders(furn)]
    ring = [(0.35 * math.cos(k * math.pi / 4), 0.35 * math.sin(k * math.pi / 4)) for k in range(8)]
    lx, lz = space["label"]

    def free(x: float, z: float) -> bool:
        if any(grid.space_at(x + dx, z + dz) != space["id"] for dx, dz in [(0.0, 0.0)] + ring):
            return False
        return not any(b[0] < x < b[2] and b[1] < z < b[3] for b in boxes)

    best, best_d = None, 1e9
    for r in space["rects"]:
        for i in range(int(round((r[2] - r[0]) / 0.05)) + 1):
            for j in range(int(round((r[3] - r[1]) / 0.05)) + 1):
                x, z = round(r[0] + i * 0.05, 2), round(r[1] + j * 0.05, 2)
                d = (x - lx) ** 2 + (z - lz) ** 2
                if d < best_d and free(x, z):
                    best, best_d = [x, z], d
    if best is None:
        raise ValueError(f"nessun punto libero in {space['id']}")
    return best


def enrich(plan: Dict[str, Any], furn: Dict[str, Any]) -> Dict[str, Any]:
    """Aggiunge superfici, dimensioni, punto di arrivo e ante aperte calcolati."""
    a = areas(plan)
    grid = Grid(plan)
    add_leaves(plan, grid)
    for s in plan["rooms"] + plan["outdoor"]:
        s["area"] = a[s["id"]]
        s["dims"] = _dims(s["rects"])
        s["spawn"] = _spawn(plan, furn, s, grid)
    inside = round(sum(r["area"] for r in plan["rooms"] if r["kind"] == "interior"), 1)
    outside = round(sum(o["area"] for o in plan["outdoor"]), 1)
    plan["meta"]["totals"] = {"interni": inside, "esterni": outside}
    return plan


def _compact(value: Any, depth: int = 0) -> str:
    """Serializza tenendo su una riga sola ogni voce degli elenchi (piu corto e piu leggibile)."""
    pad = " " * (depth + 1)
    if isinstance(value, dict) and depth < 2:
        rows = [f'{pad}{json.dumps(k, ensure_ascii=False)}: {_compact(v, depth + 1)}' for k, v in value.items()]
        return "{\n" + ",\n".join(rows) + "\n" + " " * depth + "}"
    if isinstance(value, list) and value and isinstance(value[0], (dict, list)) and depth < 3:
        rows = [pad + json.dumps(v, ensure_ascii=False, separators=(", ", ": ")) for v in value]
        return "[\n" + ",\n".join(rows) + "\n" + " " * depth + "]"
    return json.dumps(value, ensure_ascii=False, separators=(", ", ": "))


def write(name: str, data: Dict[str, Any]) -> None:
    """Scrive un file JSON con una voce per riga negli elenchi."""
    text = _compact(data)
    json.loads(text)
    (SPEC / name).write_text(text + "\n", encoding="utf-8")
    logger.info("scritto spec/%s (%d byte)", name, len(text))


def main() -> int:
    """Punto d'ingresso."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--overlay", action="store_true", help="disegna spec/plan-overlay.png")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    furn, tour = build_furnishing(), build_tour()
    plan = enrich(build_plan(), furn)
    report = run_all(plan, furn, tour)
    failed = 0
    for group, errs in report.items():
        logger.info("%-13s %s", group, "OK" if not errs else f"{len(errs)} ERRORI")
        for e in errs:
            logger.error("   - %s", e)
        failed += len(errs)
    write("plan.json", plan)
    write("furnishing.json", furn)
    write("tour.json", tour)
    write("oracle.json", oracle(plan))
    logger.info("superfici: interni %.1f m2, esterni %.1f m2", plan["meta"]["totals"]["interni"], plan["meta"]["totals"]["esterni"])
    if args.overlay:
        from specgen.overlay import draw_overlay
        draw_overlay(plan, furn, tour, SPEC / "riferimenti" / "planimetria.jpg", SPEC / "plan-overlay.png")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
