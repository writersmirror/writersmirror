// Reproduce infinite loop in renderPlainEnglish using the real module source
import { renderPlainEnglish, resolveCast } from "/app/frontend/src/lib/plottoSymbols.js";

const chars = [
  { designation: "A", description: "male protagonist" },
  { designation: "B", description: "female protagonist" },
  { designation: "F-A", description: "father of A" },
  { designation: "BX", description: "a woman unknown to A" },
];

const t = setTimeout(() => {
  console.log("TIMEOUT: renderPlainEnglish did not return in 5s -> INFINITE LOOP");
  process.exit(3);
}, 5000);
// unref so a hot loop can't be interrupted; instead run in try
t.unref?.();

console.log("calling renderPlainEnglish on simple text...");
const out = renderPlainEnglish("A, of humble birth, falls in love with aristocratic B.", chars, {});
clearTimeout(t);
console.log("OUT:", out.slice(0, 300));
console.log("LEN:", out.length);
