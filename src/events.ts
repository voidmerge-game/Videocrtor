/** All visual events of the film, anchored to narration words. Times in seconds (absolute). */
import {Power} from './theme';
import {T, E, P, SCENE_START, FIRST_VO, COLD_OPEN, END_VO, OUTRO} from './timeline';
import type {CamKey} from './lib/anim';

export type Pt = [number, number];

/* ---------------- ownership ---------------- */
export const OWNER_1880: Record<string, Power> = {
  'Algeria (FR)': 'france', 'Senegal (FR)': 'france', Congo: 'france',
  'Angola (Portugal)': 'portugal', Mozambique: 'portugal', 'Portuguese Guinea': 'portugal',
  'Gold Coast (GB)': 'britain', 'Cape Colony': 'britain', Natal: 'britain', Lagos: 'britain', 'Sierra Leone': 'britain',
  Gambia: 'britain', 'Griqualand West': 'britain', Basutoland: 'britain',
  'Spanish Guinea': 'spain', Egypt: 'ottoman', 'Ottoman Empire': 'ottoman', 'Harer (Egypt)': 'ottoman',
};
export const OWNER_1914: Record<string, Power> = {
  Malawi: 'britain', Botswana: 'britain', 'South Africa': 'britain', 'Anglo-Egyptian Sudan': 'britain', Egypt: 'britain',
  'Gold Coast': 'britain', Nigeria: 'britain', 'British East Africa': 'britain', 'British Somaliland': 'britain',
  Rhodesia: 'britain', 'Gambia, The': 'britain', 'Sierra Leone': 'britain', Uganda: 'britain', Swaziland: 'britain', Lesotho: 'britain',
  'Madagascar (France)': 'france', Djibouti: 'france', Algeria: 'france', 'French Equatorial Africa': 'france',
  'French West Africa': 'france', Tunisia: 'france', Morocco: 'france',
  Angola: 'portugal', Mozambique: 'portugal', 'Portuguese Guinea': 'portugal',
  Eritrea: 'italy', Libya: 'italy', 'Italian Somaliland': 'italy',
  'Spanish Sahara': 'spain', 'Spanish Morocco': 'spain', 'Rio De Oro': 'spain', 'Equatorial Guinea': 'spain',
  'Belgian Congo': 'belgium',
  'German South-West Africa': 'germany', Togoland: 'germany', Kamerun: 'germany', 'German E. Africa (Tanganyika)': 'germany',
  Liberia: 'independent', Abyssinia: 'independent',
};
export const AFRICA_1914 = new Set(Object.keys(OWNER_1914));

/* ---------------- acquisition times (1914 feature NAME -> when it is revealed) ---------------- */
export type Acq = {name: string; t: number; from?: Pt; dur?: number};
export const ACQ: Acq[] = [
  // Scene 3/4: the Congo
  {name: 'Belgian Congo', t: T('S4_02', 'Congo'), from: [15.3, -4.3], dur: 3.0},
  // Scene 5: the partition
  {name: 'Tunisia', t: T('S5_01', 'Tunisia')},
  {name: 'Egypt', t: T('S5_01', 'Egypt'), from: [32.3, 31.2], dur: 1.6},
  {name: 'German South-West Africa', t: T('S5_02', 'South')},
  {name: 'Togoland', t: T('S5_02', 'Togoland')},
  {name: 'Kamerun', t: T('S5_02', 'Kamerun')},
  {name: 'German E. Africa (Tanganyika)', t: T('S5_02', 'East'), from: [39.3, -6.8], dur: 1.6},
  {name: 'Nigeria', t: T('S5_03', 'Niger'), from: [3.4, 6.45], dur: 1.8},
  {name: 'Gold Coast', t: T('S5_03', 'Niger') + 0.6, from: [-1.5, 5.5]},
  {name: 'Sierra Leone', t: T('S5_03', 'Niger') + 0.9},
  {name: 'Gambia, The', t: T('S5_03', 'Niger') + 1.1},
  {name: 'Rhodesia', t: T('S5_03', 'Rhodes'), from: [25, -29], dur: 2.0},
  {name: 'Botswana', t: T('S5_03', 'Rhodes') + 0.3, from: [25, -29], dur: 1.5},
  {name: 'Malawi', t: T('S5_03', 'Rhodes') + 0.8},
  {name: 'South Africa', t: T('S5_03', 'Cape'), from: [18.4, -33.9], dur: 1.6},
  {name: 'Lesotho', t: T('S5_03', 'Cape') + 0.2},
  {name: 'Swaziland', t: T('S5_03', 'Cape') + 0.3},
  {name: 'British East Africa', t: T('S5_03', 'Cairo'), from: [39.66, -4.05], dur: 1.6},
  {name: 'Uganda', t: T('S5_03', 'Cairo') + 0.6, from: [39.66, -4.05], dur: 1.6},
  {name: 'British Somaliland', t: T('S5_03', 'Cairo') + 0.9},
  {name: 'French West Africa', t: T('S5_04', 'Senegal'), from: [-17.4, 14.7], dur: 5.0},
  {name: 'Algeria', t: T('S5_04', 'Algeria'), from: [3.05, 36.75], dur: 3.2},
  {name: 'French Equatorial Africa', t: T('S5_04', 'Congo'), from: [15.28, -4.27], dur: 2.4},
  {name: 'Madagascar (France)', t: T('S5_04', 'Congo') + 1.2, from: [49.3, -12.3], dur: 1.6},
  {name: 'Djibouti', t: T('S5_04', 'Congo') + 1.4},
  {name: 'Eritrea', t: T('S5_06', 'Eritrea'), from: [39.45, 15.6]},
  {name: 'Italian Somaliland', t: T('S5_06', 'Somalia'), from: [45.3, 2.05], dur: 1.6},
  {name: 'Angola', t: T('S5_06', 'Portugal'), from: [13.2, -8.8], dur: 1.8},
  {name: 'Mozambique', t: T('S5_06', 'Portugal') + 0.3, from: [35.5, -19.8], dur: 1.8},
  {name: 'Portuguese Guinea', t: T('S5_06', 'Portugal') + 0.5},
  {name: 'Spanish Sahara', t: T('S5_06', 'Sahara'), from: [-13.2, 27.1]},
  {name: 'Rio De Oro', t: T('S5_06', 'Sahara') + 0.2},
  {name: 'Equatorial Guinea', t: T('S5_06', 'Sahara') + 0.4},
  // Scene 6: Sudan after Omdurman
  {name: 'Anglo-Egyptian Sudan', t: T('S6_03', 'Omdurman'), from: [32.5, 15.6], dur: 2.2},
  // Scene 8: last pieces
  {name: 'Morocco', t: T('S8_02', 'Morocco'), from: [-5.0, 34.0], dur: 1.8},
  {name: 'Spanish Morocco', t: T('S8_02', 'Morocco') + 0.4},
  {name: 'Libya', t: T('S8_02', 'Libya'), from: [13.2, 32.9], dur: 1.8},
];
export const acqOf = (name: string) => ACQ.find((a) => a.name === name);

/* ---------------- flags ---------------- */
export type FlagEv = {lon: number; lat: number; power: Power; t: number; label?: string; w?: number; until?: number};
const U1 = E('S1_03') + 0.6, U3 = E('S3_03') + 0.6, U5 = E('S5_07') + 2.2, U6 = E('S6_03') + 1.2, U8 = T('S8_03', 'borders') + 1.0;
export const FLAGS_RAW: FlagEv[] = [
  // Scene 1 — enclaves of 1870
  {lon: 3.0, lat: 35.0, power: 'france', t: T('S1_02', 'Algeria'), label: 'ALGERIA'},
  {lon: -16.5, lat: 15.5, power: 'france', t: T('S1_02', 'coastal') + 0.2, label: 'SENEGAL'},
  {lon: 13.3, lat: -9.5, power: 'portugal', t: T('S1_02', 'Angola'), label: 'ANGOLA'},
  {lon: 36.5, lat: -18.5, power: 'portugal', t: T('S1_02', 'Mozambique'), label: 'MOZAMBIQUE'},
  {lon: 22.5, lat: -32.0, power: 'britain', t: T('S1_02', 'Cape'), label: 'CAPE COLONY'},
  {lon: -1.5, lat: 5.6, power: 'britain', t: T('S1_02', 'coastal') + 0.6, label: 'GOLD COAST'},
  // Scene 3 — the Congo rivals
  {lon: 15.28, lat: -3.6, power: 'france', t: T('S3_03', 'France'), label: 'BRAZZAVILLE'},
  {lon: 12.8, lat: -6.4, power: 'portugal', t: T('S3_03', 'Portugal'), label: 'CABINDA'},
  // Scene 4
  {lon: 23.0, lat: -3.0, power: 'belgium', t: T('S4_02', 'Leopold'), label: 'CONGO FREE STATE', w: 70},
  // Scene 5
  {lon: 10.2, lat: 33.0, power: 'france', t: T('S5_01', 'Tunisia'), label: 'TUNISIA'},
  {lon: 31.8, lat: 29.6, power: 'britain', t: T('S5_01', 'Egypt'), label: 'EGYPT'},
  {lon: 16.3, lat: -24.8, power: 'germany', t: T('S5_02', 'South'), label: 'SOUTH-WEST AFRICA'},
  {lon: 0.9, lat: 8.5, power: 'germany', t: T('S5_02', 'Togoland'), label: 'TOGOLAND'},
  {lon: 14.6, lat: 3.6, power: 'germany', t: T('S5_02', 'Kamerun'), label: 'KAMERUN'},
  {lon: 37.2, lat: -4.3, power: 'germany', t: T('S5_02', 'East'), label: 'EAST AFRICA'},
  {lon: 9.8, lat: 7.6, power: 'britain', t: T('S5_03', 'Niger'), label: 'NIGERIA'},
  {lon: 30.2, lat: -15.6, power: 'britain', t: T('S5_03', 'Rhodes'), label: 'RHODESIA'},
  {lon: 37.5, lat: 1.0, power: 'britain', t: T('S5_03', 'Cairo'), label: 'BRITISH EAST AFRICA'},
  {lon: -6.5, lat: 12.0, power: 'france', t: T('S5_04', 'Senegal') + 1.5, label: 'FRENCH WEST AFRICA', w: 70},
  {lon: 18.0, lat: 3.0, power: 'france', t: T('S5_04', 'Congo'), label: 'FRENCH EQUATORIAL AFRICA'},
  {lon: 46.8, lat: -19.5, power: 'france', t: T('S5_04', 'Congo') + 1.4, label: 'MADAGASCAR'},
  {lon: 40.2, lat: 16.3, power: 'italy', t: T('S5_06', 'Eritrea'), label: 'ERITREA'},
  {lon: 48.2, lat: 7.6, power: 'italy', t: T('S5_06', 'Somalia'), label: 'SOMALILAND'},
  {lon: 15.3, lat: -10.3, power: 'portugal', t: T('S5_06', 'Portugal'), label: 'ANGOLA'},
  {lon: 38.6, lat: -14.4, power: 'portugal', t: T('S5_06', 'Portugal') + 0.4, label: 'MOZAMBIQUE'},
  {lon: -14.6, lat: 22.4, power: 'spain', t: T('S5_06', 'Sahara'), label: 'RÍO DE ORO'},
  // Scene 6
  {lon: 32.8, lat: 12.6, power: 'britain', t: T('S6_03', 'Omdurman') + 0.8, label: 'ANGLO-EGYPTIAN SUDAN'},
  // Scene 8
  {lon: -7.8, lat: 29.8, power: 'france', t: T('S8_02', 'Morocco'), label: 'MOROCCO'},
  {lon: 15.5, lat: 30.3, power: 'italy', t: T('S8_02', 'Libya'), label: 'LIBYA'},
];
export const FLAGS: FlagEv[] = FLAGS_RAW.map((f0) => {
  // v4: big printed names replace the flag labels after scene 3 (reference style: flags carry no text)
  const f = f0.t >= T('S4_01') ? {...f0, label: undefined} : f0;
  if (f.until) return f;
  const u = f.t < T('S2_01') ? U1 : f.t < T('S4_01') ? U3 : f.t < T('S6_01') ? U5 : f.t < T('S7_01') ? U6 : U8;
  return {...f, until: u};
});

/* ---------------- labels ---------------- */
export type LabelEv = {lon: number; lat: number; text: string; t: number; until?: number; kind?: 'city' | 'region' | 'sea'; size?: number};
const S1 = T('S1_01'), S1e = E('S1_03') + 1;
export const LABELS: LabelEv[] = [
  {lon: 5.5, lat: 13.0, text: 'Sokoto Caliphate', t: T('S1_01', 'Sokoto'), until: S1e, kind: 'region', size: 30},
  {lon: 31.0, lat: -28.0, text: 'Zulu Kingdom', t: T('S1_01', 'Zulu'), until: S1e, kind: 'region', size: 26},
  {lon: -1.3, lat: 7.0, text: 'Asante', t: T('S1_01', 'Asante'), until: S1e, kind: 'region', size: 24},
  {lon: 38.5, lat: 10.5, text: 'Ethiopia', t: T('S1_01', 'Ethiopians'), until: S1e, kind: 'region', size: 28},
  {lon: 32.0, lat: 0.3, text: 'Buganda', t: T('S1_01', 'Ethiopians') + 1.0, until: S1e, kind: 'region', size: 22},
  {lon: 23.0, lat: 3.0, text: 'Congo Basin', t: T('S1_03', 'blank'), until: S1e, kind: 'sea', size: 28},
  {lon: 2.0, lat: 23.0, text: 'Sahara', t: T('S1_03', 'blank') + 0.5, until: S1e, kind: 'sea', size: 34},
  // Scene 2
  {lon: 32.55, lat: 30.3, text: 'Suez Canal', t: T('S2_01', 'Suez'), until: E('S2_01') + 1, kind: 'city', size: 26},
  {lon: -0.1, lat: 51.5, text: 'London', t: T('S2_03', 'Britain'), until: E('S2_03') + 1},
  {lon: 2.35, lat: 48.85, text: 'Paris', t: T('S2_03', 'France'), until: E('S2_03') + 1},
  {lon: 13.4, lat: 52.5, text: 'Berlin', t: T('S2_03', 'Germany'), until: E('S2_03') + 1},
  // Scene 3
  {lon: 4.35, lat: 50.85, text: 'Brussels', t: T('S3_01', 'Belgians'), until: E('S3_01') + 0.5},
  {lon: 17.2, lat: -5.6, text: 'Léopoldville', t: T('S3_02', 'stations'), until: E('S3_03') + 1},
  {lon: 25.2, lat: 0.9, text: 'Stanley Falls', t: T('S3_02', 'stations') + 0.8, until: E('S3_03') + 1},
  {lon: 13.05, lat: -5.4, text: 'Boma', t: T('S3_02', 'Congo'), until: E('S3_03') + 1},
  {lon: 20.0, lat: -1.2, text: 'Congo River', t: T('S3_02', 'Congo'), until: E('S3_03') + 1, kind: 'sea', size: 24},
  // Scene 4
  {lon: 13.4, lat: 52.5, text: 'Berlin', t: T('S4_01', 'Berlin'), until: E('S4_01') + 0.5},
  // Scene 5
  {lon: 31.2, lat: 30.05, text: 'Cairo', t: T('S5_03', 'Cairo'), until: E('S5_03') + 1},
  {lon: 18.4, lat: -33.9, text: 'Cape Town', t: T('S5_03', 'Cape'), until: E('S5_03') + 1},
  {lon: -17.4, lat: 14.7, text: 'Dakar', t: T('S5_04', 'Senegal'), until: E('S5_04') + 1},
  {lon: 5.33, lat: 31.95, text: 'Ouargla', t: T('S5_04', 'oases'), until: E('S5_04') + 1},
  {lon: -3.0, lat: 16.77, text: 'Timbuktu', t: T('S5_04', 'desert'), until: E('S5_04') + 1},
  {lon: 32.1, lat: 9.9, text: 'Fashoda', t: T('S5_05', 'Fashoda'), until: E('S5_05') + 1},
  {lon: 32.5, lat: 10.5, text: 'Upper Nile', t: T('S5_05', 'Nile'), until: E('S5_05') + 1, kind: 'sea', size: 22},
  // Scene 6
  {lon: 30.65, lat: -28.35, text: 'Isandlwana', t: T('S6_01', 'Isandlwana'), until: E('S6_01') + 1},
  {lon: -7.5, lat: 10.0, text: 'Wassoulou Empire of Samori Touré', t: T('S6_02', 'Samori'), until: E('S6_02') + 1, kind: 'region', size: 22},
  {lon: 32.5, lat: 15.6, text: 'Khartoum', t: T('S6_03', 'Khartoum'), until: E('S6_03') + 1},
  {lon: 32.48, lat: 16.3, text: 'Omdurman', t: T('S6_03', 'Omdurman'), until: E('S6_03') + 1},
  {lon: 38.9, lat: 14.17, text: 'Adwa', t: T('S6_04', 'Adwa'), until: E('S6_04') + 1},
  {lon: 39.0, lat: 8.0, text: 'Ethiopia', t: T('S6_04', 'Ethiopia', 2), until: E('S6_04') + 1, kind: 'region', size: 30},
  {lon: -9.5, lat: 6.6, text: 'Liberia', t: T('S6_04', 'Liberia'), until: E('S6_04') + 1, kind: 'region', size: 24},
  // Scene 7
  {lon: 23.0, lat: -3.0, text: 'Congo Free State', t: T('S7_01', 'Congo'), until: E('S7_02') + 1, kind: 'region', size: 28},
  {lon: 17.5, lat: -21.5, text: 'German South-West Africa', t: T('S7_03', 'German'), until: E('S7_03') + 1, kind: 'region', size: 24},
  {lon: 26.2, lat: -29.1, text: 'Bloemfontein', t: T('S7_04', 'Boer'), until: E('S7_04') + 1},
  {lon: 28.2, lat: -25.75, text: 'Pretoria', t: T('S7_04', 'Boer') + 0.4, until: E('S7_04') + 1},
  // Scene 8
  {lon: -9.6, lat: 30.42, text: 'Agadir', t: T('S8_01', 'Agadir'), until: E('S8_01') + 1},
  {lon: -5.0, lat: 34.03, text: 'Fez', t: T('S8_02', 'Morocco'), until: E('S8_02') + 1},
];

/* ---------------- captions (lower third) ---------------- */
export type CapEv = {text: string; sub?: string; t: number; until: number};
export const CAPTIONS: CapEv[] = [
  {text: 'Africa in 1870', sub: 'European control: about 10% of the land', t: T('S1_02', 'Europeans'), until: E('S1_02') + 0.5},
  {text: 'Stanley on the Congo', sub: 'Expeditions for Leopold, 1879–1884', t: T('S3_02', 'Stanley'), until: E('S3_02')},
  {text: 'Berlin Conference', sub: '15 November 1884 – 26 February 1885', t: T('S4_01', 'Berlin'), until: E('S4_02')},
  {text: '“Effective Occupation”', sub: 'A claim counts only if the territory is physically held', t: T('S4_03'), until: E('S4_03')},
  {text: 'The Partition of Africa', sub: '1881 – 1900', t: T('S5_01', 'Watch'), until: E('S5_02')},
  {text: 'Fashoda Incident', sub: 'September – November 1898', t: T('S5_05', 'Fashoda'), until: E('S5_05')},
  {text: 'Battle of Isandlwana', sub: '22 January 1879', t: T('S6_01', 'Isandlwana'), until: E('S6_01')},
  {text: 'Battle of Omdurman', sub: '2 September 1898', t: T('S6_03', 'Omdurman'), until: E('S6_03')},
  {text: 'Battle of Adwa', sub: '1 March 1896', t: T('S6_04', 'Adwa'), until: E('S6_04')},
  {text: 'Congo Free State', sub: '1885 – 1908', t: T('S7_01', 'Congo'), until: E('S7_02')},
  {text: 'Herero and Nama Genocide', sub: '1904 – 1908', t: T('S7_03', 'Herero'), until: E('S7_03')},
  {text: 'Second Boer War', sub: '1899 – 1902', t: T('S7_04', 'Boer'), until: E('S7_04')},
  {text: 'Agadir Crisis', sub: 'July – November 1911', t: T('S8_01', 'Agadir'), until: E('S8_01')},
  {text: 'Africa in 1914', sub: 'Seven European powers · Two independent states', t: T('S8_02', 'By'), until: E('S8_02')},
];

/* ---------------- archive frames ---------------- */
export type ArcEv = {src: string; caption: string; t: number; until: number; x?: number; y?: number; w?: number; h?: number; from?: 'left' | 'right' | 'bottom'; sepia?: number; wall?: boolean; sign?: string};
const R = {x: 1110, y: 140, w: 720, h: 560}; // right-side slot
const Lf = {x: 90, y: 140, w: 720, h: 560}; // left-side slot
const Pt_ = {x: 1210, y: 120, w: 560, h: 700}; // portrait slot
export const ARCHIVE: ArcEv[] = [
  {src: 'archive/livingstone.jpg', caption: 'David Livingstone, 1813–1873', t: T('S1_03', 'Livingstone'), until: E('S1_03'), ...Pt_, from: 'right'},
  {src: 'archive/suez.jpg', caption: 'Opening of the Suez Canal, 17 November 1869', t: T('S2_01', 'Suez') - 0.3, until: E('S2_01') + 0.5, ...R, from: 'right'},
  {src: 'archive/maxim.jpg', caption: 'The Maxim gun, 1884', t: T('S2_02', 'Maxim'), until: E('S2_02') + 0.3, ...Lf, from: 'left'},
  {src: 'archive/leopold.jpg', caption: 'Leopold II, King of the Belgians', t: T('S3_01', 'Leopold'), until: E('S3_01') + 0.5, ...Pt_, from: 'right'},
  {src: 'archive/stanley.jpg', caption: 'Henry Morton Stanley', t: T('S3_02', 'Stanley'), until: T('S3_02', 'treaties'), ...Pt_, from: 'right'},
  {src: 'archive/berlin_conf.jpg', caption: 'The Berlin Conference, 1884', t: T('S4_01', 'Berlin'), until: E('S4_01') + 0.6, ...R, from: 'right', x: 1040, w: 800, h: 600},
  {src: 'archive/bismarck.jpg', caption: 'Otto von Bismarck', t: T('S4_01', 'Bismarck') - 0.2, until: T('S4_01', 'Berlin') - 0.1, ...Pt_, from: 'right'},
  {src: 'archive/rhodes_colossus.jpg', caption: '“The Rhodes Colossus”, Punch, 1892', t: T('S5_03', 'Rhodes'), until: E('S5_03') + 0.5, ...Pt_, from: 'right', x: 1270, w: 520, h: 680},
  {src: 'archive/marchand.jpg', caption: 'The Marchand mission, 1898', t: T('S5_05', 'expedition'), until: T('S5_05', 'Paris'), ...Lf, from: 'left', y: 120, w: 760, h: 540},
  {src: 'archive/isandlwana.jpg', caption: 'The Battle of Isandlwana — C. E. Fripp', t: T('S6_01', 'Zulu'), until: E('S6_01') + 0.5, ...Lf, from: 'left', w: 780, h: 500},
  {src: 'archive/omdurman.jpg', caption: 'Omdurman, 1898 — R. Caton Woodville', t: T('S6_03', 'Kitchener'), until: E('S6_03') + 0.3, ...Lf, from: 'left', w: 560, h: 560},
  {src: 'archive/menelik.jpg', caption: 'Emperor Menelik II of Ethiopia', t: T('S6_04', 'Menelik'), until: E('S6_04') + 0.5, x: 90, y: 140, w: 470, h: 560, from: 'left'},
  {src: 'archive/nsala.jpg', caption: 'Nsala of Wala, Congo Free State, 1904 — A. S. Harris', t: T('S7_01', 'quotas'), until: E('S7_01') + 0.5, ...R, from: 'right', w: 780, h: 480, wall: true},
  {src: 'archive/morel.jpg', caption: 'E. D. Morel, Congo Reform Association', t: T('S7_02', 'Morel'), until: E('S7_02') + 0.3, ...Pt_, from: 'right', w: 560, h: 520, wall: true},
  {src: 'archive/herero.jpg', caption: 'Herero prisoners, c. 1904', t: T('S7_03', 'Herero'), until: E('S7_03') + 0.3, ...Lf, from: 'left', w: 600, h: 450, wall: true, sign: 'DEUTSCH-SÜDWESTAFRIKA'},
  {src: 'archive/boer_camp.jpg', caption: 'Bloemfontein concentration camp, c. 1901', t: T('S7_04', 'Boer'), until: E('S7_04') + 0.3, ...R, from: 'right', wall: true, sign: 'ORANGE RIVER COLONY'},
  {src: 'archive/panther.jpg', caption: 'SMS Panther', t: T('S8_01', 'gunboat'), until: T('S8_01', 'Twice', 2) + 1.5, ...R, from: 'right'},
];

/* ---------------- quote cards ---------------- */
export type QuoteEv = {text: string; author: string; source: string; t: number; until: number};
export const QUOTES: QuoteEv[] = [
  {
    text: '“We have been engaged in drawing lines upon maps where no white man’s feet have ever trod; we have been giving away mountains and rivers and lakes to each other, only hindered by the small impediment that we never knew exactly where the mountains and rivers and lakes were.”',
    author: 'Lord Salisbury, British Prime Minister', source: 'Speech, London, 1890', t: 0, until: COLD_OPEN.quote,
  },
  {text: '“I do not want to miss a good chance of getting us a slice of this magnificent African cake.”', author: 'Leopold II, King of the Belgians', source: 'Letter, 1877', t: E('S3_01') + 0.6, until: P('S3_02').start - 0.3},
  {text: '“My map of Africa lies in Europe.”', author: 'Otto von Bismarck', source: 'To the explorer Eugen Wolf, December 1888', t: E('S4_03') + 0.6, until: P('S5_01').start - 0.3},
  {text: '“Ethiopia has need of no one; she stretches out her hands unto God.”', author: 'Emperor Menelik II', source: 'Circular letter to the European powers, April 1891', t: E('S6_04') + 0.6, until: P('S7_01').start - 0.3},
  {text: 'The Scramble for Africa lasted thirty years.\nIts map has lasted a hundred and forty.', author: '', source: '', t: END_VO + 1.5, until: END_VO + 1.5 + OUTRO.card},
];

/* ---------------- year badge ---------------- */
export const YEARS: [number, string][] = [
  [FIRST_VO, '1870'], [T('S2_01'), '1869'], [T('S2_02', 'Maxim'), '1884'], [T('S3_01'), '1876'], [T('S3_02', 'Stanley'), '1879'],
  [T('S4_01'), '1884'], [T('S4_02'), '1885'], [T('S5_01', 'Tunisia'), '1881'], [T('S5_01', 'Egypt'), '1882'], [T('S5_02'), '1884'],
  [T('S5_03', 'Niger'), '1886'], [T('S5_03', 'Rhodes'), '1889'], [T('S5_04', 'Senegal'), '1890'], [T('S5_04', 'desert'), '1894'],
  [T('S5_05', 'Fashoda'), '1898'], [T('S5_06'), '1896'], [T('S5_07'), '1900'], [T('S6_01', '1879'), '1879'], [T('S6_02'), '1882'],
  [T('S6_03', 'Khartoum'), '1885'], [T('S6_03', 'Omdurman'), '1898'], [T('S6_04', 'Adwa'), '1896'], [T('S7_01'), '1890s'], [T('S7_02', 'Belgium'), '1908'],
  [T('S7_03', 'Herero'), '1904'], [T('S7_04', 'Boer'), '1901'], [T('S8_01', 'Agadir'), '1911'], [T('S8_02', 'By'), '1914'], [T('S8_03', 'Then'), 'TODAY'],
  [T('S8_04', '1964'), '1964'], [T('S8_05'), '1914'],
];
export const yearAt = (t: number) => {
  let y = '1870';
  for (const [tt, yy] of YEARS) if (t >= tt) y = yy;
  return y;
};

/* ---------------- legend chips (power introduced) ---------------- */
export const CHIPS: {power: Power; t: number}[] = [
  {power: 'belgium', t: T('S4_02', 'Leopold')},
  {power: 'france', t: T('S5_01', 'Tunisia')},
  {power: 'britain', t: T('S5_01', 'Egypt')},
  {power: 'germany', t: T('S5_02', 'South')},
  {power: 'italy', t: T('S5_06', 'Eritrea')},
  {power: 'portugal', t: T('S5_06', 'Portugal')},
  {power: 'spain', t: T('S5_06', 'Sahara')},
];
export const CHIPS_UNTIL = E('S5_07') + 1.0;

/* ---------------- camera ---------------- */
const AFR: Pt = [18, 3];
export const CAM: CamKey[] = [
  {t: 0, lon: -28, lat: 12, scale: 440},
  {t: COLD_OPEN.quote, lon: -28, lat: 12, scale: 440},
  {t: COLD_OPEN.quote + 1, lon: -22, lat: 12, scale: 470},
  {t: FIRST_VO + 2, lon: 16, lat: 4, scale: 900}, // whole Africa
  {t: T('S1_01', 'Zulu'), lon: 18, lat: 0, scale: 950},
  {t: T('S1_03'), lon: 16, lat: 6, scale: 880},
  // Scene 2 — Europe & Suez
  {t: T('S2_01'), lon: 22, lat: 32, scale: 900},
  {t: T('S2_01', 'Suez'), lon: 28, lat: 30, scale: 1100},
  {t: T('S2_02'), lon: 24, lat: 30, scale: 1000},
  {t: T('S2_03', 'Second'), lon: 10, lat: 38, scale: 900},
  {t: T('S2_03', 'Germany'), lon: 8, lat: 44, scale: 1000},
  // Scene 3 — Congo
  {t: T('S3_01'), lon: 6, lat: 30, scale: 800},
  {t: T('S3_01', 'Belgians'), lon: 6, lat: 40, scale: 900},
  {t: T('S3_02'), lon: 20, lat: -3, scale: 1400},
  {t: T('S3_02', 'Congo'), lon: 19, lat: -2, scale: 1700},
  {t: T('S3_03'), lon: 17, lat: -3, scale: 1700},
  {t: E('S3_03'), lon: 18, lat: 2, scale: 1200},
  // Scene 4 — Berlin
  {t: T('S4_01'), lon: 12, lat: 46, scale: 1000},
  {t: T('S4_01', 'Berlin'), lon: 13, lat: 50, scale: 1300},
  {t: T('S4_02'), lon: 18, lat: 2, scale: 950},
  {t: T('S4_02', 'Congo'), lon: 21, lat: -2, scale: 1200},
  {t: T('S4_03'), lon: 17, lat: 4, scale: 900},
  // Scene 5 — partition
  {t: T('S5_01'), lon: 17, lat: 10, scale: 950},
  {t: T('S5_01', 'Tunisia'), lon: 14, lat: 26, scale: 1200},
  {t: T('S5_01', 'Egypt'), lon: 24, lat: 26, scale: 1200},
  {t: T('S5_02'), lon: 18, lat: 0, scale: 950},
  {t: T('S5_03'), lon: 20, lat: -6, scale: 1000},
  {t: T('S5_03', 'Rhodes'), lon: 25, lat: -18, scale: 1200},
  {t: T('S5_03', 'Cairo'), lon: 27, lat: -5, scale: 900},
  {t: T('S5_04'), lon: -2, lat: 18, scale: 1250},
  {t: T('S5_04', 'oases'), lon: 2, lat: 24, scale: 1400},
  {t: T('S5_04', 'desert'), lon: 2, lat: 16, scale: 1200},
  {t: T('S5_05'), lon: 12, lat: 12, scale: 950},
  {t: T('S5_05', 'Fashoda'), lon: 30, lat: 10, scale: 1600},
  {t: T('S5_05', 'Paris'), lon: 26, lat: 12, scale: 1250},
  {t: T('S5_06'), lon: 30, lat: 4, scale: 950},
  {t: T('S5_06', 'Portugal'), lon: 24, lat: -12, scale: 1000},
  {t: T('S5_06', 'Sahara'), lon: 5, lat: 10, scale: 950},
  {t: T('S5_07'), lon: 18, lat: 3, scale: 860},
  {t: E('S5_07'), lon: 18, lat: 3, scale: 820},
  // Scene 6 — resistance
  {t: T('S6_01'), lon: 25, lat: -12, scale: 950},
  {t: T('S6_01', 'Isandlwana'), lon: 30, lat: -27, scale: 1700},
  {t: T('S6_02'), lon: 0, lat: 8, scale: 1200},
  {t: T('S6_02', 'Samori'), lon: -5, lat: 10, scale: 1600},
  {t: T('S6_03'), lon: 28, lat: 16, scale: 1200},
  {t: T('S6_03', 'Khartoum'), lon: 32, lat: 15, scale: 1700},
  {t: T('S6_04'), lon: 30, lat: 10, scale: 1200},
  {t: T('S6_04', 'Adwa'), lon: 32.5, lat: 15.5, scale: 1600},
  {t: T('S6_04', 'Ethiopia', 2), lon: 33, lat: 13.5, scale: 1500},
  {t: T('S6_04', 'Liberia'), lon: 18, lat: 6, scale: 900},
  // Scene 7 — the price
  {t: T('S7_01'), lon: 30, lat: -2, scale: 1100},
  {t: T('S7_01', 'Congo'), lon: 31, lat: -3, scale: 1300},
  {t: T('S7_03'), lon: 8, lat: -18, scale: 1200},
  {t: T('S7_03', 'Herero'), lon: 3, lat: -22, scale: 1400},
  {t: E('S7_03') - 0.5, lon: 4, lat: -22.5, scale: 1420},
  {t: T('S7_04'), lon: 24, lat: -26, scale: 1300},
  {t: T('S7_04', 'Boer'), lon: 26, lat: -28, scale: 1500},
  // Scene 8 — 1914 and today
  {t: T('S8_01'), lon: 0, lat: 28, scale: 1000},
  {t: T('S8_01', 'Agadir'), lon: -6, lat: 31, scale: 1400},
  {t: T('S8_02'), lon: 8, lat: 20, scale: 1000},
  {t: T('S8_02', 'seven'), lon: 18, lat: 3, scale: 860},
  {t: T('S8_03'), lon: 18, lat: 3, scale: 860},
  {t: T('S8_04'), lon: 20, lat: 2, scale: 900},
  {t: T('S8_05'), lon: 18, lat: 3, scale: 820},
  {t: END_VO + 1.5, lon: 14, lat: 8, scale: 560},
  {t: END_VO + 1.5 + OUTRO.card, lon: 0, lat: 12, scale: 440},
  {t: END_VO + 1.5 + OUTRO.card + OUTRO.credits, lon: -20, lat: 14, scale: 420},
];

/* ---------------- SFX ---------------- */
export type Sfx = {src: string; t: number; vol?: number};
export const SFX: Sfx[] = [
  {src: 'audio/sfx/drone.wav', t: 0.2, vol: 0.5},
  {src: 'audio/sfx/whoosh.wav', t: COLD_OPEN.quote - 0.3, vol: 0.5},
  {src: 'audio/sfx/hit.wav', t: COLD_OPEN.quote + 1.2, vol: 0.6},
  ...FLAGS.map((f) => ({src: 'audio/sfx/thud.wav', t: f.t + 0.12, vol: 0.35})),
  ...QUOTES.slice(1).map((q) => ({src: 'audio/sfx/drone.wav', t: q.t, vol: 0.35})),
  {src: 'audio/sfx/hit.wav', t: T('S6_04', 'destroys'), vol: 0.5},
  {src: 'audio/sfx/hit.wav', t: T('S5_07', '90'), vol: 0.45},
  {src: 'audio/sfx/hit.wav', t: END_VO + 1.5, vol: 0.6},
  {src: 'audio/sfx/whoosh.wav', t: T('S8_03', 'Then'), vol: 0.4},
];

/* ---------------- music ---------------- */
export type Music = {src: string; t: number; until: number; gain: number; fadeIn?: number; fadeOut?: number; offset?: number};
export const MUSIC: Music[] = [
  {src: 'audio/music/Virtutes_Instrumenti.mp3', t: COLD_OPEN.quote - 1.0, until: E('S1_03') + 2, gain: 0.55, fadeIn: 2, fadeOut: 4},
  {src: 'audio/music/Lightless_Dawn.mp3', t: T('S2_01') - 1, until: E('S4_03') + 1, gain: 0.5, fadeIn: 4, fadeOut: 4},
  {src: 'audio/music/Impact_Lento.mp3', t: P('S5_01').start - 6, until: E('S5_07') + 2, gain: 0.55, fadeIn: 3, fadeOut: 4},
  {src: 'audio/music/Long_Note_Two.mp3', t: T('S6_01') - 1, until: E('S6_04') + 7, gain: 0.5, fadeIn: 3, fadeOut: 4},
  {src: 'audio/music/Dark_Times.mp3', t: T('S7_01') - 1, until: E('S7_04') + 1, gain: 0.45, fadeIn: 4, fadeOut: 4},
  {src: 'audio/music/Private_Reflection.mp3', t: T('S8_01') - 1, until: END_VO + 1.5 + OUTRO.card + 2, gain: 0.6, fadeIn: 4, fadeOut: 4},
  {src: 'audio/music/Virtutes_Instrumenti.mp3', t: END_VO + 1.5 + OUTRO.card, until: END_VO + 1.5 + OUTRO.card + OUTRO.credits + 0.5, gain: 0.5, fadeIn: 2, fadeOut: 3, offset: 0},
];

export const SCENES_FOR_DEBUG = {SCENE_START};

/* =====================================================================================
   v3 motion graphics — closer camera, big spaced labels, cities, callouts, route arrows
   ===================================================================================== */

// push the camera in: regional shots become close-ups, overviews a little tighter
const ZOOM = (k: CamKey): CamKey => {
  const s = k.scale;
  const f = s < 500 ? 1 : s <= 900 ? 1.18 : s <= 1000 ? 1.3 : s <= 1300 ? 1.5 : 1.55;
  return {...k, scale: Math.round(s * f)};
};
export const CAM3: CamKey[] = CAM.map(ZOOM);

export type BigEv = {lon: number; lat: number; text: string; t: number; until?: number; size?: number; rot?: number; minScale?: number};
const S5e = E('S5_07') + 1.0; // partition labels stay until the 1900 summary ends
const S8a = T('S8_02', 'By'), S8b = T('S8_03', 'borders') + 1.5;
const both = (lon: number, lat: number, text: string, t: number, size = 40, rot = 0): BigEv[] => [
  {lon, lat, text, t: t + 0.6, until: S5e, size, rot},
  {lon, lat, text, t: S8a, until: S8b, size, rot},
];
export const BIG: BigEv[] = [
  // 1870 — African powers
  {lon: 6.5, lat: 12.5, text: 'Sokoto Caliphate', t: T('S1_01', 'Sokoto'), until: E('S1_03') + 1, size: 40},
  {lon: 31.2, lat: -28.2, text: 'Zulu', t: T('S1_01', 'Zulu'), until: E('S1_03') + 1, size: 34},
  {lon: -2.6, lat: 8.3, text: 'Asante', t: T('S1_01', 'Asante'), until: E('S1_03') + 1, size: 30},
  {lon: 39.0, lat: 9.5, text: 'Ethiopia', t: T('S1_01', 'Ethiopians'), until: E('S1_03') + 1, size: 40},
  {lon: 32.3, lat: 0.8, text: 'Buganda', t: T('S1_01', 'Ethiopians') + 1, until: E('S1_03') + 1, size: 26},
  {lon: 29.5, lat: 27.0, text: 'Egypt', t: T('S1_02', 'Europeans'), until: E('S1_03') + 1, size: 36},
  {lon: -6.0, lat: 32.0, text: 'Morocco', t: T('S1_02', 'Europeans'), until: E('S1_03') + 1, size: 30},
  {lon: 3.0, lat: 22.0, text: 'Sahara', t: T('S1_03', 'blank'), until: E('S1_03') + 1, size: 54, rot: -8},
  {lon: 22.5, lat: 1.5, text: 'Congo Basin', t: T('S1_03', 'blank') + 0.6, until: E('S1_03') + 1, size: 34},
  // Europe (scenes 2–4)
  {lon: -1.8, lat: 53.0, text: 'Britain', t: T('S2_03', 'Britain'), until: E('S4_01') + 1, size: 40, rot: -70},
  {lon: 2.2, lat: 46.6, text: 'France', t: T('S2_03', 'France'), until: E('S4_01') + 1, size: 44},
  {lon: 10.5, lat: 51.2, text: 'Germany', t: T('S2_03', 'Germany'), until: E('S4_01') + 1, size: 44, rot: -14},
  {lon: 12.8, lat: 42.8, text: 'Italy', t: T('S2_03', 'Germany') + 0.5, until: E('S4_01') + 1, size: 32, rot: 55},
  {lon: 32.0, lat: 39.0, text: 'Ottoman Empire', t: T('S2_01', 'Suez'), until: E('S2_03') + 1, size: 34, rot: -8},
  {lon: 29.5, lat: 27.0, text: 'Egypt', t: T('S2_01', 'Suez'), until: E('S2_03') + 1, size: 34},
  // Congo (scenes 3–4)
  {lon: 23.5, lat: -7.0, text: 'Congo Free State', t: T('S4_02', 'Congo') + 1.5, until: E('S4_03') + 1, size: 34, rot: -12},
  {lon: 15.0, lat: 0.5, text: 'French Congo', t: T('S3_03', 'France') + 0.8, until: E('S4_03') + 1, size: 24, rot: -60},
  // the partition (scene 5) + 1914 summary
  ...both(9.5, 35.5, 'Tunisia', T('S5_01', 'Tunisia'), 26, -70),
  ...both(29.5, 27.0, 'Egypt', T('S5_01', 'Egypt'), 36),
  ...both(18.0, -21.0, 'German S.W. Africa', T('S5_02', 'South'), 26, -70),
  ...both(1.0, 8.6, 'Togo', T('S5_02', 'Togoland'), 20, -80),
  ...both(12.8, 5.5, 'Kamerun', T('S5_02', 'Kamerun'), 26, -60),
  ...both(35.0, -6.5, 'German East Africa', T('S5_02', 'East'), 28, -40),
  ...both(8.0, 10.0, 'Nigeria', T('S5_03', 'Niger'), 32),
  ...both(-1.5, 8.5, 'Gold Coast', T('S5_03', 'Niger') + 0.6, 20, -80),
  ...both(26.5, -17.0, 'Rhodesia', T('S5_03', 'Rhodes'), 30),
  ...both(24.5, -28.5, 'South Africa', T('S5_03', 'Cape'), 30),
  ...both(38.0, 1.0, 'British East Africa', T('S5_03', 'Cairo'), 24, -25),
  ...both(-4.0, 17.5, 'French West Africa', T('S5_04', 'Senegal'), 40),
  ...both(3.0, 27.5, 'Algeria', T('S5_04', 'Algeria'), 36),
  ...both(19.0, 8.5, 'French Equatorial Africa', T('S5_04', 'Congo'), 26, -62),
  ...both(46.8, -19.5, 'Madagascar', T('S5_04', 'Congo') + 1.2, 24, -75),
  ...both(38.2, 14.9, 'Eritrea', T('S5_06', 'Eritrea'), 18, -30),
  ...both(46.0, 4.5, 'Italian Somaliland', T('S5_06', 'Somalia'), 20, -55),
  ...both(17.5, -12.0, 'Angola', T('S5_06', 'Portugal'), 30),
  ...both(36.0, -16.5, 'Mozambique', T('S5_06', 'Portugal') + 0.3, 24, -70),
  ...both(-13.5, 24.5, 'Río de Oro', T('S5_06', 'Sahara'), 20, -70),
  ...both(39.0, 9.5, 'Ethiopia', T('S5_06', 'Eritrea') + 0.5, 30),
  ...both(29.5, 15.0, 'Sudan', T('S6_03', 'Omdurman'), 36),
  // scenes 6–7 close-ups
  {lon: 31.9, lat: -27.4, text: 'Zululand', t: T('S6_01', 'Zulu'), until: E('S6_01') + 1, size: 28, rot: -55},
  {lon: 31.5, lat: 13.5, text: 'Mahdist Sudan', t: T('S6_03', 'Khartoum') + 0.5, until: E('S6_03') + 1, size: 40, rot: -8},
  {lon: 39.8, lat: 7.3, text: 'Ethiopia', t: T('S6_04'), until: E('S6_04') + 1, size: 40},
  {lon: 21.5, lat: -5.5, text: 'Congo Free State', t: T('S7_01'), until: E('S7_02') + 1, size: 28, rot: -12},
  {lon: 17.5, lat: -22.0, text: 'German South-West Africa', t: T('S7_03'), until: E('S7_03') + 1, size: 26, rot: -70},
  {lon: 29.5, lat: -25.0, text: 'Transvaal', t: T('S7_04', 'Boer'), until: E('S7_04') + 1, size: 28},
  {lon: 26.5, lat: -29.0, text: 'Orange Free State', t: T('S7_04', 'Boer'), until: E('S7_04') + 1, size: 20},
  {lon: -6.0, lat: 32.0, text: 'Morocco', t: T('S8_01', 'Morocco'), until: S8b, size: 30},
  {lon: 18.0, lat: 27.0, text: 'Libya', t: T('S8_02', 'Libya'), until: S8b, size: 36},
];

export type CityEv = {lon: number; lat: number; name: string; minScale?: number; capital?: boolean; side?: 'r' | 'l' | 'b' | 't'; t?: number; until?: number};
const AF0 = FIRST_VO + 2, AF1 = T('S8_03', 'borders');
export const CITIES: CityEv[] = ([
  {lon: 3.05, lat: 36.75, name: 'Algiers', capital: true, minScale: 1300},
  {lon: 10.18, lat: 36.8, name: 'Tunis', side: 'r'},
  {lon: 13.19, lat: 32.9, name: 'Tripoli'},
  {lon: 31.24, lat: 30.05, name: 'Cairo', capital: true, minScale: 1200, side: 'r'},
  {lon: 29.92, lat: 31.2, name: 'Alexandria', side: 'l'},
  {lon: 38.75, lat: 9.03, name: 'Addis Ababa', capital: true, minScale: 1300},
  {lon: 39.45, lat: 15.6, name: 'Massawa', side: 'r'},
  {lon: 45.34, lat: 2.05, name: 'Mogadishu'},
  {lon: 39.2, lat: -6.16, name: 'Zanzibar', side: 'r'},
  {lon: 39.66, lat: -4.05, name: 'Mombasa', side: 'r'},
  {lon: 15.3, lat: -4.33, name: 'Léopoldville', side: 'b'},
  {lon: 13.05, lat: -5.85, name: 'Boma', side: 'l'},
  {lon: 13.23, lat: -8.84, name: 'Luanda', side: 'l'},
  {lon: 3.39, lat: 6.45, name: 'Lagos', side: 'b'},
  {lon: -0.19, lat: 5.6, name: 'Accra', side: 'b'},
  {lon: -17.44, lat: 14.69, name: 'Dakar', side: 'l'},
  {lon: -3.0, lat: 16.77, name: 'Timbuktu'},
  {lon: -13.23, lat: 8.48, name: 'Freetown', side: 'l'},
  {lon: 18.42, lat: -33.93, name: 'Cape Town', capital: true, minScale: 1200, side: 'b'},
  {lon: 31.02, lat: -29.86, name: 'Durban', side: 'r'},
  {lon: 28.19, lat: -25.75, name: 'Pretoria'},
  {lon: 28.04, lat: -26.2, name: 'Johannesburg', side: 'b'},
  {lon: 17.08, lat: -22.56, name: 'Windhoek'},
  {lon: 31.05, lat: -17.83, name: 'Salisbury'},
  {lon: 28.58, lat: -20.15, name: 'Bulawayo'},
  {lon: -5.0, lat: 34.03, name: 'Fez'},
  {lon: 32.58, lat: -25.97, name: 'Lourenço Marques', side: 'r'},
  {lon: 47.53, lat: -18.9, name: 'Antananarivo'},
  {lon: 8.52, lat: 12.0, name: 'Kano'},
  {lon: 15.28, lat: -4.27, name: 'Brazzaville', side: 't'},
  {lon: 25.2, lat: 0.52, name: 'Stanley Falls', side: 'r'},
  // Europe
  {lon: 13.4, lat: 52.52, name: 'Berlin', capital: true, minScale: 1200},
  {lon: 2.35, lat: 48.86, name: 'Paris', capital: true, minScale: 1200, side: 'l'},
  {lon: -0.13, lat: 51.5, name: 'London', capital: true, minScale: 1200, side: 'l'},
  {lon: 4.35, lat: 50.85, name: 'Brussels', side: 'r', minScale: 1400},
  {lon: 12.5, lat: 41.9, name: 'Rome', capital: true, minScale: 1200},
  {lon: -9.14, lat: 38.72, name: 'Lisbon', side: 'l'},
  {lon: -3.7, lat: 40.42, name: 'Madrid'},
  {lon: 16.37, lat: 48.21, name: 'Vienna'},
  {lon: 28.98, lat: 41.01, name: 'Constantinople', side: 'r'},
] as CityEv[]).map((c) => ({t: AF0, until: AF1, minScale: 1550, ...c}));

export type CalloutEv = {lon: number; lat: number; text: string; sub?: string; t: number; until: number; dx?: number; dy?: number};
export const CALLOUTS: CalloutEv[] = [
  {lon: 32.55, lat: 30.3, text: 'Suez Canal', sub: 'opened 1869', t: T('S2_01', 'Suez'), until: E('S2_01') + 0.5, dx: -230, dy: -150},
  {lon: 13.4, lat: 52.52, text: 'Berlin Conference', sub: 'Nov 1884 – Feb 1885', t: T('S4_01', 'Berlin'), until: E('S4_01') + 0.5, dx: -200, dy: -110},
  {lon: 15.3, lat: -4.33, text: 'Léopoldville', sub: 'station founded 1881', t: T('S3_02', 'stations'), until: E('S3_02') + 0.5, dx: -190, dy: 120},
  {lon: 32.1, lat: 9.9, text: 'Fashoda', sub: 'Sept – Nov 1898', t: T('S5_05', 'Fashoda'), until: E('S5_05') + 0.5, dx: 190, dy: -110},
  {lon: 30.65, lat: -28.35, text: 'Isandlwana', sub: '22 January 1879', t: T('S6_01', 'Isandlwana'), until: E('S6_01') + 0.5, dx: 190, dy: -130},
  {lon: -8.5, lat: 10.0, text: 'Samori Touré', sub: 'Wassoulou Empire 1882 – 1898', t: T('S6_02', 'Samori'), until: E('S6_02') + 0.5, dx: 170, dy: -130},
  {lon: 32.53, lat: 15.6, text: 'Fall of Khartoum', sub: '26 January 1885', t: T('S6_03', 'Khartoum'), until: T('S6_03', 'Omdurman') - 0.3, dx: 200, dy: -110},
  {lon: 32.48, lat: 15.65, text: 'Omdurman', sub: '2 September 1898', t: T('S6_03', 'Omdurman'), until: E('S6_03') + 0.5, dx: 200, dy: 120},
  {lon: 38.9, lat: 14.17, text: 'Adwa', sub: '1 March 1896', t: T('S6_04', 'Adwa'), until: E('S6_04') + 0.5, dx: 170, dy: -150},
  {lon: 17.2, lat: -20.4, text: 'Waterberg', sub: 'extermination order · Oct 1904', t: T('S7_03', 'extermination'), until: E('S7_03') + 0.3, dx: 170, dy: -120},
  {lon: 26.2, lat: -29.1, text: 'Bloemfontein camp', sub: '1900 – 1902', t: T('S7_04', 'concentration'), until: E('S7_04') + 0.3, dx: 190, dy: 110},
  {lon: -9.6, lat: 30.42, text: 'Agadir', sub: 'SMS Panther · July 1911', t: T('S8_01', 'Agadir'), until: E('S8_01') + 0.5, dx: 180, dy: 120},
];

export type RouteEv = {pts: [number, number][]; t: number; until: number; color?: string; width?: number; dashed?: boolean; drawDur?: number; head?: boolean};
const GOLD = '#ffd166', RED = '#ff6b4a', BLUE = '#6fb0ff', GREEN = '#7ee081', WHITE = '#ffffff';
export const ROUTES: RouteEv[] = [
  // Livingstone's crossing 1853–56 (Luanda → Victoria Falls → Quelimane)
  {pts: [[13.2, -8.8], [20.0, -12.5], [25.85, -17.92], [33.5, -16.5], [36.9, -17.9]], t: T('S1_03', 'Livingstone'), until: E('S1_03') + 0.5, color: GOLD, width: 7, dashed: true, drawDur: 70},
  // Stanley down the Congo 1874–77
  {pts: [[39.2, -6.16], [33.0, -1.5], [26.2, -4.2], [25.2, 0.52], [20.0, 1.5], [16.5, -1.5], [15.3, -4.33], [13.05, -5.85]], t: T('S3_02', 'Stanley'), until: E('S3_03') + 0.5, color: GOLD, width: 8, drawDur: 90},
  // Brazza for France: Gabon coast → Brazzaville
  {pts: [[9.45, 0.4], [12.0, -1.2], [15.28, -4.27]], t: T('S3_03', 'France'), until: E('S3_03') + 0.5, color: BLUE, width: 7, drawDur: 40},
  // Rhodes' Cape-to-Cairo dream
  {pts: [[18.42, -33.93], [25.0, -29.0], [28.58, -20.15], [29.5, -8.0], [31.5, 0.5], [32.53, 15.6], [31.24, 30.05]], t: T('S5_03', 'Cape'), until: E('S5_03') + 0.5, color: RED, width: 7, dashed: true, drawDur: 70},
  // French columns across the Sahara (1898–1900): from Algeria, from Senegal, from the Congo → Lake Chad
  {pts: [[3.05, 36.75], [2.5, 27.2], [5.5, 20.0], [8.0, 17.0], [13.5, 13.5]], t: T('S5_04', 'Algeria'), until: E('S5_04') + 0.5, color: BLUE, width: 8, drawDur: 60},
  {pts: [[-16.5, 16.0], [-3.0, 16.77], [2.0, 14.0], [9.0, 13.8], [13.5, 13.5]], t: T('S5_04', 'Senegal'), until: E('S5_04') + 0.5, color: BLUE, width: 8, drawDur: 70},
  {pts: [[15.28, -4.27], [18.6, 4.4], [16.5, 9.5], [13.5, 13.5]], t: T('S5_04', 'columns'), until: E('S5_04') + 0.5, color: BLUE, width: 8, drawDur: 50},
  // Marchand to Fashoda; Kitchener up the Nile
  {pts: [[15.28, -4.27], [18.6, 4.4], [25.0, 7.5], [32.1, 9.9]], t: T('S5_05', 'French'), until: E('S5_05') + 0.5, color: BLUE, width: 8, drawDur: 60},
  {pts: [[31.24, 30.05], [31.3, 21.8], [32.48, 15.65], [32.1, 9.9]], t: T('S5_05', 'Kitchener'), until: E('S5_05') + 0.5, color: RED, width: 8, drawDur: 45},
  // Italy from Eritrea toward Adwa
  {pts: [[39.45, 15.6], [38.9, 14.17]], t: T('S6_04', 'Italian'), until: E('S6_04') + 0.5, color: GREEN, width: 8, drawDur: 30},
  {pts: [[38.75, 9.03], [39.5, 12.5], [38.9, 14.17]], t: T('S6_04', 'Menelik'), until: E('S6_04') + 0.5, color: GOLD, width: 8, drawDur: 40},
  // Zulu war: British column from Natal; Zulu impi from Ulundi
  {pts: [[30.4, -29.6], [30.5, -28.35], [30.65, -28.35]], t: T('S6_01', 'British'), until: E('S6_01') + 0.5, color: RED, width: 8, drawDur: 30},
  {pts: [[31.4, -28.3], [30.75, -28.3]], t: T('S6_01', 'Zulu') + 0.6, until: E('S6_01') + 0.5, color: GOLD, width: 8, drawDur: 25},
  // Mahdists to Khartoum; Kitchener to Omdurman
  {pts: [[30.0, 13.0], [32.53, 15.6]], t: T('S6_03', 'Khartoum') - 0.5, until: T('S6_03', 'Omdurman'), color: GOLD, width: 8, drawDur: 30},
  {pts: [[31.24, 30.05], [31.3, 21.8], [33.9, 19.6], [32.48, 15.65]], t: T('S6_03', 'Kitchener'), until: E('S6_03') + 0.5, color: RED, width: 8, drawDur: 45},
  // Samori moving east
  {pts: [[-9.5, 10.5], [-6.0, 9.0], [-3.5, 8.5]], t: T('S6_02', 'eastward'), until: E('S6_02') + 0.5, color: GOLD, width: 7, dashed: true, drawDur: 40},
  // Panther to Agadir
  {pts: [[-5.4, 35.9], [-7.5, 33.5], [-9.9, 30.6]], t: T('S8_01', 'gunboat'), until: E('S8_01') + 0.5, color: '#cfcfcf', width: 7, drawDur: 35},
];

export type PulseEv = {lon: number; lat: number; t: number; until: number; color?: string};
export const PULSES: PulseEv[] = [
  {lon: 30.65, lat: -28.35, t: T('S6_01', 'Isandlwana'), until: E('S6_01') + 0.5},
  {lon: 32.48, lat: 15.65, t: T('S6_03', 'Omdurman'), until: E('S6_03') + 0.5},
  {lon: 38.9, lat: 14.17, t: T('S6_04', 'Adwa'), until: E('S6_04') + 0.5},
  {lon: 32.1, lat: 9.9, t: T('S5_05', 'Fashoda'), until: E('S5_05') + 0.5, color: '#ffd166'},
  {lon: 13.4, lat: 52.52, t: T('S4_01', 'Berlin'), until: E('S4_01') + 0.5, color: '#ffd166'},
  {lon: -9.6, lat: 30.42, t: T('S8_01', 'Agadir'), until: E('S8_01') + 0.5},
];

/* ======================= v4: closer camera (reference-style framing), extra flags, label tones ======================= */
const ZOOM4 = (k: CamKey): CamKey => {
  const s = k.scale;
  const f = s < 500 ? 1 : s <= 960 ? 1.32 : s <= 1150 ? 1.8 : s <= 1450 ? 2.05 : 2.25;
  return {...k, scale: Math.round(s * f)};
};
export const CAM4: CamKey[] = CAM.map(ZOOM4);

/** labels printed in white (over dark fills) — everything else is dark ink on the light terrain */
export const LIGHT_LABELS = new Set(['German S.W. Africa', 'German East Africa', 'Kamerun', 'Togo', 'German South-West Africa', 'Eritrea', 'Italian Somaliland', 'Libya',
  'French West Africa', 'French Equatorial Africa', 'Algeria', 'Tunisia', 'Madagascar', 'French Congo', 'Morocco', 'Mahdist Sudan', 'Zululand', 'Zulu']);

/** additional small flags scattered over the large territories (no label) */
const X = (lon: number, lat: number, power: Power, t: number, until: number): FlagEv => ({lon, lat, power, t, until, w: 62});
export const FLAGS_EXTRA: FlagEv[] = [
  X(-12.5, 18.5, 'france', T('S5_04', 'Senegal') + 2.0, U5), X(1.5, 14.5, 'france', T('S5_04', 'Senegal') + 2.3, U5), X(-6.0, 20.5, 'france', T('S5_04', 'desert') + 0.5, U5),
  X(6.5, 31.0, 'france', T('S5_04', 'Algeria') + 0.4, U5), X(0.5, 24.0, 'france', T('S5_04', 'Algeria') + 0.8, U5),
  X(21.0, 7.5, 'france', T('S5_04', 'Congo') + 0.6, U5), X(15.5, -1.0, 'france', T('S5_04', 'Congo') + 0.9, U5),
  X(20.5, 0.5, 'belgium', T('S4_02', 'Leopold') + 0.5, U5), X(26.0, -8.0, 'belgium', T('S4_02', 'Leopold') + 0.8, U5),
  X(32.5, -3.5, 'germany', T('S5_02', 'East') + 0.5, U5), X(37.0, -9.5, 'germany', T('S5_02', 'East') + 0.8, U5),
  X(18.5, -26.0, 'germany', T('S5_02', 'South') + 0.5, U5),
  X(6.0, 7.0, 'britain', T('S5_03', 'Niger') + 0.5, U5), X(11.5, 11.5, 'britain', T('S5_03', 'Niger') + 0.8, U5),
  X(26.0, -14.5, 'britain', T('S5_03', 'Rhodes') + 0.5, U5), X(24.0, -28.5, 'britain', T('S5_03', 'Cape') + 0.4, U5),
  X(33.5, 11.5, 'britain', T('S6_03', 'Omdurman') + 1.2, U6), X(27.5, 18.0, 'britain', T('S6_03', 'Omdurman') + 1.5, U6),
  X(26.5, 25.0, 'britain', T('S5_01', 'Egypt') + 0.5, U5),
  X(14.5, -16.5, 'portugal', T('S5_06', 'Portugal') + 0.5, U5), X(38.0, -13.0, 'portugal', T('S5_06', 'Portugal') + 0.8, U5),
  X(21.0, 24.0, 'italy', T('S8_02', 'Libya') + 0.4, U8), X(13.0, 30.5, 'italy', T('S8_02', 'Libya') + 0.7, U8),
];
