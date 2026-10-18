import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, useCurrentFrame, useVideoConfig} from 'remotion';
import {WorldMap} from './components/WorldMap';
import {useTopo} from './lib/geo';
import {camAt, prog} from './lib/anim';
import {C, Power} from './theme';
import {FlagDrop, MapLabel, YearBadge, Caption, TitleCard, Grain, PowerChip} from './components/Ui';
import {ensureFonts} from './lib/fonts';

const OWNER_1914: Record<string, Power> = {
  'United Kingdom of Great Britain and Ireland': 'britain', France: 'france', Portugal: 'portugal', Italy: 'italy',
  Spain: 'spain', Belgium: 'belgium', 'German South-West Africa': 'germany', 'German Empire': 'germany',
  Togoland: 'germany', Kamerun: 'germany', 'Spanish Morocco': 'spain', 'Rio De Oro': 'spain', 'Equatorial Guinea': 'spain',
  'Portuguese Guinea': 'portugal', 'Gambia, The': 'britain', 'Sierra Leone': 'britain', Uganda: 'britain', Swaziland: 'britain',
  Lesotho: 'britain', Tunisia: 'france', Morocco: 'france', 'Ottoman Empire': 'ottoman',
};
const powerOf = (p: any): Power => OWNER_1914[p.SUBJECTO] ?? OWNER_1914[p.NAME] ?? 'independent';

export const Demo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const [h] = useState(() => delayRender('fonts'));
  useEffect(() => {
    ensureFonts().then(() => continueRender(h));
  }, [h]);

  const land = useTopo('land_world');
  const af1880 = useTopo('africa_1880');
  const af1914 = useTopo('africa_1914');

  // Camera: from space over Atlantic → Africa → close on West Africa
  const cam = camAt(
    [
      {t: 0, lon: -30, lat: 15, scale: 420},
      {t: 4, lon: 18, lat: 5, scale: 900},
      {t: 9, lon: 20, lat: 2, scale: 1150},
      {t: 14, lon: 0, lat: 12, scale: 1900},
    ],
    t,
  );

  const show1880 = prog(frame, 3 * fps, 5 * fps);
  const partitionStart = 8 * fps;

  return (
    <AbsoluteFill style={{background: C.ocean}}>
      <WorldMap
        cam={cam}
        land={land}
        layers={[
          {
            id: 'pre',
            fc: af1880,
            fill: (f) => (f.properties.SUBJECTO && ['France', 'Portugal', 'Great Britain', 'Spain', 'Ottoman Empire'].includes(f.properties.SUBJECTO)
              ? C[powerOf({SUBJECTO: f.properties.SUBJECTO === 'Great Britain' ? 'United Kingdom of Great Britain and Ireland' : f.properties.SUBJECTO})]
              : 'rgba(120,100,60,0.35)'),
            stroke: 'rgba(30,20,10,0.6)',
            strokeWidth: 0.8,
            opacity: () => show1880 * 0.85,
          },
          {
            id: 'post',
            fc: af1914,
            fill: (f) => C[powerOf(f.properties)],
            stroke: 'rgba(255,255,255,0.55)',
            strokeWidth: 1.2,
            opacity: (f) => (powerOf(f.properties) === 'independent' ? 0 : 0.78),
            reveal: (f) => {
              // stagger reveal by rough longitude of name hash for the demo
              const i = (f.properties.NAME?.length ?? 5) % 7;
              return prog(frame, partitionStart + i * 10, partitionStart + i * 10 + 40);
            },
            glow: false,
          },
        ]}
      >
        <MapLabel lon={-2} lat={23} text="Sahara" at={5 * fps} kind="region" size={34} />
        <MapLabel lon={30} lat={-2} text="Great Lakes" at={6 * fps} kind="region" size={26} />
        <MapLabel lon={13.2} lat={-8.8} text="Luanda" at={6 * fps} />
        <FlagDrop lon={3} lat={28} power="france" at={9 * fps} label="FRENCH ALGERIA" />
        <FlagDrop lon={32} lat={27} power="britain" at={10 * fps} label="EGYPT" />
        <FlagDrop lon={23} lat={-3} power="belgium" at={11 * fps} label="CONGO FREE STATE" />
        <FlagDrop lon={17} lat={-22} power="germany" at={12 * fps} label="SOUTH-WEST AFRICA" />
        <FlagDrop lon={-5} lat={16} power="france" at={13 * fps} />
        <FlagDrop lon={8} lat={9} power="britain" at={13.5 * fps} label="NIGERIA" />
      </WorldMap>
      <YearBadge year={frame < 8 * fps ? '1880' : '1914'} />
      <PowerChip power="britain" at={9.5 * fps} index={0} />
      <PowerChip power="france" at={9.8 * fps} index={1} />
      <PowerChip power="germany" at={10.1 * fps} index={2} />
      <PowerChip power="belgium" at={10.4 * fps} index={3} />
      <Caption text="The Berlin Conference" sub="November 1884 – February 1885" at={8 * fps} until={13 * fps} />
      <TitleCard title="THE SCRAMBLE FOR AFRICA" sub="1870 — 1914" at={0} until={3.5 * fps} />
      <Grain amount={0.07} />
    </AbsoluteFill>
  );
};
