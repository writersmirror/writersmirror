// Text helpers: strip reference numbers, gloss transforms, role labels.

// Strip Plotto cross-reference numbers embedded in prose (e.g., "A does X (112) and Y")
// but keep genuine story numbers ($500,000, "9 o'clock").
export function stripRefNumbers(text) {
  if (!text) return "";
  // Remove [n] style markers
  let out = text.replace(/\[(\d+[a-z]?)\]/g, "");
  // Remove parenthetical cross-references that are purely a conflict id
  out = out.replace(/\((\d+[a-z]?)\)/g, (match, inner) => {
    if (/^\d+[a-z]?$/.test(inner)) return "";
    return match;
  });
  return out;
}

// Strip leading "A " / "B " / "C " article from clause descriptions
export function stripLeadArticle(text) {
  if (!text) return "";
  return text.replace(/^[ABC]\s+/, "");
}

// Translate a modifier string to plain English
// "change A to A-3" -> "becomes the male rival or enemy of A"
export function transformNote(modifier, characters) {
  const map = {};
  for (const c of characters) map[c.designation] = c.description;
  const m = modifier.match(/^change\s+(\S+)\s+to\s+(\S+)$/i);
  if (!m) return modifier;
  const [, from, to] = m;
  const fromDesc = map[from] || from;
  const toDesc = map[to] || to;
  return `${fromDesc} becomes ${toDesc}`;
}

// Gloss a list of modifiers into readable notes
export function transformNotes(modifiers, characters) {
  if (!modifiers || !modifiers.length) return [];
  return modifiers.map((m) => transformNote(m, characters));
}

// Role label for a symbol (plain English, first-letter capitalized)
export function roleLabel(sym, characters) {
  const map = {};
  for (const c of characters) map[c.designation] = c.description;
  const desc = map[sym] || sym;
  return desc.charAt(0).toUpperCase() + desc.slice(1);
}
