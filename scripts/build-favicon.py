#!/usr/bin/env python3
"""
Compose the ODP logo onto a white circle so the favicon stays visible
on dark browser tabs/bookmarks. Generates 256px and 64px PNGs plus
an apple-touch-icon variant.

Run: python3 scripts/build-favicon.py
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
PREVIEW_IMG = ROOT / "preview-site/assets/img"
THEME_IMG = ROOT / "obras-del-pais-theme/assets/img"

SOURCE = PREVIEW_IMG / "logo-icon-512.png"  # transparent black logo on transparent

# Sizes to render: (size, filename)
TARGETS = [
    (256, "favicon-256.png"),
    (180, "apple-touch-icon.png"),  # iOS uses 180; falls back to 256 if missing
    (64,  "favicon-64.png"),
    (32,  "favicon-32.png"),
]

# Ratio of the inner logo to the outer circle. ~0.66 = some padding.
INNER_RATIO = 0.66


def compose(size: int, dest: Path) -> None:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    # Draw the white circle
    draw = ImageDraw.Draw(canvas)
    draw.ellipse((0, 0, size - 1, size - 1), fill=(255, 255, 255, 255))

    # Open + downscale the logo
    logo = Image.open(SOURCE).convert("RGBA")
    inner_size = int(size * INNER_RATIO)
    logo = logo.resize((inner_size, inner_size), Image.LANCZOS)

    # Composite centered
    offset = ((size - inner_size) // 2, (size - inner_size) // 2)
    canvas.alpha_composite(logo, dest=offset)

    canvas.save(dest, "PNG", optimize=True)
    print(f"  wrote {dest.relative_to(ROOT)} ({dest.stat().st_size // 1024} KB)")


for img_dir in (PREVIEW_IMG, THEME_IMG):
    for size, fname in TARGETS:
        compose(size, img_dir / fname)

print("Done.")
