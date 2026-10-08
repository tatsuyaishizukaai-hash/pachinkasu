#!/usr/bin/env python3
"""アプリのアイコンを書き出す： python3 src/make-icons.py
SVGで描いて Playwright（Chromium）で PNG にする。文字は Noto Sans CJK JP Black。"""
import os
from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'icons')

def rays():
    import math
    out = []
    n = 16
    for i in range(n):
        a0 = (i / n) * 2 * math.pi
        a1 = ((i + 0.5) / n) * 2 * math.pi
        x0, y0 = 256 + 520 * math.cos(a0), 256 + 520 * math.sin(a0)
        x1, y1 = 256 + 520 * math.cos(a1), 256 + 520 * math.sin(a1)
        out.append(f'<path d="M256 256 L{x0:.1f} {y0:.1f} L{x1:.1f} {y1:.1f} Z" fill="#ffc21a"/>')
    return ''.join(out)

def ball(cx, cy, r):
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#silver)" stroke="#16121f" stroke-width="{max(3, r*0.28):.1f}"/>'
            f'<circle cx="{cx - r*0.32:.1f}" cy="{cy - r*0.34:.1f}" r="{r*0.28:.1f}" fill="#fff"/>')

def art():
    # パチンコ台（赤い枠・液晶の7・下皿の玉）と「店長録」のリボン
    return f'''
  <g>
    <rect x="128" y="58" width="256" height="352" rx="34" fill="#16121f"/>
    <rect x="128" y="50" width="256" height="352" rx="34" fill="#ff2d55" stroke="#16121f" stroke-width="14"/>
    <rect x="150" y="70" width="212" height="34" rx="12" fill="#ffd23f" stroke="#16121f" stroke-width="8"/>
    <circle cx="178" cy="87" r="7" fill="#ff2d55"/><circle cx="206" cy="87" r="7" fill="#2f6bff"/>
    <circle cx="306" cy="87" r="7" fill="#14a35a"/><circle cx="334" cy="87" r="7" fill="#ff2d55"/>
    <circle cx="256" cy="208" r="92" fill="#e9f3ff" stroke="#16121f" stroke-width="12"/>
    <rect x="198" y="160" width="116" height="92" rx="14" fill="#2d2459" stroke="#16121f" stroke-width="8"/>
    <text x="256" y="238" text-anchor="middle" font-family="Noto Sans CJK JP" font-weight="900" font-size="96"
          fill="#ffd23f" stroke="#16121f" stroke-width="7" paint-order="stroke">7</text>
    {ball(186, 150, 13)}{ball(330, 168, 11)}{ball(320, 268, 12)}{ball(196, 270, 10)}
    <rect x="150" y="318" width="212" height="62" rx="20" fill="#ffffff" stroke="#16121f" stroke-width="10"/>
    {ball(190, 349, 15)}{ball(224, 345, 15)}{ball(258, 350, 15)}{ball(292, 345, 15)}{ball(324, 350, 15)}
  </g>
  <g transform="rotate(-6 256 440)">
    <rect x="70" y="398" width="372" height="88" rx="22" fill="#16121f"/>
    <rect x="70" y="390" width="372" height="88" rx="22" fill="#7c3aed" stroke="#16121f" stroke-width="12"/>
    <text x="256" y="463" text-anchor="middle" font-family="Noto Sans CJK JP" font-weight="900" font-size="74"
          fill="#ffffff" stroke="#16121f" stroke-width="8" paint-order="stroke" letter-spacing="4">店長録</text>
  </g>'''

def svg(scale):
    t = (1 - scale) * 256
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="silver" cx="40%" cy="35%" r="70%">
      <stop offset="0" stop-color="#ffffff"/><stop offset="0.55" stop-color="#c9cbd6"/><stop offset="1" stop-color="#7d8094"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="#ffd23f"/>
  {rays()}
  <g transform="translate({t:.1f} {t:.1f}) scale({scale})">{art()}</g>
</svg>'''

def main():
    os.makedirs(OUT, exist_ok=True)
    jobs = [('icon-512.png', 512, 0.9), ('icon-192.png', 192, 0.9),
            ('apple-touch-icon.png', 180, 0.9), ('maskable-512.png', 512, 0.72)]
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, size, scale in jobs:
            pg = b.new_page(viewport={'width': size, 'height': size}, device_scale_factor=1)
            html = f'<html><body style="margin:0;background:#ffd23f"><div style="width:{size}px;height:{size}px">' \
                   + svg(scale).replace('width="512" height="512"', f'width="{size}" height="{size}"', 1) + '</div></body></html>'
            pg.set_content(html)
            pg.wait_for_timeout(150)
            pg.screenshot(path=os.path.join(OUT, name), clip={'x': 0, 'y': 0, 'width': size, 'height': size})
            pg.close()
        b.close()
    print('icons ->', OUT)

if __name__ == '__main__':
    main()
