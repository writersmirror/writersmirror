import { renderPlainEnglish, resolveCast, buildAlias, refineAlias } from "/app/frontend/src/lib/plottoSymbols.js";
import https from "node:https";

const BASE = "https://story-builder-248.preview.emergentagent.com";
function get(p) {
  return new Promise((res, rej) => {
    https.get(BASE + p, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej);
  });
}
const leaks = (t) => [...new Set((t.match(/(?<![\w-])(F-A|M-A|M-B|F-B|BX|AX|CX|A-\d+|B-\d+|A|B|C)(?![\w-])/g) || []))];

const chars = await get("/api/plotto/characters");

// --- scenario 1: nested symbols (#117)
const c117 = await get("/api/plotto/conflicts/117");
const s117 = c117.permutations?.[0]?.description || c117.summary;
const out117 = renderPlainEnglish(s117, chars, {});
console.log("\n[1] #117 raw:", s117);
console.log("[1] rendered:", out117);
console.log("[1] leaks:", leaks(out117));
console.log("[1] cast:", resolveCast([s117], chars, {}).map((c) => `${c.canon}=${c.label}${c.aka.length ? " aka " + c.aka : ""}`));

// --- scenario 3: transform collapse #1106 (B->A) + #1b
const steps = [
  { id: "1106", summary: "B, of a poor family, is adopted by wealthy A-9.", transforms: [{ from: "B", to: "A" }] },
  { id: "1b", summary: "A, of humble birth, falls in love with aristocratic B.", transforms: [] },
];
const texts = steps.map((s) => s.summary);
const alias = refineAlias(buildAlias(steps), texts, chars);
console.log("\n[3] raw alias:", buildAlias(steps), "refined:", alias);
steps.forEach((s) => console.log(`[3] #${s.id}:`, renderPlainEnglish(s.summary, chars, alias)));
console.log("[3] cast:", resolveCast(texts, chars, alias).map((c) => `${c.canon}=${c.label}`));

// --- scenario 4: transform that SHOULD apply (no co-occurrence)
const steps4 = [
  { id: "x1", summary: "B is in love with a man she has never seen.", transforms: [] },
  { id: "x2", summary: "BX marries the man of her dreams.", transforms: [{ from: "B", to: "BX" }] },
];
const t4 = steps4.map((s) => s.summary);
const alias4 = refineAlias(buildAlias(steps4), t4, chars);
console.log("\n[4] alias:", alias4);
steps4.forEach((s) => console.log(`[4] #${s.id}:`, renderPlainEnglish(s.summary, chars, alias4)));
console.log("[4] cast:", resolveCast(t4, chars, alias4).map((c) => `${c.canon}=${c.label} aka ${c.aka}`));

// --- scenario 2: A-clause stripLead
const clauses = await get("/api/plotto/clauses");
const list = clauses.a_clauses || clauses.a || clauses;
const stripLead = (s) => (s || "").replace(/^[ABC]\s+/, "");
(Array.isArray(list) ? list : []).slice(0, 40).forEach((cl) => {
  if (/married person|person in love/i.test(cl.description || "")) {
    console.log("\n[2] clause:", JSON.stringify(cl.description), "=>", renderPlainEnglish(stripLead(cl.description), chars, {}));
  }
});
