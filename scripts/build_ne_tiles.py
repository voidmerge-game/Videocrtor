#!/usr/bin/env python3
"""Cut Natural Earth hypsometric raster (+ NASA cloud wisps masked to the sea) into XYZ tiles
for the MapLibre style. All inputs are public domain.

  python3 scripts/build_ne_tiles.py --bbox -30 5 140 75 --zmin 3 --zmax 6 --out public/tiles

Outputs: {out}/hyp/{z}/{x}/{y}.jpg  (land colours; Natural Earth HYP_50M_SR)
         {out}/wisps/{z}/{x}/{y}.png (white cloud wisps with alpha, sea only)
"""
import argparse, io, json, math, os, sys, zipfile, urllib.request
import numpy as np
from PIL import Image, ImageDraw
Image.MAX_IMAGE_PIXELS = None

NE_HYP = 'https://naciscdn.org/naturalearth/50m/raster/HYP_50M_SR.zip'
CLOUDS = 'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_8192.tif'
CACHE = os.environ.get('NE_CACHE', '/var/tmp/ne_cache')


def fetch(url, name):
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, name)
    if not os.path.exists(p):
        print('download', url, file=sys.stderr)
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (map tiles builder)'})
        with urllib.request.urlopen(req) as r, open(p, 'wb') as f:
            while True:
                b = r.read(1 << 20)
                if not b:
                    break
                f.write(b)
    return p


def load_hyp():
    z = zipfile.ZipFile(fetch(NE_HYP, 'HYP_50M_SR.zip'))
    tif = [n for n in z.namelist() if n.lower().endswith('.tif')][0]
    im = Image.open(io.BytesIO(z.read(tif))).convert('RGB')
    return np.asarray(im)  # H x W x 3, equirectangular, lon -180..180, lat 90..-90


def load_clouds():
    im = Image.open(fetch(CLOUDS, 'cloud_combined_8192.tif')).convert('L')
    return np.asarray(im)


def ocean_mask(w, h, ocean_json):
    """1 = sea. Rasterize NE ocean polygon (outer rings white, holes black)."""
    fc = json.load(open(ocean_json))
    img = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(img)

    def px(ring):
        return [((lon + 180) / 360 * w, (90 - lat) / 180 * h) for lon, lat in ring]

    for f in fc['features']:
        g = f['geometry']
        polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
        for poly in polys:
            d.polygon(px(poly[0]), fill=255)
        for poly in polys:
            for hole in poly[1:]:
                d.polygon(px(hole), fill=0)
    return np.asarray(img) > 127


def tile_lonlat(z, x, y, n=256):
    """lon per column, lat per row for a 256px web-mercator tile."""
    s = 2 ** z
    lon = (x + (np.arange(n) + 0.5) / n) / s * 360 - 180
    yy = (y + (np.arange(n) + 0.5) / n) / s
    lat = np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * yy))))
    return lon, lat


def sample(src, lon, lat):
    h, w = src.shape[:2]
    cols = np.clip(((lon + 180) / 360 * w).astype(int), 0, w - 1)
    rows = np.clip(((90 - lat) / 180 * h).astype(int), 0, h - 1)
    return src[rows][:, cols]


def lat2y(lat, z):
    r = math.radians(lat)
    return int((1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * 2 ** z)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--bbox', nargs=4, type=float, default=[-30, 5, 140, 75])
    ap.add_argument('--zmin', type=int, default=3)
    ap.add_argument('--zmax', type=int, default=6)
    ap.add_argument('--out', default='public/tiles')
    ap.add_argument('--ocean', default='public/data/ne_10m_ocean.json')
    a = ap.parse_args()
    hyp = load_hyp()
    print('hyp', hyp.shape, file=sys.stderr)
    clouds = load_clouds()
    mask = ocean_mask(clouds.shape[1], clouds.shape[0], a.ocean)
    # wisps: soft white, stronger contrast, only on sea
    wisp = clouds.astype(np.float32)
    wisp = np.clip((wisp - 40) * 1.6, 0, 255)
    wisp = (wisp * mask).astype(np.uint8)
    print('clouds', clouds.shape, 'sea frac', mask.mean().round(3), file=sys.stderr)
    lon0, lat0, lon1, lat1 = a.bbox
    n = 0
    for z in range(a.zmin, a.zmax + 1):
        s = 2 ** z
        x0 = int((lon0 + 180) / 360 * s); x1 = int((lon1 + 180) / 360 * s)
        y0 = lat2y(lat1, z); y1 = lat2y(lat0, z)
        for x in range(x0, min(x1, s - 1) + 1):
            for y in range(y0, min(y1, s - 1) + 1):
                lon, lat = tile_lonlat(z, x, y)
                t = sample(hyp, lon, lat)
                d = os.path.join(a.out, 'hyp', str(z), str(x)); os.makedirs(d, exist_ok=True)
                Image.fromarray(t).save(os.path.join(d, f'{y}.jpg'), quality=86)
                wt = sample(wisp, lon, lat)
                if wt.max() > 0:
                    d = os.path.join(a.out, 'wisps', str(z), str(x)); os.makedirs(d, exist_ok=True)
                    rgba = np.dstack([np.full_like(wt, 255), np.full_like(wt, 255), np.full_like(wt, 255), wt])
                    Image.fromarray(rgba, 'RGBA').save(os.path.join(d, f'{y}.png'), optimize=True)
                n += 1
        print('z', z, 'done', n, file=sys.stderr)
    print('tiles', n)


if __name__ == '__main__':
    main()
