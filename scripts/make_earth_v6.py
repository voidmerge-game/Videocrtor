#!/usr/bin/env python3
"""v6 realistic earth textures (all public domain sources):
  NASA Blue Marble Next Generation (topo+bathy, July) 21600px tiles -> region 60 px/deg + world 4096x2048
  Natural Earth GRAY_HR_SR_OB (shaded relief) -> tangent-space bump map (R=dE, G=dN) + ocean mask (B)
  NASA Black Marble 2016 -> night lights 2048x1024
Inputs in /home/user/.cache/ne (bm_{B1,C1,B2,C2}.jpg, bm_world.jpg, gray.zip, night.jpg)
Outputs in public/data: earth_region.jpg, earth_world.jpg, bump_region.jpg, bump_world.jpg, night_world.jpg
Region = lon -25..65, lat -40..62  (REGION in src/components/EarthGlobe.tsx must match)
"""
import os, sys, zipfile, numpy as np
from PIL import Image, ImageFilter
Image.MAX_IMAGE_PIXELS = None
NE = '/home/user/.cache/ne'
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
LON0, LON1, LAT0, LAT1 = -25, 65, -40, 62
PPD = 60
RW, RH = (LON1 - LON0) * PPD, (LAT1 - LAT0) * PPD  # 5400 x 6120

def step(msg):
    print(msg, flush=True)

# ---------- Blue Marble region ----------
if not os.path.exists(f'{OUT}/earth_region.jpg'):
    region = Image.new('RGB', (RW, RH))
    tiles = {'B1': (-90, 0, 0, 90), 'C1': (0, 90, 0, 90), 'B2': (-90, 0, -90, 0), 'C2': (0, 90, -90, 0)}
    for name, (tl0, tl1, tb0, tb1) in tiles.items():
        im = Image.open(f'{NE}/bm_{name}.jpg')
        im.draft('RGB', (5400, 5400))  # JPEG DCT downscale 1/4 -> 60 px/deg
        im = im.convert('RGB')
        assert im.size == (5400, 5400), im.size
        # overlap of tile with region (degrees)
        a0, a1 = max(tl0, LON0), min(tl1, LON1)
        b0, b1 = max(tb0, LAT0), min(tb1, LAT1)
        if a1 <= a0 or b1 <= b0:
            continue
        box = ((a0 - tl0) * PPD, (tb1 - b1) * PPD, (a1 - tl0) * PPD, (tb1 - b0) * PPD)
        crop = im.crop(box)
        region.paste(crop, ((a0 - LON0) * PPD, (LAT1 - b1) * PPD))
        step(f'tile {name} box {box} -> region')
        del im, crop
    region.save(f'{OUT}/earth_region.jpg', quality=90, subsampling=0, optimize=True)
    step(f'earth_region.jpg {region.size}')
    del region

# ---------- Blue Marble world ----------
if not os.path.exists(f'{OUT}/earth_world.jpg'):
    w = Image.open(f'{NE}/bm_world.jpg').convert('RGB').resize((4096, 2048), Image.LANCZOS)
    w.save(f'{OUT}/earth_world.jpg', quality=88, optimize=True)
    step('earth_world.jpg')

# ---------- GRAY relief -> bump + ocean mask (memmap, strip-wise: sandbox has 2 GB RAM) ----------
def bump_from_gray(a: np.ndarray, sigma_hp: float, gain: float) -> Image.Image:
    """R,G = horizontal gradients of high-passed relief (128 = flat), B = land mask (255 land)."""
    g = Image.fromarray(a)
    hp = a.astype(np.float32) - np.asarray(g.filter(ImageFilter.GaussianBlur(sigma_hp))).astype(np.float32)
    gy, gx = np.gradient(hp)  # rows (south+), cols (east+)
    del hp
    R = np.clip(128 + gx * gain, 0, 255).astype(np.uint8); del gx
    G = np.clip(128 - gy * gain, 0, 255).astype(np.uint8); del gy  # north-positive
    land = (a > 118).astype(np.uint8) * 255
    land = np.asarray(Image.fromarray(land).filter(ImageFilter.GaussianBlur(0.8)))
    return Image.merge('RGB', [Image.fromarray(R), Image.fromarray(G), Image.fromarray(land)])

if not (os.path.exists(f'{OUT}/bump_region.jpg') and os.path.exists(f'{OUT}/bump_world.jpg')):
    import tifffile
    if not os.path.exists(f'{NE}/gray.tif'):
        z = zipfile.ZipFile(f'{NE}/gray.zip'); tif = [n for n in z.namelist() if n.lower().endswith('.tif')][0]
        z.extract(tif, NE); os.rename(os.path.join(NE, tif), f'{NE}/gray.tif')
    g = tifffile.memmap(f'{NE}/gray.tif')  # (10800, 21600) uint8, read-only view on disk
    assert g.shape == (10800, 21600), g.shape
    if not os.path.exists(f'{OUT}/bump_region.jpg'):
        x0, y0, x1, y1 = (LON0 + 180) * 60, (90 - LAT1) * 60, (LON1 + 180) * 60, (90 - LAT0) * 60
        out = Image.new('RGB', (RW, RH))
        PAD, STEP = 24, 1020
        for ys in range(y0, y1, STEP):
            ye = min(y1, ys + STEP)
            a = np.ascontiguousarray(g[max(0, ys - PAD):min(10800, ye + PAD), x0:x1])
            b = bump_from_gray(a, 6, 7.0)
            top = ys - max(0, ys - PAD)
            out.paste(b.crop((0, top, RW, top + (ye - ys))), (0, ys - y0))
            del a, b
        out.save(f'{OUT}/bump_region.jpg', quality=90, subsampling=0)
        step('bump_region.jpg'); del out
    if not os.path.exists(f'{OUT}/bump_world.jpg'):
        # 21600x10800 -> 4096x2048 by strips (box filter 5.27x; use PIL on 1350-row strips)
        rows = []
        for ys in range(0, 10800, 1350):
            a = np.ascontiguousarray(g[ys:ys + 1350, :])
            rows.append(Image.fromarray(a).resize((4096, 256), Image.LANCZOS)); del a
        gw = Image.new('L', (4096, 2048))
        for i, r in enumerate(rows): gw.paste(r, (0, i * 256))
        bump_from_gray(np.asarray(gw), 3, 9.0).save(f'{OUT}/bump_world.jpg', quality=90, subsampling=0)
        step('bump_world.jpg')
    del g

# ---------- night lights ----------
if not os.path.exists(f'{OUT}/night_world.jpg') and os.path.exists(f'{NE}/night.jpg') and os.path.getsize(f'{NE}/night.jpg') > 100000:
    n = Image.open(f'{NE}/night.jpg'); n.draft('RGB', (3400, 1700)); n = n.convert('RGB').resize((2048, 1024), Image.LANCZOS)
    n.save(f'{OUT}/night_world.jpg', quality=85, optimize=True)
    step('night_world.jpg')
step('done')
