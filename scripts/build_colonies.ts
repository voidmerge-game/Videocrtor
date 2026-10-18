/** Build public/data/colonies_1914.json: 1914 colonial units made by merging modern (Natural Earth 50m) countries. */
import fs from 'fs';
import {feature, merge, mesh} from 'topojson-client';
import {topology} from 'topojson-server';
import {quantize} from 'topojson-client';

const topo = JSON.parse(fs.readFileSync('public/data/countries50.json', 'utf8'));
const obj = topo.objects.countries;
const byKey = (k: string) => obj.geometries.filter((g: any) => g.properties.name === (NAMES[k] ?? k));
const NAMES: Record<string, string> = {EG:'Egypt',SD:'Sudan',SS:'S. Sudan',KE:'Kenya',UG:'Uganda',NG:'Nigeria',GH:'Ghana',SL:'Sierra Leone',GM:'Gambia',ZA:'South Africa',LS:'Lesotho',SZ:'eSwatini',BW:'Botswana',ZW:'Zimbabwe',ZM:'Zambia',MW:'Malawi',MA:'Morocco',DZ:'Algeria',TN:'Tunisia',MR:'Mauritania',ML:'Mali',NE:'Niger',BF:'Burkina Faso',SN:'Senegal',GN:'Guinea',CI:"Côte d'Ivoire",BJ:'Benin',TD:'Chad',CF:'Central African Rep.',CG:'Congo',GA:'Gabon',MG:'Madagascar',DJ:'Djibouti',TG:'Togo',CM:'Cameroon',NA:'Namibia',TZ:'Tanzania',RW:'Rwanda',BI:'Burundi',CD:'Dem. Rep. Congo',AO:'Angola',MZ:'Mozambique',GW:'Guinea-Bissau',LY:'Libya',ER:'Eritrea',SO:'Somalia',EH:'W. Sahara',GQ:'Eq. Guinea',LR:'Liberia',ET:'Ethiopia'};

// NAME used by the film -> power -> list of modern countries (ISO_A2 or NE NAME)
const UNITS: [string, string, string[]][] = [
  ['Egypt', 'britain', ['EG']],
  ['Anglo-Egyptian Sudan', 'britain', ['SD', 'SS']],
  ['British East Africa', 'britain', ['KE']],
  ['Uganda', 'britain', ['UG']],
  ['British Somaliland', 'britain', ['Somaliland']],
  ['Nigeria', 'britain', ['NG']],
  ['Gold Coast', 'britain', ['GH']],
  ['Sierra Leone', 'britain', ['SL']],
  ['Gambia, The', 'britain', ['GM']],
  ['South Africa', 'britain', ['ZA']],
  ['Lesotho', 'britain', ['LS']],
  ['Swaziland', 'britain', ['SZ']],
  ['Botswana', 'britain', ['BW']],
  ['Rhodesia', 'britain', ['ZW', 'ZM']],
  ['Malawi', 'britain', ['MW']],
  ['Morocco', 'france', ['MA']],
  ['Algeria', 'france', ['DZ']],
  ['Tunisia', 'france', ['TN']],
  ['French West Africa', 'france', ['MR', 'ML', 'NE', 'BF', 'SN', 'GN', 'CI', 'BJ']],
  ['French Equatorial Africa', 'france', ['TD', 'CF', 'CG', 'GA']],
  ['Madagascar (France)', 'france', ['MG']],
  ['Djibouti', 'france', ['DJ']],
  ['Togoland', 'germany', ['TG']],
  ['Kamerun', 'germany', ['CM']],
  ['German South-West Africa', 'germany', ['NA']],
  ['German E. Africa (Tanganyika)', 'germany', ['TZ', 'RW', 'BI']],
  ['Belgian Congo', 'belgium', ['CD']],
  ['Angola', 'portugal', ['AO']],
  ['Mozambique', 'portugal', ['MZ']],
  ['Portuguese Guinea', 'portugal', ['GW']],
  ['Libya', 'italy', ['LY']],
  ['Eritrea', 'italy', ['ER']],
  ['Italian Somaliland', 'italy', ['SO']],
  ['Rio De Oro', 'spain', ['EH']],
  ['Equatorial Guinea', 'spain', ['GQ']],
  ['Liberia', 'independent', ['LR']],
  ['Abyssinia', 'independent', ['ET']],
];

const features: any[] = [];
for (const [name, power, keys] of UNITS) {
  const geoms = keys.flatMap(byKey);
  if (geoms.length !== keys.length) console.warn('missing for', name, keys, geoms.length);
  const g = merge(topo, geoms);
  features.push({type: 'Feature', properties: {NAME: name, SUBJECTO: power, PARTS: keys.join(',')}, geometry: g});
}
const fc = {type: 'FeatureCollection', features};
// re-topologize so shared borders stay shared, light simplification keeps file small
const t: any = topology({w1914: fc}, 1e5);
fs.writeFileSync('public/data/colonies_1914.json', JSON.stringify(t));
console.log('features', features.length, 'bytes', fs.statSync('public/data/colonies_1914.json').size);
