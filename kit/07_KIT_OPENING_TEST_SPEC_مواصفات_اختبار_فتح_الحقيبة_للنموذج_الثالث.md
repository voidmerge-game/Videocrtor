# 🧪 07 — مواصفات "اختبار فتح الحقيبة" (Benchmark Test Project) للنموذج الثالث

**الهدف**: فيديو واحد قصير (90–120 s) **بموضوع جديد** يُشغّل **كل** أدوات الحقيبة وقواعدها، ليتحقق المستخدم بعينه أن النموذج الثالث أتقن المحرك بنفس الجودة. لا يُنسخ أي نص/صورة/مقطع من فيلم أفريقيا.

---

## 1. الموضوع الافتراضي (إن لم يحدد المستخدم غيره)
**"The Unification of Italy, 1815–1871"** — مثالي لأن: كيانات ما قبل الوحدة = اتحادات مباشرة لوحدات Natural Earth admin-1، تتوفر أرشيف PD (صور 1860s + أفلام Lumière 1896)، وفيه 5 قوى بأعلام مميزة، وأحداث قابلة للتثبيت على كلمات (Solferino 1859, Expedition of the Thousand 1860, Rome 1870).
بدائل مقبولة بنفس الهيكل: *The Balkan Wars 1912–1913*، *The Partitions of Poland 1772–1795*، *The Meiji Expansion 1868–1910*.

## 2. متغيرات الحلقة للاختبار (جاهزة للتنفيذ)
- **REGION**: `{lon0: -8, lon1: 30, lat0: 33, lat1: 52}` → بلاطات Blue Marble **B1 + C1** فقط؛ `make_earth_v6.py` بـ `LON0=-8, LON1=30, LAT0=33, LAT1=52, PPD=60` → `earth_region.jpg` 2280×1140؛ عدّل `REGION` و`CLOUDS_HD` في `EarthGlobe.tsx` بنفس القيم.
- **القوى (`Power`) وألوان التعبئة فوق القمر الصناعي** (أضفها إلى `theme.ts`/`POWER_FILL`/`FlagSvg`):
  `sardinia #6f93a8` (علم: tricolore أخضر-أبيض-أحمر + درع سافوي أحمر بصليب أبيض في الوسط)، `austria #8c8a7a` (أسود-أصفر أفقي)، `papal #d9c27a` (أصفر-أبيض عمودي)، `twosicilies #b47a70` (أبيض بإطار أحمر وذهبي)، `france #4f6f9a` (tricolore أزرق-أبيض-أحمر)، `duchies #86a06c` (توسكانا/بارما/مودينا)، `independent #cdb38a` (سان مارينو). أزل قوى أفريقيا غير المستعملة أو اتركها بلا استعمال.
- **حقبتان من TopoJSON** (`scripts/build_italy_1815.py` و`build_italy_1871.py` وفق قالب الملف 05 §3):
  - `italy_1815.json` (كائن `w1815`): `Kingdom of Sardinia` = Piemonte + Liguria + Valle d'Aosta + Sardegna + (فرنسا: Savoie, Haute-Savoie, Alpes-Maritimes)؛ `Lombardy–Venetia` = Lombardia + Veneto + Friuli-Venezia Giulia (Udine, Pordenone)؛ `Duchy of Parma` = Parma + Piacenza؛ `Duchy of Modena` = Modena + Reggio nell'Emilia + Massa-Carrara؛ `Grand Duchy of Tuscany` = Toscana − Massa-Carrara؛ `Papal States` = Lazio + Umbria + Marche + Bologna + Ferrara + Ravenna + Forlì-Cesena + Rimini؛ `Kingdom of the Two Sicilies` = Abruzzo + Molise + Campania + Puglia + Basilicata + Calabria + Sicilia؛ `Austrian Empire` (أطراف) = النمسا + Slovenia + Croatia (Istria/Dalmatia) مقصوصة بـ box(8,43,20,50)؛ `France` = admin-0 مقصوص بـ box(-8,41,9,52) ناقص Savoie/Nice؛ `San Marino`.
  - `italy_1871.json` (كائن `w1871`): `Kingdom of Italy` = كل إيطاليا الحديثة − (Trentino-Alto Adige, Trieste, Gorizia)؛ `Austria-Hungary`؛ `France` (مع Savoie/Nice)؛ `San Marino`.
  - بعد البناء: `npx tsx scripts/geo2topo.ts && npx tsx scripts/label_fit.ts`؛ حدّث `FILES` في `qa_check.ts` إلى `{'1815': ['italy_1815','w1815'], '1871': ['italy_1871','w1871']}`.
- **السكربت**: 6 فقرات (S1_01, S1_02, S2_01, S2_02, S3_01, S3_02)، 45–65 كلمة لكل، إنجليزية أمريكية، كلمات مفصلية مذكورة صراحة: *Vienna, Sardinia, Piedmont, Austria, Lombardy, Venetia, Papal States, Two Sicilies, Cavour, Solferino, Garibaldi, Thousand, Marsala, Naples, Rome, 1870*؛ اقتباس واحد `[QUOTE Massimo d'Azeglio: "We have made Italy; now we must make Italians." 1861]` قبل S3_02 (BEFORE 6.5 s).
  إجمالي VO ≈ 70–85 s → مع `COLD_OPEN` (يُقصَّر للاختبار إلى `quote 5, title 7`) و`OUTRO {card 4, credits 8}` تكون المدة الكلية 100–115 s.
- **الأحداث الدنيا الإلزامية** (تختبر كل مكوّن):
  | مكوّن | الحد الأدنى في الاختبار |
  |---|---|
  | أسماء كيانات `BIG` بـ `fitKey` | ≥ 7 (Sardinia, Lombardy–Venetia, Tuscany, Papal States, Two Sicilies, Austrian Empire, Kingdom of Italy) — **كلها داخل حدودها** |
  | أعلام `FLAGS_RAW` | ≥ 5 (Turin/sardinia، Milan/austria، Florence/duchies، Rome/papal، Naples/twosicilies) + علم `sardinia` ينتقل إلى كل إقليم عند ضمّه |
  | كشف `ACQ` من نقطة | Lombardy (من Solferino 10.56E 45.37N, dur 2.0)، Tuscany/Duchies (من Florence)، Two Sicilies (من Marsala 12.44E 37.80N, dur 3.0)، Papal States (من Rome 12.48E 41.89N, dur 1.6) |
  | `ROUTES` | حملة الألف: Quarto (8.99, 44.39) → Marsala (12.44, 37.80) → Palermo → Naples، GOLD، drawDur 2.2، head |
  | `PULSES` | Solferino, Calatafimi (12.86, 37.91), Porta Pia (12.51, 41.91) |
  | `CITIES` | Turin, Milan, Venice, Florence, Rome, Naples, Palermo (عواصم بنجمة) |
  | `CALLOUTS` | ≥ 2 (Solferino 24 June 1859; Rome 20 Sept 1870) |
  | `ARCHIVE` صور 2.5D | ≥ 3 (Cavour — portrait; Garibaldi — Alinari c.1866; Victor Emmanuel II) PD من Commons |
  | `ARCHIVE` فيلم | ≥ 1 مقطع PD (مثل Lumière 1896: Venice Grand Canal أو Rome) 8.5 s 960 px + poster |
  | `TableArchive` (طاولة) | ≥ 1 بطاقة `wall: true` مع `sign: 'REGNO D’ITALIA'` وجارتين jpg موجودتين |
  | `QUOTES` | 1 (d'Azeglio) مع drone |
  | `YEARS` + شريط | 1815 → 1859 → 1860 → 1861 → 1866 → 1870 (tick عند كل تغيير) |
  | `ShareChart` | "ITALY IN 1871 — POPULATION BY PRE-UNIFICATION STATE" أو مساحة الكيانات المحسوبة كروياً من `italy_1815.json` |
  | `Title3D` | "THE UNIFICATION OF ITALY" / "1815–1871" |
  | الكاميرا | ≥ 14 مفتاحاً: كرة 440 → إيطاليا ppd 24 → Turin 60 → Lombardy 46 → Sicily 55 → Naples 60 → Rome 66 → إيطاليا 28 → كرة 440 |
  | الموسيقى | 2–3 مقاطع MacLeod (مثلاً `Virtutes Instrumenti` افتتاح/ختام، `Lightless Dawn` وسط) بالقيم الثابتة |
  | SFX | thud لكل علم، tick لكل سنة، hit عند "Rome"، whoosh للعنوان |

## 3. خطوات التنفيذ (بعد "ابدأ")
1. استنساخ المستودع المرجعي → فرع/مستودع `kit-test-italy`؛ طقس git؛ `npm ci`.
2. سكربت → `vo_chunks.json` → `add_voice` (إن لم يوجد voice_id) → `generate_speech` × 6 → Whisper → `paragraphs.json` → `ALIAS` (توقع: *Cavour → "cavore"*, *Solferino*, *Garibaldi*, *Marsala*).
3. تنزيل NE admin-1 + admin-0 → `build_italy_1815.py`/`1871` → geo2topo → label_fit.
4. Blue Marble B1+C1 + GRAY + clouds + night → `make_earth_v6.py` (REGION الجديد) — على GitHub Actions أو sandbox بـ memmap؛ ارفع الخامات إلى المستودع (Git LFS غير مطلوب: < 25 MB لكل ملف).
5. أرشيف Commons (PD) + مقطع فيلم + posters + `credits.json`.
6. `events.ts` جديد بالكامل + `theme.ts` (القوى/الأعلام) + `timeline.ts` (`COLD_OPEN {quote:5,title:7}`, `OUTRO {card:4, credits:8}`).
7. `preflight.sh` (tsc, label_fit, **qa_check 0.1 = 0**, assets 0 missing, print_times).
8. لقطات: 12 إطاراً حرجاً + مسح كل 5 s → contact sheets → **عرض على المستخدم**.
9. بعد إذن صريح ثانٍ: `render_parallel` بـ `chunks: "6"`, `crf: "18"`, `out_name: "KIT_TEST_Italy_1080p.mp4"`.
10. تحقق ffprobe + لقطة من الملف النهائي → Drive (`google_drive__upload_file` يكفي إن كان < 100 MiB، وإلا resumable) → `CREDITS_AND_LICENSES_KIT_TEST.md` → تقرير.

## 4. معايير القبول (Pass/Fail)
| معيار | قيمة النجاح |
|---|---|
| `qa_check.ts 0.1` | `0 violations` (ويُرفق الناتج النصي) |
| أصول مفقودة | 0 |
| الدقة/الإطارات | 1920×1080، 30 fps، `nb_frames == ceil(TOTAL×30)`، h264 crf 18، aac 256k 48 kHz |
| مدة الصوت vs الفيديو | فرق ≤ 0.05 s |
| الأسماء | 100% داخل حدودها في **كل** إطار (بالعين على اللقطات أيضاً) |
| التداخل | 0 بين اسم/علم/مدينة/بطاقة/شارة/شريط/مخطط |
| الحدود | من NE admin-1/0 فقط؛ لا مضلع ≤ 40 رأساً لكيان رئيسي |
| الحركة | الكاميرا لا تثبت > 3 s إلا أثناء الاقتباس؛ كل انتقال 1.0–2.4 s؛ ضبابية حركة فقط `moveBlur` |
| الأرشيف | ≥ 1 فيلم حقيقي + ≥ 3 صور 2.5D + 1 طاولة، كلها PD/CC0 موثقة |
| الصوت | VO 1.0، موسيقى مُخفّضة 0.5 تحت الكلام، thud/tick/hit/whoosh/drone في مواضعها |
| الانضباط | خطة قبل التنفيذ، لقطات قبل الرندر، إذن صريح للرندر، تقرير عربي نهائي |

## 5. التقرير الإلزامي من النموذج الثالث (بالعربية، ≤ 20 سطراً)
1. رابط/ID الفيديو على Drive + الحجم بالبايت + المدة + عدد الإطارات. 2. ناتج `qa_check` (عينات / رسوم أسماء / 0). 3. قائمة الكيانات والأعلام والمقاطع المستخدمة ومصادرها. 4. 3 لقطات: اسم منحنٍ داخل حدوده، علم يهبط مع بطاقة فيلم، الطاولة. 5. الانحرافات عن هذه المواصفة (إن وُجدت) وسببها. 6. ما استهلكه من أدوار/وقت.

## 6. ما يعتبر فشلاً فورياً للاختبار
اسم واحد خارج حدوده أو يلمسها؛ تداخل واحد؛ خريطة مسطحة أو حدود خشنة؛ لا فيلم أرشيفي؛ رندر أُطلق بلا إذن؛ أي صورة من فيلم أفريقيا أعيد استخدامها؛ أي ادعاء بلا ناتج فاحص مرفق.
