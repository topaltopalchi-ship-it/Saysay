#!/usr/bin/env python3
"""Generate Android launcher icons from the supplied SaySay logo PNG."""
from pathlib import Path
import subprocess
import sys

try:
    from PIL import Image
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image

root = Path("android/app/src/main/res")
png = Path("public/saysay-icon.png")
if not png.exists():
    raise SystemExit("Supplied SaySay logo PNG was not found at public/saysay-icon.png")

source = Image.open(png).convert("RGBA")

# Render launcher resources at each Android density from the provided image.
for density, size in {
    "mdpi": 48,
    "hdpi": 72,
    "xhdpi": 96,
    "xxhdpi": 144,
    "xxxhdpi": 192,
}.items():
    folder = root / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    icon = source.resize((size, size), Image.Resampling.LANCZOS)
    icon.save(folder / "ic_launcher.png", optimize=True)
    icon.save(folder / "ic_launcher_round.png", optimize=True)

# Remove adaptive-icon XMLs that override the supplied logo on Android 8+.
adaptive = root / "mipmap-anydpi-v26"
for name in ("ic_launcher.xml", "ic_launcher_round.xml"):
    target = adaptive / name
    if target.exists():
        target.unlink()

print("Supplied SaySay PNG installed in Android mipmap resources.")
