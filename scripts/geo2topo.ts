/** GeoJSON -> TopoJSON for the rebuilt 1880 layer: public/data/africa_1880.geojson -> africa_1880.json (object w1880) */
import fs from 'fs';
import {topology} from 'topojson-server';
const fc = JSON.parse(fs.readFileSync('public/data/africa_1880.geojson', 'utf8'));
const t: any = topology({w1880: fc}, 1e5);
fs.writeFileSync('public/data/africa_1880.json', JSON.stringify(t));
console.log('africa_1880.json', (fs.statSync('public/data/africa_1880.json').size / 1024).toFixed(0), 'KB,', fc.features.length, 'features');
