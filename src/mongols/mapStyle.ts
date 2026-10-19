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
export const SEA_DEEP = '#5b8090';
export const SEA_SHELF = '#789aa7';
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

export type StyleOpts = {adminLevels?: number[]; nativeLabels?: boolean; fallbackNames?: string[]; minAreaM2?: number};

export const buildStyle = (year: number, palette: Palette, opts: StyleOpts = {}): StyleSpecification => {
  const levels = opts.adminLevels ?? [2];
  const fallbackNames = opts.fallbackNames ?? [];
  const minArea = opts.minAreaM2 ?? 2e10; // hide micro-states (< 20,000 km²)
  const bigEnough: FilterSpecification = ['>=', ['coalesce', ['get', 'area'], 1e20], minArea] as FilterSpecification;
  const labelLayout = {
    'text-font': ['Cinzel Bold'],
    'text-size': ['interpolate', ['linear'], ['zoom'], 4, 22, 7, 46] as unknown as number,
    'text-transform': 'none' as const,
    'text-letter-spacing': 0.08,
    'text-pitch-alignment': 'map' as const,
    'text-rotation-alignment': 'map' as const,
    'text-max-width': 6,
    'text-padding': 12,
  };
  const labelPaint = {'text-color': '#ffffff', 'text-halo-color': 'rgba(25,22,16,0.95)', 'text-halo-width': 2.4, 'text-halo-blur': 0.5};
  const fbFilter: FilterSpecification = ['in', ['get', 'name'], ['literal', fallbackNames]] as FilterSpecification;
  const lvl: FilterSpecification = ['in', ['get', 'admin_level'], ['literal', levels]] as FilterSpecification;
  const onlyNamed: FilterSpecification = ['has', 'name'] as FilterSpecification;
  return {
    version: 8,
    glyphs: GLYPHS,
    sources: {
      gibs: {type: 'raster', tiles: [GIBS_TILES], tileSize: 256, maxzoom: 8, attribution: 'NASA GIBS'},
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
    },
    layers: [
      {id: 'bg', type: 'background', paint: {'background-color': SEA_DEEP}},
      {id: 'sat', type: 'raster', source: 'gibs', paint: {'raster-saturation': 0.2, 'raster-contrast': 0.1, 'raster-brightness-max': 0.95}},
      // political fills (semi-opaque, flat) – imagery shows through
      {
        id: 'fb-fill', type: 'fill', source: 'fallback', filter: fbFilter,
        paint: {'fill-color': fillColorExpr(palette), 'fill-opacity': 0.82, 'fill-antialias': true},
      },
      {
        id: 'fb-line', type: 'line', source: 'fallback', filter: fbFilter,
        paint: {'line-color': '#2a2520', 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.8, 7, 2.2], 'line-opacity': 0.85},
      },
      {
        id: 'realm-fill', type: 'fill', source: 'ohm_admin', 'source-layer': 'boundaries',
        filter: dateFilter(year, [lvl, onlyNamed, bigEnough]),
        paint: {'fill-color': fillColorExpr(palette), 'fill-opacity': 0.82, 'fill-antialias': true},
      },
      // relief on top of the fills (reference: fills are flat but relief still reads)
      {
        id: 'hill', type: 'hillshade', source: 'hs',
        paint: {'hillshade-exaggeration': 0.4, 'hillshade-shadow-color': '#1f1d16', 'hillshade-highlight-color': '#fff6dc', 'hillshade-accent-color': '#4a4636', 'hillshade-illumination-direction': 300},
      },
      // sea: flat two-tone, drawn above imagery+hillshade so the sea is clean
      {id: 'ocean', type: 'fill', source: 'ocean', paint: {'fill-color': SEA_SHELF, 'fill-opacity': 1}},
      {id: 'deep', type: 'fill', source: 'deep', paint: {'fill-color': SEA_DEEP, 'fill-opacity': 1}},
      // borders: dark outer edge + light inner rim (reference look)
      {
        id: 'realm-line', type: 'line', source: 'ohm_admin', 'source-layer': 'boundaries',
        filter: dateFilter(year, [lvl, onlyNamed, bigEnough]),
        paint: {'line-color': '#2a2520', 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.8, 7, 2.2], 'line-opacity': 0.85},
      },
      {id: 'coast', type: 'line', source: 'ocean', paint: {'line-color': COAST, 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.6, 7, 1.6], 'line-opacity': 0.9}},
      {
        id: 'labels', type: 'symbol', source: 'labels',
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Cinzel Bold'],
          'text-size': ['get', 'size'],
          'text-rotate': ['get', 'angle'],
          'text-letter-spacing': 0.08,
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
