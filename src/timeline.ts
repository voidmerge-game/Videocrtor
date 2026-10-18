/**
 * Film timeline: paragraph placement (from real narration durations) + helpers to
 * anchor visual events to spoken words. All times in SECONDS (absolute).
 */
import paragraphsRaw from '../public/audio/vo/paragraphs.json';

export type Word = {w: string; s: number; e: number};
export type Para = {id: string; file: string; duration: number; text: string; words: Word[]; start: number};

const GAP_PARA = 0.9;
const GAP_SCENE = 1.7;

// Silent beats inserted BEFORE a given paragraph id (quote cards etc.)
const BEFORE: Record<string, number> = {
  S1_01: 0, // set by COLD_OPEN below
  S3_02: 7.5, // Leopold quote
  S5_01: 6.5, // Bismarck quote
  S7_01: 7.5, // Menelik quote
};

export const COLD_OPEN = {quote: 11.0, title: 12.0}; // seconds
export const FIRST_VO = COLD_OPEN.quote + COLD_OPEN.title;

export const PARAS: Para[] = (() => {
  let t = FIRST_VO;
  const out: Para[] = [];
  let prevScene = '';
  (paragraphsRaw as any[]).forEach((p) => {
    const scene = p.id.split('_')[0];
    if (out.length) t += scene === prevScene ? GAP_PARA : GAP_SCENE;
    t += BEFORE[p.id] ?? 0;
    out.push({id: p.id, file: p.file, duration: p.duration, text: p.text, words: p.words, start: t});
    t += p.duration;
    prevScene = scene;
  });
  return out;
})();

export const P = (id: string): Para => {
  const p = PARAS.find((x) => x.id === id);
  if (!p) throw new Error('no para ' + id);
  return p;
};
export const END_VO = (() => {
  const l = PARAS[PARAS.length - 1];
  return l.start + l.duration;
})();

export const OUTRO = {card: 9.0, credits: 16.0};
export const TOTAL = END_VO + 1.5 + OUTRO.card + OUTRO.credits;

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '');

/** absolute time (s) when `word` is spoken in paragraph `id` (nth occurrence). Falls back to para start. */
// spellings produced by the speech aligner for proper nouns
const ALIAS: Record<string, string> = {
  kamerun: 'cameroon', omdurman: 'amdurman', asante: 'assante', oases: 'oasis', fashoda: 'fashota',
  isandlwana: 'isindalwana', khartoum: 'cartoom', herero: 'herrero', morel: 'morrell',
};
export const T = (id: string, word?: string, nth = 1): number => {
  const p = P(id);
  if (!word) return p.start;
  let target = norm(word);
  const has = (tg: string) => p.words.some((w) => norm(w.w).startsWith(tg) || (tg.startsWith(norm(w.w)) && norm(w.w).length > 3));
  if (!has(target) && ALIAS[target]) target = ALIAS[target];
  let k = 0;
  for (const w of p.words) {
    if (norm(w.w).startsWith(target) || target.startsWith(norm(w.w)) && norm(w.w).length > 3) {
      k++;
      if (k === nth) return p.start + w.s;
    }
  }
  console.warn('word not found', id, word);
  return p.start;
};
/** end of paragraph */
export const E = (id: string) => P(id).start + P(id).duration;

/** is narration active at time t (for music ducking) */
export const voActive = (t: number) => PARAS.some((p) => t >= p.start - 0.15 && t <= p.start + p.duration + 0.25);

// ---- Scene boundaries (for camera & year badge) ----
export const SCENE_START = (n: number) => P(`S${n}_01`).start;
