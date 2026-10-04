// Automatic DOM translator.
// Translates any visible English text (text nodes, placeholders, titles,
// aria-labels) that was not already translated via t(), using the phrase
// dictionary. Original English text is remembered so switching back to
// English restores everything exactly.
import PHRASES from './i18nPhrases';

const LANGS = ['mr', 'hi'];
// Numbers / bed codes are treated as placeholders (e.g. "Floor 2" matches "Floor 1").
const NUM_RE = /(?<![A-Za-z0-9])(?:B\d{3}|\d+(?:[.,:]\d+)*)(?![A-Za-z0-9])/g;

const MONTHS = {
  mr: { jan: 'जानेवारी', feb: 'फेब्रुवारी', mar: 'मार्च', apr: 'एप्रिल', may: 'मे', jun: 'जून', jul: 'जुलै', aug: 'ऑगस्ट', sep: 'सप्टेंबर', sept: 'सप्टेंबर', oct: 'ऑक्टोबर', nov: 'नोव्हेंबर', dec: 'डिसेंबर' },
  hi: { jan: 'जनवरी', feb: 'फ़रवरी', mar: 'मार्च', apr: 'अप्रैल', may: 'मई', jun: 'जून', jul: 'जुलाई', aug: 'अगस्त', sep: 'सितंबर', sept: 'सितंबर', oct: 'अक्टूबर', nov: 'नवंबर', dec: 'दिसंबर' }
};
const DAYS = {
  mr: { sun: 'रविवार', mon: 'सोमवार', tue: 'मंगळवार', wed: 'बुधवार', thu: 'गुरुवार', fri: 'शुक्रवार', sat: 'शनिवार' },
  hi: { sun: 'रविवार', mon: 'सोमवार', tue: 'मंगलवार', wed: 'बुधवार', thu: 'गुरुवार', fri: 'शुक्रवार', sat: 'शनिवार' }
};
const SMALL_WORDS = {
  mr: { am: 'सकाळी', pm: 'सायं', to: 'ते', night: 'रात्र', nights: 'रात्री', bed: 'बेड', beds: 'बेड', floor: 'मजला', today: 'आज', tomorrow: 'उद्या' },
  hi: { am: 'पूर्वाह्न', pm: 'अपराह्न', to: 'से', night: 'रात', nights: 'रातें', bed: 'बेड', beds: 'बेड', floor: 'मंज़िल', today: 'आज', tomorrow: 'कल' }
};

const collapse = (s) => s.replace(/\s+/g, ' ').trim();

const normalize = (s) => {
  const nums = [];
  const key = collapse(s).replace(NUM_RE, (m) => { nums.push(m); return `{${nums.length - 1}}`; });
  return { key, nums };
};

// Build lookup tables
const TABLE = { mr: new Map(), hi: new Map() };
const TABLE_LC = { mr: new Map(), hi: new Map() };

const addEntry = (en, mr, hi) => {
  const { key, nums } = normalize(en);
  [['mr', mr], ['hi', hi]].forEach(([lang, val]) => {
    if (!val) return;
    const used = new Set();
    const tpl = collapse(val).replace(NUM_RE, (m) => {
      const idx = nums.findIndex((n, i) => n === m && !used.has(i));
      if (idx === -1) return m;
      used.add(idx);
      return `{${idx}}`;
    });
    if (!TABLE[lang].has(key)) TABLE[lang].set(key, tpl);
    const lc = key.toLowerCase();
    if (!TABLE_LC[lang].has(lc)) TABLE_LC[lang].set(lc, tpl);
  });
};

PHRASES.forEach(([en, mr, hi]) => {
  addEntry(en, mr, hi);
  // Enum variants: "PENDING_PAYMENT" also matches "PENDING PAYMENT" / "Pending Payment"
  if (/^[A-Z0-9_]+$/.test(en) && en.includes('_')) addEntry(en.replace(/_/g, ' '), mr, hi);
});

/** Register extra phrases at runtime (e.g. from the key-based dictionary). */
export const registerPhrase = (en, mr, hi) => {
  if (typeof en !== 'string' || !/[A-Za-z]/.test(en)) return;
  const { key } = normalize(en);
  if (TABLE.mr.has(key) && TABLE.hi.has(key)) return;
  addEntry(en, mr, hi);
};

const fill = (tpl, nums) => tpl.replace(/\{(\d+)\}/g, (_, i) => (nums[+i] !== undefined ? nums[+i] : ''));

const lookupCore = (core, lang) => {
  const { key, nums } = normalize(core);
  let tpl = TABLE[lang].get(key);
  if (tpl === undefined) tpl = TABLE_LC[lang].get(key.toLowerCase());
  return tpl === undefined ? null : fill(tpl, nums);
};

// Dates / times like "4 Oct 2026", "Sun, 4 Oct", "10:30 AM"
const tokenTranslate = (core, lang) => {
  const words = core.match(/[A-Za-z]+/g);
  if (!words) return null;
  const months = MONTHS[lang], days = DAYS[lang], small = SMALL_WORDS[lang];
  const map = (w) => {
    const lw = w.toLowerCase();
    if (months[lw]) return months[lw];
    if (lw.length > 3 && months[lw.slice(0, 3)] && /^(january|february|march|april|june|july|august|september|october|november|december)$/.test(lw)) return months[lw.slice(0, 3)];
    if (days[lw.slice(0, 3)] && /^(sun|mon|tue|wed|thu|fri|sat)(day|sday|nesday|rsday|urday)?$/.test(lw)) return days[lw.slice(0, 3)];
    if (small[lw]) return small[lw];
    return null;
  };
  if (!words.every((w) => map(w) !== null)) return null;
  // Require at least one month/day/time token so we don't mangle free text
  if (!words.some((w) => { const lw = w.toLowerCase(); return months[lw.slice(0, 3)] || days[lw.slice(0, 3)] || lw === 'am' || lw === 'pm'; })) return null;
  return core.replace(/[A-Za-z]+/g, (w) => map(w));
};

const translateCore = (core, lang, depth = 0) => {
  if (!/[A-Za-z]/.test(core)) return null;
  let r = lookupCore(core, lang);
  if (r !== null) return r;

  // Strip decorative prefix/suffix (icons, bullets, colons, asterisks, arrows)
  const m = core.match(/^([^A-Za-z0-9₹]*)(.*?)([\s:*•→←.…!?|,;–—-]*)$/s);
  if (m && (m[1] || m[3]) && m[2]) {
    r = lookupCore(m[2], lang);
    if (r === null && m[3]) r = lookupCore(m[2] + m[3].trim(), lang);
    if (r !== null) return m[1] + r + m[3];
  }

  r = tokenTranslate(core, lang);
  if (r !== null) return r;

  // Split on separators and translate each part
  if (depth < 2) {
    const parts = core.split(/(\s[•|·—–→/]\s|\s-\s|:\s)/);
    if (parts.length > 1) {
      let any = false, ok = true;
      const out = parts.map((p, i) => {
        if (i % 2 === 1 || !/[A-Za-z]/.test(p)) return p;
        const t = translateCore(p.trim(), lang, depth + 1);
        if (t === null) { ok = false; return p; }
        any = true;
        return p.replace(p.trim(), t);
      });
      if (any && ok) return out.join('');
    }
  }
  return null;
};

/** Translate an arbitrary English string. Returns null when not found. */
export const translatePhrase = (text, lang) => {
  if (!text || !LANGS.includes(lang)) return null;
  const lead = text.match(/^\s*/)[0];
  const trail = text.match(/\s*$/)[0];
  const core = text.trim();
  if (!core) return null;
  const r = translateCore(core, lang);
  return r === null ? null : lead + r + trail;
};

// ───────────── DOM observer ─────────────
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
const SKIP_SELECTOR = 'script, style, textarea, code, pre, noscript, [data-no-translate], .lang-selector-group';
const textState = new WeakMap(); // Text node -> { orig, out }
const attrState = new WeakMap(); // Element -> { [attr]: { orig, out } }
let currentLang = 'en';
let observer = null;

const isSkipped = (el) => !el || (el.closest && el.closest(SKIP_SELECTOR));

const processText = (node) => {
  const parent = node.parentElement;
  if (!parent || isSkipped(parent) || parent.isContentEditable) return;
  const cur = node.nodeValue;
  const rec = textState.get(node);
  const orig = rec && cur === rec.out ? rec.orig : cur;
  if (!/[A-Za-z]/.test(orig)) { textState.delete(node); return; }
  // Keep <option> values stable when their value comes from text content
  if (parent.tagName === 'OPTION' && !parent.hasAttribute('value')) parent.setAttribute('value', orig.trim());
  const out = currentLang === 'en' ? orig : (translatePhrase(orig, currentLang) ?? orig);
  textState.set(node, { orig, out });
  if (cur !== out) node.nodeValue = out;
};

const processAttrs = (el) => {
  if (isSkipped(el)) return;
  let st = attrState.get(el);
  ATTRS.forEach((a) => {
    if (!el.hasAttribute(a)) return;
    const cur = el.getAttribute(a);
    const rec = st && st[a];
    const orig = rec && cur === rec.out ? rec.orig : cur;
    if (!/[A-Za-z]/.test(orig)) return;
    const out = currentLang === 'en' ? orig : (translatePhrase(orig, currentLang) ?? orig);
    if (!st) { st = {}; attrState.set(el, st); }
    st[a] = { orig, out };
    if (cur !== out) el.setAttribute(a, out);
  });
};

const processTree = (root) => {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) { processText(root); return; }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  if (isSkipped(root)) return;
  processAttrs(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n = walker.nextNode();
  while (n) {
    if (n.nodeType === Node.TEXT_NODE) processText(n);
    else processAttrs(n);
    n = walker.nextNode();
  }
};

const handleMutations = (mutations) => {
  for (const m of mutations) {
    if (m.type === 'characterData') processText(m.target);
    else if (m.type === 'attributes') processAttrs(m.target);
    else m.addedNodes.forEach(processTree);
  }
  // Discard records generated by our own edits
  if (observer) observer.takeRecords();
};

export const applyAutoTranslate = (lang) => {
  currentLang = lang;
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  if (!observer) {
    observer = new MutationObserver(handleMutations);
    observer.observe(document.body, {
      subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: ATTRS
    });
    // Translate native alert/confirm dialogs too
    const wrap = (fn) => (msg, ...rest) => fn.call(window, typeof msg === 'string' ? (translatePhrase(msg, currentLang) ?? msg) : msg, ...rest);
    window.alert = wrap(window.alert);
    window.confirm = wrap(window.confirm);
  }
  processTree(document.body);
  observer.takeRecords();
};
