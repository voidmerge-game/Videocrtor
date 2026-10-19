# 🛠️ 02 — الأدوات الخاصة بالمحرك وإعداداتها الدقيقة (Exact Parameters)

ترتيب خط الإنتاج (كل مخرج يدخل في التالي):
```
[A] بحث وتوثيق (web_search / fetch_page)  →  [B] السكربت (SCRIPT.md, 8 مشاهد)
→ [C] VO: add_voice + generate_speech (ملف لكل فقرة)  →  [D] Whisper word-timestamps → paragraphs.json
→ [E] بيانات الحدود: NE 10m admin-1 → build_*.py → geo2topo.ts → public/data/*.json
→ [F] خامات الأرض: make_earth_v6.py (Blue Marble/GRAY/clouds/night)
→ [G] الأرشيف: Commons API → صور PD + أفلام PD (ffmpeg 960px/8.5s) + posters jpg + credits.json
→ [H] events.ts (كل الأحداث مثبتة على كلمات) → label_fit.ts → label_pos.json
→ [I] فحوص: tsc → qa_check 0 → asset check → stills (GitHub stills.yml أو محلياً) → عرض على المستخدم
→ [J] الرندر: render_parallel.yml (20 قطعة) → artifact final → تحقق ffprobe → Drive resumable upload → CREDITS
```

---

## A. البحث (`web_search`, `fetch_page`)
- `web_search(depth 2)` للحقائق والتواريخ؛ `fetch_page` لصفحات Commons/Natural Earth. مصادر الخامات الثابتة في القسم E/F.
- Commons API: `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1600&titles=File:...&format=json` مع header `User-Agent: Videocrtor/1.0 (contact)`؛ وتيرة ≥ 4 s بين الطلبات؛ تصفّح فئات السنوات (`Category:1897 films`) أفضل من البحث النصي؛ استبعاد مقاطع بعلامة Pathé المائية والمقاطع الملوَّنة/المحسَّنة.

## B. السكربت
- 8 مشاهد × 3–7 فقرات = ~32 فقرة، كل فقرة 45–75 كلمة (15–22 s)، إنجليزية أمريكية، جمل قصيرة، أسماء الأماكن مذكورة صراحة لأن **كل حدث بصري يُثبَّت على كلمة منطوقة**.
- يُحفظ `script/SCRIPT.md` (مع ملاحظات بصرية) و`script/VO_plain.txt` (النص الخام) و`script/vo_chunks.json` (`[{id:"S1_01", text}]`).

## C. التعليق الصوتي (`add_voice` → `generate_speech`)
- `add_voice(language:"en-US", voice_identity:{gender:"masculine", use_case:"narration"}, text: <40 كلمة من السكربت>)` → المستخدم يختار → `voice_id` يُثبّت للمشروع كله.
- `generate_speech(voice_id, text ≤ 1500 حرفاً، **بلا أسطر فارغة**، file_path: public/audio/vo/p/S{n}_{k}.mp3)`؛ **≤ 10 مقاطع في الدور الواحد** → 32 فقرة = 4 أدوار.
- أسماء الأعلام غير الإنجليزية تُكتب صوتياً إن أخطأ النطق (مثال: "Kamerun" → "Kah-meh-ROON").

## D. المزامنة كلمة-بكلمة (Whisper)
```bash
pip install -q openai-whisper   # على GitHub Actions runner أو sandbox (CPU)
python3 - <<'EOF'
import whisper, json, glob, os
m = whisper.load_model("small.en")
out=[]
for f in sorted(glob.glob("public/audio/vo/p/*.mp3")):
    r = m.transcribe(f, word_timestamps=True, language="en", fp16=False)
    words=[{"w":w["word"].strip(),"s":round(w["start"],2),"e":round(w["end"],2)} for s in r["segments"] for w in s["words"]]
    import subprocess
    dur=float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f]))
    pid=os.path.basename(f)[:-4]
    out.append({"id":pid,"file":f.replace("public/",""),"duration":round(dur,2),"text":open(f"script/txt/{pid}.txt").read().strip(),"words":words})
json.dump(out,open("public/audio/vo/paragraphs.json","w"),indent=1)
EOF
```
- الناتج `paragraphs.json` هو **المصدر الوحيد للزمن**. Whisper يحرّف الأسماء → أضف إلى `ALIAS` في `src/timeline.ts` (مثال فعلي: `kamerun:'cameroon', omdurman:'amdurman', asante:'assante', fashoda:'fashota', isandlwana:'isindalwana', khartoum:'cartoom', herero:'herrero', morel:'morrell'`). `T()` يُطبّع الكلمات `lowercase + [^a-z0-9]` ويعود إلى بداية الفقرة إن لم يجد الكلمة (يطبع تحذيراً — لا تتجاهله).

## E. بيانات الحدود (Natural Earth 10m — Public Domain)
- **المصادر**: `https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_1_states_provinces.zip` (14.9 MB؛ حقول `admin, name, region, adm0_a3, iso_3166_2`)، `…/10m/physical/ne_10m_rivers_lake_centerlines.zip` (حقل `name` للتقسيم على الأنهار مثل Tugela/Vaal/Orange/Limpopo)، `…/10m/cultural/ne_10m_admin_0_countries.zip`.
- **الوصفة** (`scripts/build_africa_1880.py`، `pip install shapely pyshp`): لكل كيان تاريخي = `unary_union` لمجموعة وحدات admin-1 (مثال: Zululand = KwaZulu-Natal شمال نهر Tugela؛ Buganda = Uganda `region=Central`؛ Sokoto = ولايات شمال نيجيريا + Niger جنوبية)؛ `buffer(0)` لإصلاح الهندسة؛ `simplify(0.01, preserve_topology=True)`؛ قص بخط عرض 46N عند الحاجة؛ حفظ GeoJSON بخاصية `NAME` (وللأوروبي `SUBJECTO` = اسم القوة).
- **التحويل**: `npx tsx scripts/geo2topo.ts` → `topojson-server topology({obj: fc})` + `presimplify/simplify(0.00005)` ثم `quantize(1e5)` يدوياً (حزمة simplify لا تحتوي quantize) → `public/data/<era>.json` باسم كائن `w<year>`.
- **تحقق الاتجاه**: بعد `polygon-clipping` قد تنقلب الحلقات → إن كان `d3.geoArea(feature) > 2π` اعكس الحلقة.
- ملفات المشروع: `africa_1880.json` (31 كياناً، كائن `w1880`), `africa_1900.json`, `colonies_1914.json` (`w1914`), `europe_1884.json` (`w1884`), `land_world.json`, `countries_world.json` (حقل `CONTINENT`), `countries50.json`.

## F. خامات الأرض (`scripts/make_earth_v6.py`)
- **Blue Marble** (PD): `https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73751/world.topo.bathy.200407.3x21600x21600.{A1,B1,C1,D1,A2,B2,C2,D2}.jpg` (كل بلاطة 90°×90°، 240 px/deg) و`…/73751/world.topo.bathy.200407.3x5400x2700.jpg`؛ تنزيل بـ `curl -L --retry 5 --retry-all-errors -C -`.
- **التضاريس**: `https://naciscdn.org/naturalearth/10m/raster/GRAY_HR_SR_OB.zip` → bump = high-pass (σ) × gain، وقناع المحيط.
- **السحب**: `…/57000/57747/cloud_combined_8192.tif` (أو `cloud_combined_2048.jpg`)؛ **الليل**: Black Marble/Earth at Night 2016 (NASA PD) مصغّر إلى 4096×2048.
- **المعاملات**: الإقليم `LON0=-25, LON1=65, LAT0=-40, LAT1=62` بـ `PPD=60` (JPEG `draft` 1/4 من البلاطات 21600 → 5400 px)، `earth_region.jpg quality=90 subsampling=0`؛ العالم `4096×2048 LANCZOS quality=88`؛ `bump_region.jpg`, `bump_world.jpg`, `clouds_africa.png` (`CLOUDS_HD={-30,65,-42,58}`), `clouds_world.png`, `night_world.jpg`.
- **قيود الذاكرة**: RAM 2 GB → كل عملية على الصور الكبيرة بـ `numpy.memmap` وشرائح أفقية؛ `Image.MAX_IMAGE_PIXELS=None`؛ لا تفتح بلاطتين معاً.
- لتغيير إقليم المشروع (موضوع جديد): غيّر `REGION` في `EarthGlobe.tsx` **و** `LON0..LAT1` في `make_earth_v6.py` معاً، واختر البلاطات المغطية.

## G. الأرشيف
- الصور: Commons `iiurlwidth=1600` → `public/archive/<id>.jpg` (JPEG q 90)؛ سجل كل عنصر في `public/archive/credits.json` `{id,file,license,source,artist}`.
- الأفلام: تنزيل الأصل (`curl -m 120`) → `ffmpeg -ss <in> -t 8.5 -i src -vf "scale=960:-2,fps=24" -an -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart public/archive/clips/<id>.mp4` → poster `ffmpeg -ss 1 -i clip.mp4 -frames:v 1 -q:v 3 <id>.jpg` (**إلزامي**: الطاولة تقرأ `.jpg` لكل عنصر مجاور).
- داخل Remotion: `<OffthreadVideo src={staticFile(video)} muted/>` داخل `<Loop durationInFrames={clipSec×fps}>`.

## H. أحداث الفيلم (`src/events.ts`) وملاءمة الأسماء
- أنواع الأحداث: `OWNER_<era>` (كيان → قوة)، `ACQ` (`{name, t, from?, dur?}` كشف الإقليم)، `FLAGS_RAW/FLAGS_EXTRA` (`{lon,lat,power,t,label?,w?,until?}`)، `BIG` (أسماء الكيانات مع `fitKey:[era,NAME]`)، `CITIES`, `LABELS`, `CALLOUTS`, `ROUTES` (أسهم متحركة `drawDur`, `head`), `PULSES`, `ARCHIVE`, `QUOTES`, `YEARS`, `CHIPS`, `SFX`, `MUSIC`, `CAM5 → HOLD → CAM4`.
- `npx tsx scripts/label_fit.ts` → `src/label_pos.json` (لكل era/NAME: `{lon,lat,cs,th,L0,Lv,La,Lp,ratio,r,bh,ba}`)؛ يُعاد تشغيله **كلما تغيّرت أي بيانات حدود**.
- أي اسم في `BIG` بلا `fitKey` صالح = خطأ `NO_FIT` في الفاحص؛ `FIT_OF` يربط النص بالمفتاح (مثال `'Abyssinia' → ['1914','Abyssinia']`).

## I. الفحوص (كلها قبل أي عرض على المستخدم)
```bash
npm ci && npx remotion browser ensure          # كل دور (snapshot يفقدها)
npx tsc --noEmit -p .                           # 0 أخطاء
npx tsx scripts/label_fit.ts                    # يولّد label_pos.json
npx tsx scripts/qa_check.ts 0.1                 # خطوة 0.1 s → يجب "0 violations" (v6.1: 5777 عينات / 10472 رسم اسم / 0)
# فحص الأصول: كل src/video/poster/audio مذكور في events.ts موجود في public/
npx tsx -e "import {ARCHIVE,SFX,MUSIC} from './src/events'; import fs from 'fs'; let m=0; for (const p of [...ARCHIVE.flatMap(a=>[a.src,a.video]).filter(Boolean),...SFX.map(s=>s.src),...MUSIC.map(s=>s.src)]) if(!fs.existsSync('public/'+p)){console.log('MISSING',p);m++}; process.exit(m?1:0)"
npx remotion bundle src/index.ts --out-dir=/tmp/rbundle --log=error
npx remotion still /tmp/rbundle Main out.png --frame=N --scale=0.5 --log=error --timeout=120000   # معاينة 960×540
```
- لقطات على GitHub: `stills.yml` بمدخلات `{composition:"Main", frames:"f1,f2,…", scale:"0.5"}` → artifact يحوي `contact_sheet.jpg`.
- مسح بصري إلزامي: لقطة كل ~10 s للفيلم كله (≈ 60 لقطة) تُجمع في contact sheets وتُعرض على المستخدم قبل طلب إذن الرندر.

## J. الرندر والتسليم
- **الوصول إلى GitHub = bash + curl + git فقط** (لا موصل). التوكن يصل بلصقه في المحادثة → يُحفظ فوراً في `~/.secrets/gh_token` (600) دون طباعة → `GET /user` لاستخراج `login` → `POST /user/repos` لإنشاء المستودع إن لزم (بروتوكول كامل في الملف 00، الفقرة 3).
- **GitHub API**: `POST https://api.github.com/repos/<owner>/<repo>/actions/workflows/render_parallel.yml/dispatches` body `{"ref":"main","inputs":{"composition":"Main","scale":"1","crf":"18","chunks":"20","out_name":"<name>.mp4","reuse_video_run_id":"","reuse_audio_run_id":""}}`؛ headers `Authorization: Bearer $T`, `Accept: application/vnd.github+json`. **لا تُطلق في نفس الأمر مع `git push`** (انتظر وصول الـ commit).
- كل قطعة: `npx remotion render src/index.ts Main out/chunk_i.mp4 --frames=a-b --muted --scale=1 --crf=18 --codec=h264 --concurrency=4 --image-format=jpeg --jpeg-quality=95 --timeout=120000`؛ الصوت: `--codec=wav` بنفس النطاقات؛ runner `ubuntu-latest`, node 20, `timeout-minutes: 300`؛ 20 قطعة ≈ 40 دقيقة لفيلم 9:38.
- **الدمج** (stitch): concat `-c copy` للفيديو والصوت، ثم `ffmpeg -i video_only.mp4 -i audio_full.wav -map 0:v:0 -map 1:a:0 -c:v copy -af apad -t "$VD" -c:a aac -b:a 256k -ar 48000 -movflags +faststart out.mp4` (**ممنوع `-shortest`** — قصّ الذيل في v5.5).
- إعادة استخدام: `reuse_audio_run_id` عندما لم يتغير الصوت (يوفر 20 job)؛ `reuse_video_run_id` لإعادة الدمج فقط.
- **التحقق**: تنزيل artifact `GET /actions/artifacts/<id>/zip` → `curl -L … | funzip > /var/tmp/final/x.mp4`؛ `ffprobe` (ffprobe مدخل واحد لكل استدعاء): `nb_frames == ceil(TOTAL×30)`, `duration ≈ TOTAL`, 1920×1080, h264 + aac؛ لقطة تحقق أخيرة (`ffmpeg -ss … -frames:v 1`).
- **Drive**: `google_drive__initiate_resumable_upload(name, parent, mime video/mp4)` → `python3 scripts/drive_upload.py /var/tmp/final/x.mp4 "<session_uri>"` (قطع 8 MiB مع إعادة المحاولة) → يطبع id؛ طابق الحجم بالبايت؛ ثم `rm -rf /var/tmp/final`. الملفات الصغيرة: `google_drive__upload_file`. القراءة من Drive للنصوص العربية: `make_public` → `curl "https://drive.google.com/uc?export=download&id=ID"` → `make_private` فوراً (أدوات القراءة تعيد unicode مُهرَّباً). `download_file` يفشل > 100 MiB.
- **الاعتمادات**: `CREDITS_AND_LICENSES.md` (مصادر Commons، Natural Earth PD، NASA PD، Kevin MacLeod CC BY 4.0 بالصيغة: *Music: Kevin MacLeod (incompetech.com). Licensed under Creative Commons: By Attribution 4.0 License.*) + سجل تسليم (run id, artifact id, Drive id, bytes).

## K. حدود البيئة (ثوابت لا تُنسى)
RAM 2 GB؛ `/tmp` tmpfs ~1 GB → `/var/tmp`؛ القرص صغير → لا فيديوهات نهائية في `/home/user`؛ كل دور يبدأ من snapshot (تفقد node_modules/Chrome/apt/`/tmp`/`.cache`) → `git fetch https://github.com/<owner>/<repo>.git main && git reset -q --hard FETCH_HEAD` أولاً؛ الدفع: `T=$(cat ~/.secrets/gh_token); git -c user.name=agent -c user.email=agent@arena.local push -q "https://x-access-token:${T}@github.com/<owner>/<repo>.git" HEAD:main 2>&1 | grep -v token`؛ PAT بلا صلاحية Secrets → المسار artifact → sandbox → Drive؛ YAML: `${{ }}` داخل flow mappings يكسر التحليل → block style فقط؛ `npx tsx` يعمل داخل المستودع فقط؛ لا تثبت `tsc` بدون `node_modules`.
