// dump polygons (lon/lat rings) for a dataset to /tmp for the python debug plot
import * as fs from 'fs';
import * as topojson from 'topojson-client';
for (const [file, obj] of [['africa_1880', 'w1880'], ['colonies_1914', 'w1914']] as const) {
  const topo = JSON.parse(fs.readFileSync(`public/data/${file}.json`, 'utf8'));
  const fc = (topojson.feature(topo, topo.objects[obj]) as any).features as any[];
  const out: any = {};
  for (const f of fc) { const n = f.properties?.NAME; if (!n) continue; const g = f.geometry; out[n] = g.type === 'Polygon' ? [g.coordinates[0]] : g.coordinates.map((p: any) => p[0]); }
  fs.writeFileSync(`/tmp/${file}_rings.json`, JSON.stringify(out));
}
