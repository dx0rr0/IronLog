"""Generate PWA icons for IronLog.

Produces:
  public/icon-192.png         (192x192, regular)
  public/icon-512.png         (512x512, regular)
  public/icon-512-maskable.png (512x512, with safe-zone padding for adaptive icons)
  public/apple-touch-icon.png (180x180)
  public/favicon.svg          (vector)
"""

from PIL import Image, ImageDraw, ImageFont
import os, glob

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public')
OUT = os.path.normpath(OUT)
os.makedirs(OUT, exist_ok=True)

BG = (10, 10, 11)        # zinc-950
ACCENT = (212, 255, 55)  # lime-300
DARK = (24, 24, 27)      # zinc-900

# ---------------- raster icons ----------------

def find_bold_font(size):
    """Try to find a heavy/condensed font; fall back to default."""
    candidates = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    ]
    candidates += sorted(glob.glob('/usr/share/fonts/**/*Bold*.ttf', recursive=True))
    for c in candidates:
        if os.path.exists(c):
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
    return ImageFont.load_default()


def draw_icon(size, maskable=False):
    img = Image.new('RGB', (size, size), BG)
    draw = ImageDraw.Draw(img)

    # Maskable icons need a safe zone — content within central 80%
    inset = int(size * 0.10) if maskable else 0

    # Inner card to add visual depth
    card_x0, card_y0 = int(size * 0.12) + inset, int(size * 0.22) + inset
    card_x1, card_y1 = size - int(size * 0.12) - inset, size - int(size * 0.22) - inset
    radius = int(size * 0.12)
    draw.rounded_rectangle((card_x0, card_y0, card_x1, card_y1), radius=radius, fill=DARK)

    # "IL" centered text
    target_h = int((card_y1 - card_y0) * 0.78)
    font = find_bold_font(target_h)
    text = 'IL'
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    cx, cy = (card_x0 + card_x1) // 2, (card_y0 + card_y1) // 2
    draw.text((cx - tw // 2 - bbox[0], cy - th // 2 - bbox[1]), text, fill=ACCENT, font=font)

    # Tag dot (lime accent corner)
    dot_r = int(size * 0.04)
    dot_cx = card_x1 - int(size * 0.06)
    dot_cy = card_y0 + int(size * 0.06)
    draw.ellipse((dot_cx - dot_r, dot_cy - dot_r, dot_cx + dot_r, dot_cy + dot_r), fill=ACCENT)

    return img


for size, name, mask in [
    (192, 'icon-192.png', False),
    (512, 'icon-512.png', False),
    (512, 'icon-512-maskable.png', True),
    (180, 'apple-touch-icon.png', False),
]:
    out = os.path.join(OUT, name)
    draw_icon(size, mask).save(out, 'PNG', optimize=True)
    print('wrote', out)

# ---------------- favicon.svg ----------------
svg = """<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="12" fill="#0a0a0b"/>
  <rect x="8" y="14" width="48" height="36" rx="6" fill="#18181b"/>
  <text x="32" y="42" text-anchor="middle" font-family="Arial Narrow, Impact, sans-serif" font-weight="900"
        font-size="26" fill="#d4ff37">IL</text>
  <circle cx="50" cy="20" r="2.5" fill="#d4ff37"/>
</svg>
"""
with open(os.path.join(OUT, 'favicon.svg'), 'w') as f:
    f.write(svg)
print('wrote favicon.svg')
