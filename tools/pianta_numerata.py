"""Pianta numerata degli ambienti, per indicare le modifiche con un numero.

Uso:
    python3 tools/pianta_numerata.py     scrive spec/pianta-numerata.svg

Legge spec/plan.json e spec/furnishing.json (devono essere aggiornati: python3 tools/genera_spec.py).
La vista e quella dall'alto dell'app: +x verso destra, +z (via Dante) verso il basso.
"""

from __future__ import annotations

import json
import logging
from html import escape
from pathlib import Path
from typing import Any, Dict, List, Tuple

logger = logging.getLogger("pianta_numerata")
ROOT = Path(__file__).resolve().parent.parent
SPEC = ROOT / "spec"

PX = 56.0            # pixel per metro
MARGIN = 40.0        # margine attorno alla pianta, in pixel
LEGEND_W = 430.0     # larghezza della colonna della legenda
SMALL_AREA = 8.5     # sotto questa superficie nella pianta c'e solo il numero
ZONE_FILL = {"giorno": "#F3E3C7", "notte": "#DCE6F2", "servizi": "#E4EEDF", "comune": "#E6E2DC"}
OUTDOOR_FILL = "#F1D9C4"


def numbered(plan: Dict[str, Any]) -> List[Tuple[int, Dict[str, Any], bool]]:
    """Ambienti nell'ordine di plan.json, numerati da 1: prima gli interni, poi gli spazi esterni."""
    spaces = [(s, False) for s in plan["rooms"]] + [(s, True) for s in plan["outdoor"]]
    return [(i + 1, s, out) for i, (s, out) in enumerate(spaces)]


def fmt_area(a: float) -> str:
    return f"{a:.1f}".replace(".", ",") + " m²"


def build_svg(plan: Dict[str, Any], furn: Dict[str, Any]) -> str:
    """Disegna la pianta con numeri, nomi, superfici e legenda."""
    rects = [r for s in plan["rooms"] + plan["outdoor"] for r in s["rects"]] + list(plan["footprint"])
    x0 = min(r[0] for r in rects) - 0.3
    z0 = min(r[1] for r in rects) - 0.3
    x1 = max(r[2] for r in rects) + 0.3
    z1 = max(r[3] for r in rects) + 0.3

    def X(x: float) -> float:
        return MARGIN + (x - x0) * PX

    def Z(z: float) -> float:
        return MARGIN + 34 + (z - z0) * PX

    def rect(r: List[float], fill: str, extra: str = "") -> str:
        return (f'<rect x="{X(r[0]):.1f}" y="{Z(r[1]):.1f}" width="{(r[2] - r[0]) * PX:.1f}" '
                f'height="{(r[3] - r[1]) * PX:.1f}" fill="{fill}" {extra}/>')

    plan_w = (x1 - x0) * PX
    width = MARGIN * 2 + plan_w + LEGEND_W
    height = MARGIN * 2 + 34 + (z1 - z0) * PX + 46
    out: List[str] = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width:.0f}" height="{height:.0f}" '
        f'viewBox="0 0 {width:.0f} {height:.0f}" font-family="Helvetica, Arial, sans-serif">',
        f'<rect width="100%" height="100%" fill="#FBF8F2"/>',
        f'<text x="{MARGIN}" y="{MARGIN + 6}" font-size="22" font-weight="bold" fill="#2A2622">'
        f'Attico Liberty, via Dante 28 · pianta numerata degli ambienti</text>',
    ]
    # muri: l'impronta piena, poi gli ambienti sopra
    for r in plan["footprint"]:
        out.append(rect(r, "#3A3633"))
    for n, s, outdoor in numbered(plan):
        fill = OUTDOOR_FILL if outdoor else ZONE_FILL.get(s.get("zone", ""), "#EEE8DE")
        for r in s["rects"]:
            out.append(rect(r, fill))
    # aperture: passaggi chiari, finestre azzurre
    for o in plan["openings"]:
        color = "#FFFFFF" if o["walk"] else "#8FC1E3"
        out.append(rect(o["rect"], color))
    # arredi a pavimento, appena accennati, per orientarsi
    for it in furn["items"]:
        if it.get("mount") != "floor" or it.get("variant") not in (None, furn["variants"]["active"].get(it["room"])):
            continue
        dash = ' stroke-dasharray="3 3"' if it["type"] == "rug" else ""
        out.append(rect(it["rect"], "none", f'stroke="#A79C8E" stroke-width="1"{dash}'))
    # numeri, nomi e superfici
    for n, s, outdoor in numbered(plan):
        lx, lz = s.get("label") or s["spawn"]
        cx, cy = X(lx), Z(lz)
        out.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="15" fill="#2F5D50" stroke="#FFFFFF" stroke-width="2"/>')
        out.append(f'<text x="{cx:.1f}" y="{cy + 5.5:.1f}" font-size="16" font-weight="bold" fill="#FFFFFF" '
                   f'text-anchor="middle">{n}</text>')
        if s["area"] >= SMALL_AREA:
            out.append(f'<text x="{cx:.1f}" y="{cy + 33:.1f}" font-size="13" font-weight="bold" fill="#2A2622" '
                       f'text-anchor="middle">{escape(s["name"])}</text>')
            out.append(f'<text x="{cx:.1f}" y="{cy + 48:.1f}" font-size="12" fill="#5A524A" '
                       f'text-anchor="middle">{fmt_area(s["area"])}</text>')
    # orientamento
    bottom = Z(z1) + 30
    out.append(f'<text x="{MARGIN + plan_w / 2:.1f}" y="{bottom:.1f}" font-size="15" fill="#2A2622" '
               f'text-anchor="middle">▼ via Dante · Palazzo Ziino di fronte</text>')
    out.append(f'<text x="{MARGIN:.1f}" y="{bottom:.1f}" font-size="13" fill="#5A524A">◀ Politeama</text>')
    out.append(f'<text x="{MARGIN + plan_w:.1f}" y="{bottom:.1f}" font-size="13" fill="#5A524A" '
               f'text-anchor="end">Monte Cuccio ▶</text>')
    # legenda
    lx0 = MARGIN * 1.5 + plan_w
    y = MARGIN + 50
    out.append(f'<text x="{lx0:.1f}" y="{y:.1f}" font-size="15" font-weight="bold" fill="#2A2622">Ambienti</text>')
    y += 10
    for n, s, outdoor in numbered(plan):
        if n == len(plan["rooms"]) + 1:
            y += 12
            out.append(f'<text x="{lx0:.1f}" y="{y + 14:.1f}" font-size="15" font-weight="bold" fill="#2A2622">Esterni</text>')
            y += 20
        y += 26
        out.append(f'<circle cx="{lx0 + 12:.1f}" cy="{y - 5:.1f}" r="11" fill="#2F5D50"/>')
        out.append(f'<text x="{lx0 + 12:.1f}" y="{y - 0.5:.1f}" font-size="12" font-weight="bold" fill="#FFFFFF" '
                   f'text-anchor="middle">{n}</text>')
        out.append(f'<text x="{lx0 + 32:.1f}" y="{y:.1f}" font-size="14" fill="#2A2622">{escape(s["name"])}</text>')
        out.append(f'<text x="{lx0 + LEGEND_W - 50:.1f}" y="{y:.1f}" font-size="13" fill="#5A524A" '
                   f'text-anchor="end">{fmt_area(s["area"])}</text>')
    tot = plan["meta"]["totals"]
    y += 34
    out.append(f'<text x="{lx0:.1f}" y="{y:.1f}" font-size="13" fill="#5A524A">'
               f'Interni {fmt_area(tot["interni"])} · esterni {fmt_area(tot["esterni"])}</text>')
    out.append(f'<text x="{lx0:.1f}" y="{y + 20:.1f}" font-size="12" fill="#5A524A">'
               f'Rettangoli grigi: arredi; tratteggio: tappeti; bianco: passaggi; azzurro: finestre.</text>')
    out.append("</svg>")
    return "\n".join(out)


def main() -> int:
    """Punto d'ingresso."""
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    plan = json.loads((SPEC / "plan.json").read_text(encoding="utf-8"))
    furn = json.loads((SPEC / "furnishing.json").read_text(encoding="utf-8"))
    path = SPEC / "pianta-numerata.svg"
    path.write_text(build_svg(plan, furn), encoding="utf-8")
    logger.info("scritto %s", path.relative_to(ROOT))
    for n, s, _ in numbered(plan):
        logger.info("%2d  %-26s %s", n, s["name"], fmt_area(s["area"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
