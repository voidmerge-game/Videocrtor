#!/usr/bin/env python3
"""v5 terrain bake: NASA Blue Marble (natural colour) + Natural Earth GRAY_HR hillshade,
graded to the reference look (dark khaki plains, pink deserts, deep navy ocean with lighter shelf).

Inputs (prepared in /tmp/ne):
  bm_africa.png   5700x6000  Blue Marble topo.bathy 2004-07, lon -30..65 lat -42..58 (60 px/deg)
  gray_africa.png 5700x6000  NE GRAY_HR_SR_OB same window
  bm_world.jpg    5400x2700  Blue Marble world
  gray_world.png  4096x2048  NE GRAY_HR_SR_OB world
Outputs: public/data/terrain_africa.jpg (4560x4800, 48 px/deg), public/data/terrain_world.jpg (4096x2048)
"""
import sys, numpy as np
from PIL import Image, ImageFilter
Image.MAX_IMAGE_PIXELS = None

P = dict(gamma=0.58, desat=0.4, tint=(1.0, 0.85, 0.85), exposure=0.9, hs_gain=4.0, hs_sigma=24,
         deep=(36, 63, 93), shelf=(52, 92, 126), coast=(62, 104, 138))
for a in sys.argv[1:]:
    k, v = a.split('='); P[k] = eval(v)

def bake(bm_path, gray_path, out_path, size):
    W, H = size
    bm = Image.open(bm_path).convert('RGB').resize(size, Image.LANCZOS)
    g = Image.open(gray_path).convert('L').resize(size, Image.LANCZOS)
    gl = g.filter(ImageFilter.GaussianBlur(P['hs_sigma']))
    bm = np.asarray(bm); g = np.asarray(g).astype(np.int16); gl = np.asarray(gl).astype(np.int16)
    detail = (g - gl)  # +-; high-pass relief
    # water mask from Blue Marble (blue dominant) -> feathered
    r, gg, b = bm[..., 0].astype(np.int16), bm[..., 1].astype(np.int16), bm[..., 2].astype(np.int16)
    water = ((b > r + 12) & (b >= gg)).astype(np.uint8) * 255
    wimg = Image.fromarray(water).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    wm = np.asarray(wimg).astype(np.float32) / 255.0
    # distance-ish coast band for ocean lightening (blur of land mask)
    landband = np.asarray(Image.fromarray(255 - water).filter(ImageFilter.GaussianBlur(28))).astype(np.float32) / 255.0
    out = np.zeros((H, W, 3), np.uint8)
    deep = np.array(P['deep'], np.float32); shelf = np.array(P['shelf'], np.float32); coast = np.array(P['coast'], np.float32)
    tint = np.array(P['tint'], np.float32)
    step = 300
    for y0 in range(0, H, step):
        y1 = min(H, y0 + step)
        c = bm[y0:y1].astype(np.float32) / 255.0
        # ---- land grade ----
        c = np.power(np.clip(c, 0, 1), P['gamma'])
        lum = (c[..., 0] * 0.299 + c[..., 1] * 0.587 + c[..., 2] * 0.114)[..., None]
        c = lum + (c - lum) * (1 - P['desat'])
        c = c * tint * P['exposure']
        hs = 1.0 + P['hs_gain'] * (detail[y0:y1].astype(np.float32) / 255.0)
        hs = np.clip(hs, 0.45, 1.6)[..., None]
        land = np.clip(c * hs, 0, 1)
        # ---- ocean ----
        bmg = bm[y0:y1, :, 1].astype(np.float32)
        t = np.clip((bmg - 12.0) / 60.0, 0, 1)[..., None]
        oc = deep / 255.0 * (1 - t) + shelf / 255.0 * t
        lb = landband[y0:y1][..., None]
        oc = oc * (1 - lb * 0.9) + coast / 255.0 * (lb * 0.9)
        # subtle ocean-bottom relief
        oc = np.clip(oc * (1.0 + 0.5 * detail[y0:y1, :, None].astype(np.float32) / 255.0), 0, 1)
        w = wm[y0:y1][..., None]
        px = land * (1 - w) + oc * w
        out[y0:y1] = (px * 255 + 0.5).astype(np.uint8)
    Image.fromarray(out).save(out_path, quality=88, subsampling=0)
    print('wrote', out_path, out.shape)

if __name__ == '__main__':
    which = P.get('which', 'both')
    if which in ('both', 'africa'):
        bake('/tmp/ne/bm_africa.png', '/tmp/ne/gray_africa.png', 'public/data/terrain_africa.jpg', (4560, 4800))
    if which in ('both', 'world'):
        bake('/tmp/ne/bm_world.jpg', '/tmp/ne/gray_world.png', 'public/data/terrain_world.jpg', (4096, 2048))
