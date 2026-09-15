// Symbol resolution and plain-English rendering for Plotto character codes.

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildRegex(characters) {
  const syms = characters
    .map((c) => c.designation)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);
  return new RegExp(`(?<![\\w-])(${syms.join("|")})(?![\\w-])`, "g");
}

export function extractSymbols(texts, characters) {
  const regex = buildRegex(characters);
  const found = new Set();
  for (const t of texts) {
    let m;
    regex.lastIndex = 0;
    while ((m = regex.exec(t)) !== null) {
      found.add(m[1]);
    }
  }
  return Array.from(found);
}

function canonical(sym, alias = {}) {
  const seen = new Set();
  while (alias[sym] && !seen.has(sym)) {
    seen.add(sym);
    sym = alias[sym];
  }
  return sym;
}

function describe(sym, map, regex, alias, seen = new Set()) {
  const canon = canonical(sym, alias);
  const desc = map[canon] || canon;
  if (seen.has(canon)) return desc;
  const nextSeen = new Set(seen);
  nextSeen.add(canon);
  let out = "";
  let last = 0;
  let m;
  let guard = 0;
  regex.lastIndex = 0;
  while ((m = regex.exec(desc)) !== null) {
    if (++guard > 50) return desc;
    out += desc.slice(last, m.index);
    const inner = describe(m[1], map, regex, alias, nextSeen);
    // Strip leading article from inner description to avoid "the a mysterious..."
    const cleaned = inner.replace(/^(a |an |the )/i, "");
    out += cleaned;
    last = m.index + m[1].length;
  }
  out += desc.slice(last);
  return out;
}

export function renderPlainEnglish(text, characters, alias = {}) {
  const map = {};
  for (const c of characters) map[c.designation] = c.description;
  const regex = buildRegex(characters);
  let out = "";
  let last = 0;
  let m;
  let guard = 0;
  regex.lastIndex = 0;
  while ((m = regex.exec(text)) !== null) {
    if (++guard > 200) break;
    out += text.slice(last, m.index);
    const desc = describe(m[1], map, regex, alias);
    out += desc;
    last = m.index + m[1].length;
  }
  out += text.slice(last);
  return out;
}

export function resolveCast(texts, characters, alias = {}) {
  const map = {};
  for (const c of characters) map[c.designation] = c.description;
  const regex = buildRegex(characters);
  const symbols = extractSymbols(texts, characters);
  const cast = [];
  for (const sym of symbols) {
    const canon = canonical(sym, alias);
    const label = describe(sym, map, regex, alias);
    const aka = [];
    for (const [k, v] of Object.entries(alias)) {
      if (v === canon && k !== sym) aka.push(k);
    }
    cast.push({ canon, sym, label, aka });
  }
  return cast;
}

export function buildAlias(steps) {
  const alias = {};
  for (const s of steps) {
    for (const t of s.transforms || []) {
      if (t.from && t.to) alias[t.from] = t.to;
    }
  }
  return alias;
}

export function refineAlias(alias, texts, characters) {
  // If both source and target of a transform appear in the same text,
  // the transform would collapse two distinct characters — remove it.
  const refined = { ...alias };
  const regex = buildRegex(characters);
  for (const [from, to] of Object.entries(alias)) {
    for (const text of texts) {
      const syms = new Set();
      let m;
      regex.lastIndex = 0;
      while ((m = regex.exec(text)) !== null) syms.add(m[1]);
      if (syms.has(from) && syms.has(to)) {
        delete refined[from];
        break;
      }
    }
  }
  return refined;
}
