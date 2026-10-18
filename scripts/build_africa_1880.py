#!/usr/bin/env python3
"""Build public/data/africa_1880.geojson — the 1870–1884 political layer — from REAL geometry:
Natural Earth 10m admin-1 units (public domain) unioned into the historical polities, Natal/Zululand split on the
Tugela river (NE 10m rivers). Coastlines therefore match the satellite imagery exactly.
Inputs (not committed, ~35 MB): /tmp/ne/ne_10m_admin_1_states_provinces.shp, /tmp/ne/ne_10m_rivers_lake_centerlines.shp
Output: public/data/africa_1880.geojson  -> scripts/geo2topo.ts turns it into africa_1880.json (object w1880)."""
import json, sys, shapefile
from shapely.geometry import shape, Point, LineString, MultiPolygon, Polygon, mapping
from shapely.ops import unary_union, linemerge, split

NE = '/tmp/ne/ne_10m_admin_1_states_provinces.shp'
RIV = '/tmp/ne/ne_10m_rivers_lake_centerlines.shp'
r = shapefile.Reader(NE)
units = {}  # (admin, name) -> geometry ; also admin -> list
by_admin = {}
by_region = {}
for sr in r.iterShapeRecords(fields=['admin', 'name', 'region']):
    g = shape(sr.shape.__geo_interface__)
    if not g.is_valid: g = g.buffer(0)
    key = (sr.record['admin'], str(sr.record['name']))
    units.setdefault(key, []).append(g)
    by_admin.setdefault(sr.record['admin'], []).append(g)
    by_region.setdefault((sr.record['admin'], str(sr.record['region'])), []).append(g)

missing = []
def U(admin, *names):
    gs = []
    for n in names:
        if (admin, n) not in units: missing.append(f'{admin}/{n}'); continue
        gs += units[(admin, n)]
    return gs
def C(admin):
    if admin not in by_admin: missing.append(admin); return []
    return by_admin[admin]
def R(admin, region):
    if (admin, region) not in by_region: missing.append(f'{admin}:{region}'); return []
    return by_region[(admin, region)]
def ALL_BUT(admin, *names):
    ex = set(names)
    return [g for (a, n), gs in units.items() if a == admin and n not in ex for g in gs]

# ---- Natal / Zululand split on the Tugela river
rr = shapefile.Reader(RIV)
tug = [shape(s.shape.__geo_interface__) for s in rr.iterShapeRecords(fields=['name']) if s.record['name'] == 'Tugela']
tug = unary_union(tug)
if tug.geom_type != 'LineString': tug = linemerge(tug)
if tug.geom_type != 'LineString':
    tug = max(list(tug.geoms), key=lambda l: l.length)
pts = list(tug.coords)
if pts[0][0] > pts[-1][0]: pts.reverse()      # west -> east
pts = [(pts[0][0] - 1.5, pts[0][1] - 0.15)] + pts + [(pts[-1][0] + 1.0, pts[-1][1] - 0.1)]  # extend into Drakensberg and sea
cut = LineString(pts)
kzn = unary_union(U('South Africa', 'KwaZulu-Natal'))
parts = list(split(kzn, cut).geoms)
natal = unary_union([p for p in parts if p.representative_point().y < cut.interpolate(cut.project(p.representative_point())).y])
zulu = unary_union([p for p in parts if p.representative_point().y >= cut.interpolate(cut.project(p.representative_point())).y])
print('Tugela split: natal', round(natal.area, 2), 'zulu', round(zulu.area, 2), file=sys.stderr)

# ---- Cape Colony stops at the Orange river (1880); Griqualand West (Kimberley diamond fields, British 1871) north of it
def river(name):
    ls = [shape(s.shape.__geo_interface__) for s in rr.iterShapeRecords(fields=['name']) if s.record['name'] == name]
    l = unary_union(ls)
    if l.geom_type != 'LineString': l = linemerge(l)
    if l.geom_type != 'LineString': l = max(list(l.geoms), key=lambda x: x.length)
    return l
org = river('Orange')
op = list(org.coords)
if op[0][0] < op[-1][0]: op.reverse()   # east (source, Lesotho) -> west (mouth)
op = [(op[0][0] + 1.0, op[0][1] + 0.3)] + op + [(op[-1][0] - 1.0, op[-1][1])]
ocut = LineString(op)
ncape = unary_union(U('South Africa', 'Northern Cape'))
nparts = list(split(ncape, ocut).geoms)
def south_of(p, line):
    c = p.representative_point(); return c.y < line.interpolate(line.project(c)).y
ncape_s = unary_union([p for p in nparts if south_of(p, ocut)])
ncape_n = unary_union([p for p in nparts if not south_of(p, ocut)])
griqua = ncape_n.intersection(Polygon([(22.6, -30.5), (26.5, -30.5), (26.5, -27.6), (22.6, -27.6)]))
print('Orange split: cape-side', round(ncape_s.area, 2), 'north', round(ncape_n.area, 2), 'griqualand', round(griqua.area, 2), file=sys.stderr)

# ---- Ethiopia 1870 (Tigray, Amhara, Shewa): Oromiya clipped with a smooth arc around Shewa
oromiya = unary_union(U('Ethiopia', 'Oromiya'))
shewa = oromiya.intersection(Point(38.9, 10.0).buffer(2.4, 64))

RECIPES = {
  # ----- African states, c. 1870
  'Sokoto Caliphate': U('Nigeria', 'Sokoto', 'Kebbi', 'Zamfara', 'Katsina', 'Kano', 'Jigawa', 'Kaduna', 'Bauchi', 'Gombe', 'Adamawa', 'Taraba', 'Niger', 'Kwara', 'Nassarawa', 'Plateau', 'Federal Capital Territory') + U('Cameroon', 'Nord', 'Adamaoua'),
  'Ethiopia': U('Ethiopia', 'Tigray', 'Amhara', 'Addis Ababa') + [shewa],
  'Zululand': [zulu],
  'Asante': U('Ghana', 'Ashanti', 'Brong Ahafo'),
  'Buganda': R('Uganda', 'Central'),
  'Morocco': ALL_BUT('Morocco', 'Laâyoune - Boujdour - Sakia El Hamra', 'Oued el Dahab', 'Guelmim - Es-Semara'),
  'Egypt': C('Egypt'),
  'Egyptian Sudan': C('Sudan') + C('S. Sudan') + U('Eritrea', 'Semenawi Keyih Bahri', 'Debubawi Keyih Bahri'),
  'Harer (Egypt)': U('Ethiopia', 'Harari People', 'Dire Dawa') + C('Somaliland'),
  'Sultanate of Zanzibar': U('United Republic of Tanzania', 'Tanga', 'Pwani', 'Dar-Es-Salaam', 'Lindi', 'Mtwara', 'Kaskazini-Pemba', 'Kaskazini-Unguja', 'Kusini-Pemba', 'Zanzibar South and Central', 'Zanzibar West') + U('Kenya', 'Coast'),
  'Dahomey': U('Benin', 'Atlantique', 'Littoral', 'Ouémé', 'Zou', 'Collines', 'Kouffo', 'Mono', 'Plateau'),
  'Imerina': C('Madagascar'),
  'Transvaal': U('South Africa', 'Gauteng', 'Limpopo', 'Mpumalanga', 'North West'),
  'Orange Free State': U('South Africa', 'Free State'),
  'Liberia': C('Liberia'),
  # ----- European footholds, c. 1880
  'Algeria (FR)': ALL_BUT('Algeria', 'Adrar', 'Tamanghasset', 'Illizi', 'Tindouf', 'Béchar', 'Ouargla', 'El Oued', 'Ghardaïa'),
  'Senegal (FR)': U('Senegal', 'Dakar', 'Thiès', 'Saint-Louis', 'Louga', 'Matam'),
  'Congo': C('Gabon') + U('Republic of the Congo', 'Kouilou', 'Pointe Noire', 'Niari', 'Bouenza', 'Lékoumou', 'Pool', 'Brazzaville'),
  'Angola (Portugal)': U('Angola', 'Cabinda', 'Zaire', 'Bengo', 'Luanda', 'Cuanza Norte', 'Cuanza Sul', 'Benguela', 'Namibe', 'Malanje'),
  'Mozambique': U('Mozambique', 'Cabo Delgado', 'Nampula', 'Zambezia', 'Sofala', 'Inhambane', 'Gaza', 'Maputo', 'Tete'),
  'Portuguese Guinea': C('Guinea Bissau'),
  'Gold Coast (GB)': U('Ghana', 'Western', 'Central', 'Greater Accra', 'Eastern', 'Volta'),
  'Cape Colony': U('South Africa', 'Western Cape', 'Eastern Cape') + [ncape_s],
  'Griqualand West': [griqua],
  'Natal': [natal],
  'Lagos': U('Nigeria', 'Lagos'),
  'Sierra Leone': U('Sierra Leone', 'Western', 'Southern'),
  'Gambia': C('Gambia'),
  'Basutoland': C('Lesotho'),
  'Spanish Guinea': C('Equatorial Guinea'),
  'Ottoman Empire': C('Libya') + C('Tunisia') + C('Turkey') + C('Syria') + C('Lebanon') + C('Israel') + C('Gaza Strip') + C('West Bank') + C('Jordan') + C('Iraq') + C('Kuwait')
      + U('Saudi Arabia', 'Tabuk', 'Al Madinah', 'Makkah', 'Al Bahah', '`Asir', 'Jizan')
      + [g for (a, n), gs in units.items() if a == 'Yemen' and n not in ('`Adan', 'Lahij', 'Abyan', 'Hadramawt', 'Al Mahrah', 'Shabwah') for g in gs]
      + C('Albania') + C('Macedonia') + C('Kosovo'),
}
if missing:
    print('MISSING UNITS:', missing, file=sys.stderr); sys.exit(1)

def clean(g, keep_small=False):
    g = unary_union(g)
    if not g.is_valid: g = g.buffer(0)
    g = g.simplify(0.0035, preserve_topology=True)
    polys = [g] if g.geom_type == 'Polygon' else list(g.geoms)
    if not keep_small:
        big = max(p.area for p in polys)
        polys = [p for p in polys if p.area > min(0.004, big * 0.02)]
    polys = [Polygon([(round(x, 4), round(y, 4)) for x, y in p.exterior.coords], [[(round(x, 4), round(y, 4)) for x, y in h.coords] for h in p.interiors]) for p in polys]
    return MultiPolygon(polys) if len(polys) > 1 else polys[0]

features = []
for name, gs in RECIPES.items():
    g = clean(gs, keep_small=name in ('Sultanate of Zanzibar', 'Spanish Guinea', 'Lagos', 'Gambia', 'Sierra Leone'))
    features.append({'type': 'Feature', 'properties': {'NAME': name}, 'geometry': mapping(g)})
    print(f'{name:24s} parts={1 if g.geom_type=="Polygon" else len(g.geoms):3d} area={g.area:8.2f} verts={sum(len(p.exterior.coords) for p in ([g] if g.geom_type=="Polygon" else g.geoms))}', file=sys.stderr)
fc = {'type': 'FeatureCollection', 'features': features}
json.dump(fc, open('public/data/africa_1880.geojson', 'w'), separators=(',', ':'))
print('wrote public/data/africa_1880.geojson', file=sys.stderr)
