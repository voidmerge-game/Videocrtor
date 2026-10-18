import {CAM4, QUOTES} from '../src/events';
import {camAt} from '../src/lib/anim';
const fps = 30; const out: string[] = [];
for (let fr = 0; fr < 17329; fr += 2) {
  const t = fr / fps; const a = camAt(CAM4, t - 1 / fps), b = camAt(CAM4, t + 1 / fps), c = camAt(CAM4, t);
  const zr = Math.abs(Math.log(b.scale / a.scale)) / 2; const pan = (Math.hypot(b.lon - a.lon, b.lat - a.lat) / 2) * (c.scale / 57.3);
  const bl = Math.min(9, Math.max(0, zr * 110 + pan * 0.05 - 0.35));
  if (bl > 2) out.push(`${fr}:${bl.toFixed(1)}`);
}
console.log('blur frames', out.slice(0, 60).join(' '), '... total', out.length);
console.log('QUOTES', QUOTES.map((q) => `${q.t.toFixed(1)}-${q.until.toFixed(1)}`).join(' '));
