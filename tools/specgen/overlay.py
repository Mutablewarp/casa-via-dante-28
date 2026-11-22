"""Disegna la lettura della pianta sopra la planimetria originale, per il controllo visivo."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Tuple

logger = logging.getLogger(__name__)
ZOOM = 2
COLORS = {"giorno": (255, 196, 87), "notte": (126, 178, 255), "servizi": (190, 190, 190), "ala_studio": (150, 214, 150), "comune": (225, 225, 225)}


def draw_overlay(plan: Dict[str, Any], furn: Dict[str, Any], tour: Dict[str, Any], src: Path, out: Path) -> None:
    """Salva un PNG con stanze, aperture, arredi e percorso sovrapposti alla scansione."""
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        logger.warning("Pillow non installato: salto il disegno di %s", out.name)
        return
    ppm = plan["meta"]["scale"]["pxPerMeter"]
    ox, oy = plan["meta"]["scale"]["originPx"]

    def px(x: float, z: float) -> Tuple[float, float]:
        return ((x * ppm + ox) * ZOOM, (z * ppm + oy) * ZOOM)

    def box(r: List[float]) -> List[Tuple[float, float]]:
        return [px(r[0], r[1]), px(r[2], r[3])]

    base = Image.open(src).convert("RGB")
    base = base.resize((base.width * ZOOM, base.height * ZOOM), Image.LANCZOS).convert("RGBA")
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 15)
        small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 11)
    except OSError:
        font = small = ImageFont.load_default()
    for o in plan["outdoor"]:
        for r in o["rects"]:
            d.rectangle(box(r), fill=(120, 200, 120, 60), outline=(40, 140, 40, 255))
    for b in plan["builtins"]:
        d.rectangle(box(b["rect"]), fill=(150, 100, 60, 130))
    for room in plan["rooms"]:
        c = COLORS[room["zone"]]
        for r in room["rects"]:
            d.rectangle(box(r), fill=(*c, 95), outline=(*c, 255), width=2)
    for s in plan["solids"]:
        d.rectangle(box(s["rect"]), fill=(60, 60, 60, 220))
    for it in furn["items"]:
        if it.get("mount") != "floor":
            continue
        if it["type"] == "rug":
            d.rectangle(box(it["rect"]), outline=(180, 40, 40, 200))
        elif it["variant"] in (None, furn["variants"]["active"].get(it["room"])):
            d.rectangle(box(it["rect"]), fill=(90, 60, 30, 150), outline=(60, 30, 10, 255))
    for o in plan["openings"]:
        col = {"window": (0, 150, 255, 255), "french": (0, 200, 120, 255)}.get(o["type"], (230, 0, 160, 255))
        d.rectangle(box(o["rect"]), fill=col)
    pts = [px(*w["p"]) for w in tour["path"]]
    d.line(pts, fill=(220, 0, 0, 255), width=3)
    n = 0
    for w, p in zip(tour["path"], pts):
        if "stop" in w:
            n += 1
            d.ellipse([p[0] - 9, p[1] - 9, p[0] + 9, p[1] + 9], fill=(220, 0, 0, 255))
            d.text((p[0] - 4 if n < 10 else p[0] - 8, p[1] - 7), str(n), fill=(255, 255, 255, 255), font=small)
    for s in plan["rooms"] + plan["outdoor"]:
        x, y = px(*s["label"])
        text = f"{s['name']}\n{s['area']:.1f} m2"
        d.multiline_text((x, y), text, fill=(0, 0, 0, 255), font=font, anchor="mm", align="center", stroke_width=3, stroke_fill=(255, 255, 255, 230))
    crop = (0, int((oy - 20) * ZOOM), base.width, int((oy + 15.2 * ppm) * ZOOM))
    Image.alpha_composite(base, layer).convert("RGB").crop(crop).save(out)
    logger.info("scritto %s", out)
