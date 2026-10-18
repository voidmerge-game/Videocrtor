import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
import {W, H} from '../theme';
import type {Cam} from './WorldMap';

/** Equirectangular earth texture, reprojected per-frame onto an orthographic globe (bilinear sampling). */

let TEX: {data: Uint8ClampedArray; w: number; h: number} | null = null;
let texPromise: Promise<void> | null = null;

const loadTex = () => {
  if (!texPromise) {
    texPromise = new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d', {willReadFrequently: true})!;
        ctx.drawImage(img, 0, 0);
        const id = ctx.getImageData(0, 0, c.width, c.height);
        TEX = {data: id.data, w: c.width, h: c.height};
        resolve();
      };
      img.onerror = reject;
      img.src = staticFile('data/earth_4k.jpg');
    });
  }
  return texPromise;
};

const renderGlobe = (out: Uint8ClampedArray, cam: Cam, w: number, h: number, res: number) => {
  const T = TEX!;
  const TW = T.w, TH = T.h, tex = T.data;
  const R = cam.scale * res, cx = (W / 2) * res, cy = (H / 2) * res;
  const lat0 = (cam.lat * Math.PI) / 180, l0 = (cam.lon * Math.PI) / 180;
  const sinP = Math.sin(lat0), cosP = Math.cos(lat0);
  const kx = TW / (2 * Math.PI), ky = TH / Math.PI;
  // limb darkening + soft edge
  for (let y = 0; y < h; y++) {
    const py = -(y - cy) / R;
    const o = y * w * 4;
    for (let x = 0; x < w; x++) {
      const px = (x - cx) / R;
      const r2 = px * px + py * py;
      const idx = o + x * 4;
      if (r2 > 1) { out[idx + 3] = 0; continue; }
      const rho = Math.sqrt(r2);
      const c = Math.asin(rho);
      const sc = Math.sin(c), cc = Math.cos(c);
      const lat = rho === 0 ? lat0 : Math.asin(cc * sinP + (py * sc * cosP) / rho);
      const lon = l0 + Math.atan2(px * sc, rho * cc * cosP - py * sc * sinP);
      let u = (lon + Math.PI) * kx;
      let v = (Math.PI / 2 - lat) * ky;
      u = ((u % TW) + TW) % TW;
      if (v < 0) v = 0; else if (v > TH - 1.001) v = TH - 1.001;
      const u0 = u | 0, v0 = v | 0, fu = u - u0, fv = v - v0, u1 = (u0 + 1) % TW, v1 = v0 + 1;
      const i00 = (v0 * TW + u0) * 4, i10 = (v0 * TW + u1) * 4, i01 = (v1 * TW + u0) * 4, i11 = (v1 * TW + u1) * 4;
      // lighting: light from upper-left, limb darkening
      const nz = cc; // cosine of angle from view axis
      const light = 0.78 + 0.32 * Math.max(0, -px * 0.45 + py * 0.35 + nz * 0.8) - 0.25 * Math.pow(rho, 6);
      for (let k = 0; k < 3; k++) {
        const s = (tex[i00 + k] * (1 - fu) + tex[i10 + k] * fu) * (1 - fv) + (tex[i01 + k] * (1 - fu) + tex[i11 + k] * fu) * fv;
        out[idx + k] = s * light;
      }
      out[idx + 3] = rho > 0.995 ? Math.max(0, 255 * (1 - rho) / 0.005) : 255;
    }
  }
};

export const RasterGlobe: React.FC<{cam: Cam; res?: number; opacity?: number}> = ({cam, res = 1, opacity = 1}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender('raster-globe'));
  const [ready, setReady] = useState(!!TEX);
  useEffect(() => {
    loadTex().then(() => { setReady(true); continueRender(handle); }).catch(() => continueRender(handle));
  }, [handle]);
  const w = Math.round(W * res), h = Math.round(H * res);
  useLayoutEffect(() => {
    if (!ready || !ref.current) return;
    const ctx = ref.current.getContext('2d')!;
    const id = ctx.createImageData(w, h);
    renderGlobe(id.data, cam, w, h, res);
    ctx.putImageData(id, 0, 0);
  }, [ready, cam.lon, cam.lat, cam.scale, w, h, res]);
  return (
    <canvas
      ref={ref}
      width={w}
      height={h}
      style={{position: 'absolute', left: 0, top: 0, width: W, height: H, opacity, imageRendering: 'auto'}}
    />
  );
};
