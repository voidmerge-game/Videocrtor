# 🔊 04 — هندسة الصوت والتوقيت والمزامنة (Audio, Timing & Sync)

المصدر: `src/timeline.ts`, `src/events.ts (SFX, MUSIC)`, `src/Main.tsx` (l.270–300), `public/audio/vo/paragraphs.json`.

---

## 1. مبدأ المحرك: **الصوت أولاً، ثم يُبنى الزمن منه**
لا يوجد "timeline يدوي". المدة الحقيقية لكل ملف VO هي التي تحدد موضع كل شيء:
```
FIRST_VO = COLD_OPEN.quote (11.0) + COLD_OPEN.title (12.0) = 23.0 s
start(p_i) = start(p_{i-1}) + duration(p_{i-1}) + (نفس المشهد ? GAP_PARA 0.9 : GAP_SCENE 1.7) + BEFORE[p_i]
BEFORE = {S3_02: 7.5 (اقتباس ليوبولد), S5_01: 6.5 (بسمارك), S7_01: 7.5 (منليك)}   # صمت لبطاقات الاقتباس
END_VO = start(last) + duration(last)
TOTAL  = END_VO + 1.5 + OUTRO.card 9.0 + OUTRO.credits 16.0     # v6.1: 577.633 s → 17329 إطاراً
```
- `P(id)` يعيد الفقرة؛ `E(id) = start + duration`؛ `SCENE_START[scene]`.
- **`T(id, word?, nth=1)`**: الزمن المطلق لنطق الكلمة رقم nth المطابقة (`norm = lowercase, strip non [a-z0-9]`, مع `ALIAS` للأسماء المُحرَّفة)؛ إن لم تُوجد → بداية الفقرة + تحذير في console. كل حدث بصري في `events.ts` يُكتب بـ `T()`/`E()` فقط — **لا أرقام مطلقة** (باستثناء العنوان والخاتمة).

## 2. التعليق الصوتي (VO)
- 8 مشاهد × ~4 فقرات = 32 ملفاً `public/audio/vo/p/S{n}_{k}.mp3` (15–22 s لكل منها؛ S1_01 = 18.68 s).
- توليد: `generate_speech(voice_id, text, file_path)`: نص ≤ 1500 حرف، **بلا أسطر فارغة**، 10 ملفات/دور. الصوت: أمريكي، روائي، سرعة طبيعية (~150 كلمة/دقيقة ≈ 800–900 حرف/دقيقة).
- في Remotion: `<Sequence from={round(start×fps)} durationInFrames={round((duration+0.3)×fps)}><Audio src={staticFile(file)} volume={1}/></Sequence>` — VO دائماً بحجم 1 (المرجع الأعلى).
- مزامنة Whisper (`small.en`, `word_timestamps=True`) → `words[{w,s,e}]` نسبية لبداية الملف؛ `T()` يضيف `start`.
- **فحص النطق**: استمع (أو افحص نص Whisper) لكل اسم علم؛ أعد توليد الفقرة إن أخطأ الصوت؛ أضف التحريف إلى `ALIAS`.

## 3. الموسيقى (Kevin MacLeod — incompetech.com — CC BY 4.0)
- التنزيل: `https://incompetech.com/music/royalty-free/mp3-royaltyfree/<Name%20With%20Spaces>.mp3` → `public/audio/music/<Name_With_Underscores>.mp3`.
- المقاطع المستخدمة وخريطة المزاج: `Virtutes Instrumenti` (افتتاح ملحمي + الختام)، `Lightless Dawn` (توتر/استكشاف S2–S4)، `Impact Lento` (التقسيم S5)، `Long Note Two` (المقاومة S6)، `Dark Times` (الفظائع S7)، `Private Reflection` (الخاتمة S8).
- البنية `Music = {src, t, until, gain, fadeIn, fadeOut, offset}`؛ القيم الفعلية: gain **0.45–0.6**، fadeIn **2–4 s**، fadeOut **3–4 s**، تبدأ قبل أول فقرة بالمشهد بـ 1 s (6 s قبل اقتباس بسمارك) وتنتهي بعد آخر فقرة بـ 1–7 s؛ تداخل مقطعين = cross-fade طبيعي.
- **دالة الحجم في الرندر**:
  `volume(f) = gain × fi × fo × duck × 0.9` حيث `fi = prog(fadeIn)`, `fo = 1 − prog(fadeOut)`, `duck = voActive(t) ? 0.5 : 1` (voActive تنظر إلى الأمام ~0.3 s حتى لا يُقطع أول مقطع كلامي). يُكتب كـ `<Audio volume={(f)=>…}/>` داخل `Sequence`.
- قاعدة "غير مزعجة": لا قمم ميلودية تحت الكلام؛ لا أكثر من مقطع واحد مسموع (gain > 0.2) في اللحظة الواحدة باستثناء cross-fade ≤ 4 s.

## 4. المؤثرات الصوتية (SFX — مُولَّدة إجرائياً، بلا حقوق)
الملفات `public/audio/sfx/{drone,hit,ink,key,thud,tick,whoosh}.wav` (48 kHz mono 16-bit). وصفة التوليد (numpy) في الملف `05` §6. المواضع الثابتة في المحرك (`SFX` في `events.ts`):
| مؤثر | متى | vol |
|---|---|---|
| `drone` | 0.2 s (افتتاح)؛ وبداية كل اقتباس (عدا الأول) | 0.5 / 0.35 |
| `whoosh` | `quote − 0.3`, `quote + 0.7` (العنوان)؛ `T('S8_03','Then')` (قفزة الزمن) | 0.5 / 0.35 / 0.4 |
| `hit` | `quote + 1.2` (ضربة العنوان)؛ كلمات مفصلية (`'destroys'`, `'90'`)؛ `END_VO + 1.5` | 0.6 / 0.5 / 0.45 / 0.6 |
| `thud` | **كل علم** `f.t + 0.12`؛ كل مطبوعة طاولة `a.t + 0.25` | 0.35 / 0.25 |
| `tick` | كل تغيير سنة في `YEARS` (عدا الأولى و`TODAY`) | 0.18 |
| `ink` / `key` | كشف الأقاليم الكبيرة / الكتابة على الآلة (اختياري) | 0.3 |
- الرندر: `<Sequence from={round(t×fps)} durationInFrames={6.5×fps}><Audio src volume={vol ?? 0.5}/></Sequence>`.

## 5. قواعد المزيج النهائي
- VO = 1.0 (المرجع)؛ الموسيقى الفعلية تحت الكلام ≈ 0.2–0.27 (gain×0.5×0.9)؛ SFX ≤ 0.6 ولا يتزامن اثنان من نوع `hit` خلال 2 s.
- الصوت يُرندر داخل Remotion نفسه (`--codec=wav` لكل قطعة بنفس نطاقات الإطارات) → concat → AAC 256 kbps 48 kHz في stitch مع `-af apad -t <مدة الفيديو>` (مطابقة طول دقيقة؛ **لا `-shortest`**).
- عدد قطع الصوت قد يختلف عن الفيديو عند `reuse_audio_run_id` → الـ stitch يقرأ **كل** `audio_*` بالترتيب الرقمي.

## 6. التحقق الزمني (إلزامي قبل الرندر)
```bash
npx tsx scripts/print_times.ts      # يطبع start/end لكل فقرة + SCENE_START + TOTAL
# تأكد: لا فقرة تبدأ قبل نهاية سابقتها؛ كل T() المستخدمة لا تطبع تحذير "word not found";
# مدة الموسيقى تغطي 100% من 0 → TOTAL بلا فجوات صامتة > 2 s (باستثناء ما قبل العنوان)
```
- بعد الرندر: `ffprobe` → `duration(video) == duration(audio)` ± 0.05 s، و`nb_frames == ceil(TOTAL×30)`.

## 7. ثوابت المحرك مقابل متغيرات الحلقة
| ثابت (لا يتغير) | متغير (لكل موضوع) |
|---|---|
| `COLD_OPEN 11+12`, `GAP_PARA 0.9`, `GAP_SCENE 1.7`, `OUTRO 9+16`, `+1.5` قبل الخاتمة | نصوص الفقرات، عددها، `BEFORE` للاقتباسات الجديدة |
| ducking 0.5، معامل 0.9، fade 2–4 s، VO = 1 | اختيار مقاطع MacLeod ومواضعها وgain (0.45–0.6) |
| ملفات SFX السبعة وأحجامها وقاعدة thud/tick | أي كلمات مفصلية إضافية لـ `hit` |
| Whisper `small.en` + `T()` | جدول `ALIAS` الجديد |
| `voice_id` نفس الصوت طوال الفيلم | — |
