// MapLibre style for the Knowledgia-look historical relief map.
// Data (all free, no tokens):
//  - imagery: NASA GIBS Blue Marble (public domain), WMTS EPSG:3857, max zoom 8
//  - terrain: AWS Terrain Tiles (Terrarium encoding, Mapzen/USGS/SRTM), free
//  - political borders by date: OpenHistoricalMap vector tiles (PD/ODbL)
//  - sea/shelf/coast: Natural Earth 10m ocean + bathymetry 200 m (public domain)
import type {StyleSpecification, FilterSpecification, ExpressionSpecification} from 'maplibre-gl';
import {staticFile} from 'remotion';

export const GIBS_TILES =
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/2004-08/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg';
export const TERRARIUM_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
export const OHM_ADMIN_TILES = 'https://vtiles.openhistoricalmap.org/maps/ohm_admin/{z}/{x}/{y}';
export const OHM_TILES = 'https://vtiles.openhistoricalmap.org/maps/ohm/{z}/{x}/{y}';
export const GLYPHS = staticFile('glyphs') + '/{fontstack}/{range}.pbf'; // local Cinzel glyphs (generated with fontnik)

// Knowledgia v1 palette (measured from the reference frames)
export const SEA_DEEP = '#587d8e'; // measured from reference (91,126,143)
export const SEA_SHELF = '#6b8e9e'; // measured (105,140,156)
export const COAST = '#dce9ee';
export const LAND_DEFAULT = '#8d8f7b';

export type Palette = Record<string, string>; // name_en (or name) -> fill colour

/** OHM features valid in a given decimal year. */
export const dateFilter = (year: number, extra: FilterSpecification[] = []): FilterSpecification => [
  'all',
  ['<=', ['get', 'start_decdate'], year],
  ['any', ['!', ['has', 'end_decdate']], ['>=', ['get', 'end_decdate'], year]],
  ...extra,
] as FilterSpecification;

const nameExpr: ExpressionSpecification = ['coalesce', ['get', 'name_en'], ['get', 'name']];

export const fillColorExpr = (palette: Palette): ExpressionSpecification => {
  const entries = Object.entries(palette).filter(([k]) => !k.includes('@'));
  if (entries.length === 0) return ['literal', LAND_DEFAULT] as unknown as ExpressionSpecification;
  const m: unknown[] = ['match', nameExpr];
  for (const [k, v] of entries) m.push(k, v);
  m.push(LAND_DEFAULT);
  return m as ExpressionSpecification;
};

export type StyleOpts = {adminLevels?: number[]; nativeLabels?: boolean; fallbackNames?: string[]; minAreaM2?: number; satellite?: boolean};

export const buildStyle = (year: number, palette: Palette, opts: StyleOpts = {}): StyleSpecification => {
  const levels = opts.adminLevels ?? [2];
  const fallbackNames = opts.fallbackNames ?? [];
  const minArea = opts.minAreaM2 ?? 2e10; // hide micro-states (< 20,000 km²)
  const bigEnough: FilterSpecification = ['>=', ['coalesce', ['get', 'area'], 1e20], minArea] as FilterSpecification;
  const labelLayout = {
    'text-font': ['Garamond Bold'],
    'text-size': ['interpolate', ['linear'], ['zoom'], 4, 22, 7, 46] as unknown as number,
    'text-transform': 'none' as const,
    'text-letter-spacing': 0.08,
    'text-pitch-alignment': 'map' as const,
    'text-rotation-alignment': 'map' as const,
    'text-max-width': 6,
    'text-padding': 12,
  };
  const labelPaint = {'text-color': '#ffffff', 'text-halo-color': 'rgba(15,12,8,0.75)', 'text-halo-width': 2.2, 'text-halo-blur': 1.4};
  const cityPaint = {'text-color': '#ffffff', 'text-halo-color': 'rgba(15,12,8,0.7)', 'text-halo-width': 1.4, 'text-halo-blur': 0.8};
  const seaPaint = {'text-color': '#eaf4f7', 'text-halo-color': 'rgba(30,60,75,0.55)', 'text-halo-width': 1.2, 'text-halo-blur': 1.2};
  const fbFilter: FilterSpecification = ['in', ['get', 'name'], ['literal', fallbackNames]] as FilterSpecification;
  const lvl: FilterSpecification = ['in', ['get', 'admin_level'], ['literal', levels]] as FilterSpecification;
  const onlyNamed: FilterSpecification = ['has', 'name'] as FilterSpecification;
  return {
    version: 8,
    glyphs: GLYPHS,
    sources: {
      gibs: {type: 'raster', tiles: [GIBS_TILES], tileSize: 256, maxzoom: 8, attribution: 'NASA GIBS'},
      // Natural Earth hypsometric tints (painterly, like the reference) – local tiles built by scripts/build_ne_tiles.py
      hyp: {type: 'raster', tiles: [staticFile('tiles/hyp') + '/{z}/{x}/{y}.jpg'], tileSize: 256, minzoom: 3, maxzoom: 6, bounds: [-30, 5, 140, 75]},
      wisps: {type: 'raster', tiles: [staticFile('tiles/wisps') + '/{z}/{x}/{y}.png'], tileSize: 256, minzoom: 3, maxzoom: 6, bounds: [-30, 5, 140, 75]},
      light: {type: 'raster', tiles: [staticFile('tiles/light') + '/{z}/{x}/{y}.png'], tileSize: 256, minzoom: 3, maxzoom: 6, bounds: [-30, 5, 140, 75]},
      cities: {type: 'geojson', data: staticFile('data/cities.json')},
      sea_labels: {type: 'geojson', data: {type: 'FeatureCollection', features: []}},
      dem: {type: 'raster-dem', tiles: [TERRARIUM_TILES], tileSize: 256, encoding: 'terrarium', maxzoom: 12},
      hs: {type: 'raster-dem', tiles: [TERRARIUM_TILES], tileSize: 256, encoding: 'terrarium', maxzoom: 12},
      ocean: {type: 'geojson', data: staticFile('data/ne_10m_ocean.json')},
      deep: {type: 'geojson', data: staticFile('data/ne_10m_bathymetry_K_200.json')},
      ohm_admin: {type: 'vector', tiles: [OHM_ADMIN_TILES], minzoom: 0, maxzoom: 20, attribution: 'OpenHistoricalMap'},
      ohm: {type: 'vector', tiles: [OHM_TILES], minzoom: 0, maxzoom: 20},
      // gap-filler for realms OHM does not have yet (aourednik historical-basemaps, year 1200)
      fallback: {type: 'geojson', data: {type: 'FeatureCollection', features: []}},
      // label anchors for fallback realms (pole of inaccessibility, computed at runtime)
      fallback_labels: {type: 'geojson', data: {type: 'FeatureCollection', features: []}},
      labels: {type: 'geojson', data: {type: 'FeatureCollection', features: []}},
      realms: {type: 'geojson', data: {type: 'FeatureCollection', features: []}},
    },
    layers: [
      {id: 'bg', type: 'background', paint: {'background-color': SEA_DEEP}},
      ...(opts.satellite
        ? [{id: 'sat', type: 'raster' as const, source: 'gibs', paint: {'raster-saturation': 0.2, 'raster-contrast': 0.1, 'raster-brightness-max': 0.95}}]
        : [{id: 'hyp', type: 'raster' as const, source: 'hyp', paint: {'raster-saturation': 0.25, 'raster-contrast': 0.12, 'raster-brightness-min': 0.02, 'raster-brightness-max': 0.8}}]),
      // invisible layer: forces OHM boundary tiles to load so prepareRealms() can query them
      {id: 'ohm-load', type: 'fill', source: 'ohm_admin', 'source-layer': 'boundaries', filter: dateFilter(year, [lvl]), paint: {'fill-opacity': 0}},
      // political fills – one processed source (OHM realms + clipped fallbacks, smoothed), see prepareRealms()
      {
        id: 'realm-fill', type: 'fill', source: 'realms',
        paint: {'fill-color': fillColorExpr(palette), 'fill-opacity': 0.95, 'fill-antialias': true},
      },
      // relief on top of the fills (reference: fills are flat but relief still reads)
      {
        id: 'hill', type: 'hillshade', source: 'hs',
        paint: {'hillshade-exaggeration': 0.28, 'hillshade-shadow-color': '#2a261c', 'hillshade-highlight-color': '#f3ecd8', 'hillshade-accent-color': '#5a5444', 'hillshade-illumination-direction': 315},
      },
      // sea: flat two-tone, drawn above imagery+hillshade so the sea is clean
      {id: 'ocean', type: 'fill', source: 'ocean', paint: {'fill-color': SEA_SHELF, 'fill-opacity': 0.88}},
      {id: 'deep', type: 'fill', source: 'deep', paint: {'fill-color': SEA_DEEP, 'fill-opacity': 0.86}},
      {id: 'wisps', type: 'raster', source: 'wisps', paint: {'raster-opacity': 0.45}},
      // light halo on the water side of the coast (reference: pale shelf rim)
      {id: 'coast-glow', type: 'line', source: 'ocean', paint: {'line-color': '#e9f2f4', 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 3, 7, 12], 'line-blur': ['interpolate', ['linear'], ['zoom'], 3, 3, 7, 12], 'line-opacity': 0.35}},
      // borders: light rim + crisp dark line
      {
        id: 'realm-rim', type: 'line', source: 'realms', layout: {'line-join': 'round'},
        paint: {'line-color': 'rgba(255,252,240,0.85)', 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 3.2, 7, 6.5]},
      },
      {
        id: 'realm-line', type: 'line', source: 'realms', layout: {'line-join': 'round'},
        paint: {'line-color': '#1f1811', 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1.5, 7, 3.0], 'line-opacity': 1},
      },
      // glossy light/shadow zones over everything (georeferenced, so they stay put during camera moves)
      {id: 'light', type: 'raster', source: 'light', paint: {'raster-opacity': 0.5, 'raster-resampling': 'linear'}},
      {id: 'coast', type: 'line', source: 'ocean', paint: {'line-color': COAST, 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.9, 7, 2.0], 'line-opacity': 0.95}},
      {
        id: 'sea-labels', type: 'symbol', source: 'sea_labels',
        layout: {
          'text-field': ['get', 'label'], 'text-font': ['Garamond Italic'], 'text-size': ['get', 'size'], 'text-rotate': ['get', 'angle'],
          'text-letter-spacing': 0.12, 'text-line-height': 1.1, 'text-max-width': 100, 'text-padding': 2,
          'text-pitch-alignment': 'map', 'text-rotation-alignment': 'map',
        },
        paint: seaPaint,
      },
      {
        id: 'cities', type: 'symbol', source: 'cities', minzoom: 4.5,
        filter: ['<=', ['get', 'rank'], ['interpolate', ['linear'], ['zoom'], 4.5, 1, 6, 3, 8, 6]],
        layout: {
          'icon-image': 'diamond', 'icon-size': ['interpolate', ['linear'], ['zoom'], 4, 0.7, 7, 1.1], 'icon-pitch-alignment': 'map', 'icon-rotation-alignment': 'map',
          'text-field': ['get', 'name'], 'text-font': ['Garamond Bold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 4, 15, 7, 24],
          'text-anchor': 'left', 'text-offset': [1.1, 0], 'text-letter-spacing': 0.04, 'text-padding': 4,
          'text-pitch-alignment': 'map', 'text-rotation-alignment': 'map', 'text-optional': true,
          'symbol-sort-key': ['get', 'rank'],
        },
        paint: cityPaint,
      },
      {
        id: 'labels', type: 'symbol', source: 'labels',
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Garamond Bold'],
          'text-size': ['get', 'size'],
          'text-rotate': ['get', 'angle'],
          'text-letter-spacing': 0.06,
          'text-line-height': 1.15,
          'text-max-width': 100,
          'text-padding': 2,
          'text-pitch-alignment': 'map',
          'text-rotation-alignment': 'map',
          'symbol-sort-key': ['-', 100, ['get', 'size']],
        },
        paint: labelPaint,
      },
      ...(opts.nativeLabels === false
        ? []
        : [
            {
              id: 'fb-label', type: 'symbol' as const, source: 'fallback_labels',
              layout: {...labelLayout, 'text-field': ['get', 'name'] as unknown as string},
              paint: labelPaint,
            },
            {
              id: 'realm-label', type: 'symbol' as const, source: 'ohm', 'source-layer': 'land_ohm_centroids',
              filter: dateFilter(year, [lvl, bigEnough]),
              layout: {
                'text-field': nameExpr,
                'text-font': ['Cinzel Bold'],
                'text-size': ['interpolate', ['linear'], ['zoom'], 4, 22, 7, 46] as unknown as number,
                'text-transform': 'none' as const,
                'text-letter-spacing': 0.08,
                'text-pitch-alignment': 'map' as const,
                'text-rotation-alignment': 'map' as const,
                'text-max-width': 6,
                'text-padding': 12,
              },
              paint: labelPaint,
            },
          ]),
    ],
  };
};
