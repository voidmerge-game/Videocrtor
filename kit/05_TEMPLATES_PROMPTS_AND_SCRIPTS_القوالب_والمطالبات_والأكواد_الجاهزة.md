# 🧩 05 — القوالب والمطالبات والأكواد الجاهزة (Templates / Sub-Prompts / Scripts)

الرمز `{{…}}` = **متغير الحلقة** (يتغير مع كل موضوع). كل ما عداه = **ثابت محرك** لا يُعدَّل. الكود الفعلي الكامل موجود داخل الحقيبة في `ENGINE_SOURCE/` (نسخة من المستودع المرجعي عند commit `b58427c`) — النموذج الثالث **يزرعه في مستودعه الجديد الفارغ كقاعدة** ويستبدل متغيرات الحلقة فقط. (`{{OWNER/REPO}}` أدناه = مستودعه الجديد.)

---

## 0. جدول المتغيرات
| المتغير | مثال من الفيلم المرجعي | أين يُستخدم |
|---|---|---|
| `{{TITLE}}` / `{{SUBTITLE}}` | The Scramble for Africa / 1870–1914 | `Title3D`, الخاتمة، `out_name` |
| `{{REGION}}` `{lon0,lon1,lat0,lat1}` | −25, 65, −40, 62 | `EarthGlobe.REGION`, `make_earth_v6.py`, بلاطات Blue Marble |
| `{{ERAS}}` + ملفات TopoJSON | 1880 / 1900 / 1914 / europe_1884 | `useTopo()`, `FILES` في `qa_check`, `label_fit` |
| `{{POWERS}}` + ألوانها | britain… (9 قوى) | `theme.ts Power/POWER_FILL`, `FlagSvg` |
| `{{OWNER_<era>}}` | `{Egypt:'ottoman', …}` | طبقات التعبئة |
| `{{PARAGRAPHS}}` (32 × نص) | `script/vo_chunks.json` | VO + Whisper |
| `{{EVENTS}}` ACQ/FLAGS/BIG/CITIES/CALLOUTS/ROUTES/PULSES/ARCHIVE/QUOTES/YEARS | `events.ts` | كل شيء |
| `{{ARCHIVE_ITEMS}}` (صور+أفلام PD) | 19 صورة + 10 أفلام | `public/archive`, `credits.json` |
| `{{MUSIC_CUES}}` | 7 مقاطع MacLeod | `MUSIC` |
| `{{CAM_KEYS}}` | ~90 مفتاحاً | `CAM5` |

---

## 1. مطالبة كتابة السكربت (Sub-Prompt — يُنفَّذ ذاتياً)
```
Write a {{DURATION_MIN}}-minute documentary narration in American English about {{TOPIC}} ({{YEAR_FROM}}–{{YEAR_TO}}).
Structure: {{N_SCENES}} scenes (S1…S{{N_SCENES}}), each 3–5 paragraphs of 45–75 words, ids S{scene}_{para}.
Scene plan: S1 the world before; S2 causes/technology; S3 the trigger; S4 the diplomatic turn; S5 the expansion (place-by-place, name every territory as it is taken); S6 resistance; S7 cost/atrocity; S8 outcome + legacy ("…borders drawn then still shape the map today").
Rules: concrete nouns and place names in every paragraph (the map animates on spoken words); numbers written as digits; no rhetorical questions; three short quotable primary-source lines marked [QUOTE author, source] to become quote cards; end with a one-sentence coda.
Output: JSON [{id, text}] + a separate markdown with per-paragraph visual notes (camera target lon/lat, map actions).
```

## 2. VO (أوامر الأدوات)
```
add_voice(language="en-US", voice_identity={gender:"masculine", use_case:"narration"}, text="<first 40 words of S1_01>")
→ voice_id = {{VOICE_ID}}
for each paragraph (≤10 per turn):
  generate_speech(voice_id={{VOICE_ID}}, text=<paragraph, no blank lines, ≤1500 chars>, file_path="public/audio/vo/p/{{ID}}.mp3")
```
ثم سكربت Whisper في الملف `02 §D` → `public/audio/vo/paragraphs.json`.

## 3. بناء طبقة حدود تاريخية من Natural Earth admin-1 (قالب `scripts/build_{{era}}.py`)
```python
# pip install shapely pyshp ; needs /tmp/ne/ne_10m_admin_1_states_provinces.shp (+ rivers shp if splitting on rivers)
import shapefile, json
from shapely.geometry import shape, mapping, box, LineString
from shapely.ops import unary_union, split
sf = shapefile.Reader('/tmp/ne/ne_10m_admin_1_states_provinces.shp', encoding='utf-8')
F = [(dict(zip([f[0] for f in sf.fields[1:]], r.record)), shape(r.shape.__geo_interface__)) for r in sf.shapeRecords()]
def units(pred): return unary_union([g for p, g in F if pred(p)]).buffer(0)
ENTITIES = {  # {{OWNER/era entities}} — each = union of admin-1 units (by admin / name / region / iso_3166_2)
  '{{ENTITY_1}}': units(lambda p: p['admin']=='{{Country}}' and p['name'] in {{set_of_unit_names}}),
  '{{ENTITY_2}}': units(lambda p: p['adm0_a3']=='{{ISO3}}' and p['region']=='{{Region}}'),
  # split on a river: geoms = split(poly, river_line.buffer(0.001)); keep the side by representative point
}
feats = []
for name, g in ENTITIES.items():
    g = g.simplify(0.01, preserve_topology=True)
    if g.is_empty: raise SystemExit('EMPTY ' + name)
    feats.append({'type':'Feature','properties':{'NAME':name,'SUBJECTO':'{{power}}'},'geometry':mapping(g)})
json.dump({'type':'FeatureCollection','features':feats}, open('public/data/{{era}}.geojson','w'))
print(len(feats), 'features')
```
ثم `npx tsx scripts/geo2topo.ts` (يقرأ `*.geojson` ويكتب `{{era}}.json` بكائن `w{{year}}`، quantize 1e5) ثم `npx tsx scripts/label_fit.ts`.

## 4. هيكل `src/events.ts` (قالب مختصر — الأنواع ثابتة، المحتوى متغير)
```ts
import LABEL_POS from './label_pos.json';
import {T, E, P, FIRST_VO, COLD_OPEN, END_VO, OUTRO} from './timeline';
export const OWNER_{{ERA_A}}: Record<string, Power> = { '{{Entity}}': '{{power}}', … };
export const OWNER_{{ERA_B}}: Record<string, Power> = { … };
export const ACQ: Acq[] = [ {name: '{{Entity}}', t: T('{{Sx_yy}}', '{{SpokenWord}}'), from: [{{lon}}, {{lat}}], dur: {{1.2–5.0}}}, … ];
export const FLAGS_RAW: FlagEv[] = [ {lon, lat, power: '{{power}}', t: T('{{Sx_yy}}','{{Word}}'), label: '{{Short label}}', until: E('{{Sx_yy}}') + 0.6}, … ];
export const BIG: BigEv[] = [ {lon, lat, text: '{{NAME AS SPOKEN}}', t: …, until: …, size: 40, fitKey: ['{{era}}', '{{NAME in topojson}}']}, … ];
export const CITIES: CityEv[] = [ {lon, lat, name: '{{City}}', capital: true, side: 'r', minScale: 1800}, … ];
export const CALLOUTS: CalloutEv[] = [ {lon, lat, text: '{{EVENT}}', sub: '{{date / detail}}', t: T(…), until: T(…) + 6}, … ];
export const ROUTES: RouteEv[] = [ {pts: [[lon,lat],…], t: T(…), until: …, color: GOLD, width: 4, drawDur: 1.6, head: true}, … ];
export const PULSES: PulseEv[] = [ {lon, lat, t: T(…,'{{battle}}'), until: … , color: RED}, … ];
export const ARCHIVE: ArcEv[] = [
  {src: 'archive/{{id}}.jpg', caption: '{{Caption, year}}', t: T(…) - 0.3, until: E(…) + 0.5, ...R, from: 'right'},
  {src: 'archive/clips/{{id}}.jpg', video: 'archive/clips/{{id}}.mp4', caption: '{{Caption}} — {{year}}', t: …, until: …, ...Lf, from: 'left'},
  {src: 'archive/{{id}}.jpg', caption: '…', t: …, until: …, ...R, wall: true, sign: '{{FILE LABEL}}'},   // طاولة غرفة العمليات
];
export const QUOTES: QuoteEv[] = [ {text: '{{quote}}', author: '{{who}}', source: '{{where, year}}', t: P('{{Sx_yy}}').start - 7.0, until: P('{{Sx_yy}}').start - 0.5}, … ];
export const YEARS: [number, string][] = [[0, '{{YEAR_FROM}}'], [T('S2_01'), '{{year}}'], …, [T('S8_03','borders'), 'TODAY']];
export const CAM5: CamKey[] = [ {t: 0, lon: {{lon}}, lat: {{lat}}, scale: 440}, {t: COLD_OPEN.quote, …}, K(FIRST_VO + 2, {{lon}}, {{lat}}, 24), K(T('S1_01','{{Word}}'), lon, lat, 46), … , {t: END_VO + 1.5 + OUTRO.card, lon, lat, scale: 440} ];
export const CAM4 = HOLD(CAM5);
export const SFX = [ …ثوابت الملف 04 + {{hits على كلمات مفصلية}} ];
export const MUSIC: Music[] = [ {src: 'audio/music/{{Track}}.mp3', t: T('S1_01') - 1, until: E('S1_03') + 2, gain: 0.55, fadeIn: 2, fadeOut: 4}, … ];
```
ثوابت لا تُلمس: `R/Lf/Pt_`, `HOLD`, `K`, قواعد `withFit/FIT_OF`, `SCENES_FOR_DEBUG`.

## 5. أمر إطلاق التشغيلات على GitHub
(التوكن محفوظ مسبقاً في `~/.secrets/gh_token` وفق بروتوكول الملف 00 §3؛ `{{OWNER}}` = ناتج `GET /user` → `login`.)
```bash
# استلام التوكن (يلصقه المستخدم في المحادثة) — احفظه هكذا ولا تطبعه أبداً:
mkdir -p ~/.secrets && umask 077 && cat > ~/.secrets/gh_token <<'EOF_T'
{{PASTE_TOKEN_HERE}}
EOF_T
chmod 600 ~/.secrets/gh_token
T=$(cat ~/.secrets/gh_token); curl -s -H "Authorization: Bearer $T" https://api.github.com/user | python3 -c "import json,sys;print(json.load(sys.stdin)['login'])"
# إنشاء المستودع الفارغ إن لم يكن موجوداً:
curl -s -X POST -H "Authorization: Bearer $T" -H "Accept: application/vnd.github+json" https://api.github.com/user/repos -d '{"name":"{{REPO}}","private":true,"auto_init":false}' | python3 -c "import json,sys;print(json.load(sys.stdin).get('full_name'))"
# أول دفع من مجلد ENGINE_SOURCE المزروع:
git init -q -b main && git add -A && git -c user.name=agent -c user.email=agent@local commit -q -m "engine bootstrap" && git push -q "https://x-access-token:${T}@github.com/{{OWNER}}/{{REPO}}.git" HEAD:main 2>&1 | grep -v token
T=$(cat ~/.secrets/gh_token); R={{OWNER/REPO}}   # المستودع الجديد الفارغ الذي أعطاه المستخدم
# لقطات
curl -s -X POST -H "Authorization: Bearer $T" -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/$R/actions/workflows/stills.yml/dispatches \
  -d '{"ref":"main","inputs":{"composition":"Main","frames":"{{690,1278,…}}","scale":"0.5"}}'
# رندر نهائي (فقط بعد إذن صريح)
curl -s -X POST -H "Authorization: Bearer $T" -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/$R/actions/workflows/render_parallel.yml/dispatches \
  -d '{"ref":"main","inputs":{"composition":"Main","scale":"1","crf":"18","chunks":"20","out_name":"{{Title}}_1080p.mp4","reuse_video_run_id":"","reuse_audio_run_id":"{{prev run id or empty}}"}}'
# حالة/قطع/artifacts
curl -s -H "Authorization: Bearer $T" https://api.github.com/repos/$R/actions/runs?per_page=3 | python3 -c "import json,sys;[print(r['id'],r['name'],r['status'],r['conclusion']) for r in json.load(sys.stdin)['workflow_runs']]"
curl -s -H "Authorization: Bearer $T" https://api.github.com/repos/$R/actions/runs/{{RUN}}/artifacts?per_page=100
mkdir -p /var/tmp/final && curl -sL -H "Authorization: Bearer $T" https://api.github.com/repos/$R/actions/artifacts/{{ART}}/zip | funzip > /var/tmp/final/final.mp4
```
ملفات الـ workflows الكاملة في المستودع: `.github/workflows/{stills,render,render_parallel}.yml` (نُسخها تُستعمل كما هي؛ لتغيير اسم الملف الافتراضي عدّل `out_name.default`).

## 6. توليد SFX إجرائياً (`scripts/make_sfx.py`)
```python
import numpy as np, wave
SR=48000
def save(n,x):
    x=np.clip(x/ (np.max(np.abs(x))+1e-9)*0.9,-1,1); w=wave.open(f'public/audio/sfx/{n}.wav','w'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x*32767).astype('<i2').tobytes()); w.close()
t=lambda d: np.arange(int(SR*d))/SR
env=lambda d,a,r: np.minimum(1,t(d)/a)*np.exp(-t(d)/r)
save('thud', (np.sin(2*np.pi*(70+30*np.exp(-t(0.5)*18))*t(0.5))+0.3*np.random.randn(len(t(0.5)))*np.exp(-t(0.5)*60))*env(0.5,0.003,0.12))
save('hit',  (np.sin(2*np.pi*(55)*t(1.6))+0.5*np.random.randn(len(t(1.6)))*np.exp(-t(1.6)*25))*env(1.6,0.002,0.45))
n=np.random.randn(len(t(1.2))); save('whoosh', np.convolve(n,np.ones(64)/64,'same')*np.sin(np.pi*t(1.2)/1.2)**2)
save('tick', np.random.randn(len(t(0.06)))*env(0.06,0.001,0.012))
save('key',  np.random.randn(len(t(0.09)))*env(0.09,0.001,0.02)+0.3*np.sin(2*np.pi*1800*t(0.09))*env(0.09,0.001,0.01))
save('ink',  np.convolve(np.random.randn(len(t(1.4))),np.ones(400)/400,'same')*env(1.4,0.3,0.6))
d=6.0; save('drone', (np.sin(2*np.pi*48*t(d))+0.5*np.sin(2*np.pi*72.2*t(d))+0.25*np.sin(2*np.pi*96.5*t(d)))*np.sin(np.pi*t(d)/d)**0.7)
```

## 7. رفع كبير إلى Drive
```
google_drive__initiate_resumable_upload(name="{{Title}}_1080p.mp4", mime_type="video/mp4", parent_folder_id="{{FOLDER_ID}}") → session_uri
bash: python3 scripts/drive_upload.py /var/tmp/final/final.mp4 "<session_uri>"   # يطبع DONE <bytes> + id
google_drive__upload_file(CREDITS_AND_LICENSES_{{ver}}.md → parent {{FOLDER_ID}})
```

## 8. قالب `CREDITS_AND_LICENSES.md`
```
# {{TITLE}} — Credits & Licenses
Narration: original script; neural TTS (American English). Word alignment: Whisper.
Maps: Natural Earth 10m (public domain) — admin-1 unions for historical polities; earth imagery NASA Blue Marble (July 2004, PD); relief NE GRAY_HR_SR_OB (PD); clouds NASA (PD); night lights NASA Black Marble (PD).
Archive images (Wikimedia Commons, public domain): {{id — title — author — URL}} …
Archive films (PD/CC0): {{id — title — year — URL}} …
Music: Kevin MacLeod (incompetech.com). Licensed under Creative Commons: By Attribution 4.0 License. Tracks: {{list}}.
SFX: synthesised procedurally for this film.
## Delivery record — {{ver}}: commit {{sha}}, render run {{id}}, artifact {{id}}, Drive id {{id}}, {{bytes}} B, {{frames}} frames, {{duration}} s, QA {{samples}} samples / 0 violations.
```

## 9. سكربت الفحص قبل العرض (`scripts/preflight.sh` — يُنشأ من هذه الأسطر)
```bash
set -e
npx tsc --noEmit -p .
npx tsx scripts/label_fit.ts >/dev/null
npx tsx scripts/qa_check.ts 0.1 | tail -3        # يجب أن يحتوي "0 violations"
npx tsx -e "import {ARCHIVE,SFX,MUSIC} from './src/events'; import fs from 'fs'; let m=0; for (const p of [...ARCHIVE.flatMap(a=>[a.src,a.video]).filter(Boolean),...SFX.map(s=>s.src),...MUSIC.map(s=>s.src)]) if(!fs.existsSync('public/'+p)){console.log('MISSING',p);m++}; console.log('assets missing:',m); process.exit(m?1:0)"
npx tsx scripts/print_times.ts | tail -5
```
