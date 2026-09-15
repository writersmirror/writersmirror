import { renderPlainEnglish, resolveCast, buildAlias, refineAlias } from "/app/frontend/src/lib/plottoSymbols.js";

const BASE = "https://story-builder-248.preview.emergentagent.com";
const res = await fetch(`${BASE}/api/plotto/characters`);
const data = await res.json();
const chars = Array.isArray(data) ? data : (data.items || data.characters);
console.log("chars count:", chars.length);
console.log(chars.slice(0, 8).map((c) => `${c.designation} = ${c.description}`).join("\n"));

const text =
  "A, a wanderer, is left a fortune by F-A, his father, in case he can be found and will marry BX. a woman he has never seen.";

console.time("render");
const out = renderPlainEnglish(text, chars, {});
console.timeEnd("render");
console.log("OUT:", out);

console.time("cast");
const cast = resolveCast([text], chars, {});
console.timeEnd("cast");
console.log("CAST:", JSON.stringify(cast));
