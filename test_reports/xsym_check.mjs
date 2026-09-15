import fs from "fs";
const src = fs.readFileSync("/app/frontend/src/lib/plottoSymbols.js", "utf8");
fs.writeFileSync("/tmp/ps.mjs", src);
const mod = await import("/tmp/ps.mjs");
const data = JSON.parse(fs.readFileSync("/app/backend/data/plotto.json", "utf8"));
const chars = data.characters;
const texts = [
  "A falls in love with B, and renounces wealth which he was to inherit by marrying BX.",
  "A seeks to buy an object, X, from B, an object he greatly desires. B will not sell.",
  "B invents a wholly imaginary lover, AX; and a man of AX’s name presents himself.",
];
for (const t of texts) {
  console.log("IN :", t);
  console.log("OUT:", mod.renderPlainEnglish(t, chars, {}));
}
console.log("CAST:", JSON.stringify(mod.resolveCast(texts, chars, {})));
console.log("SYMS:", JSON.stringify(mod.extractSymbols(texts, chars)));
