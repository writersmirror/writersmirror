import React from "react";
import { usePlotto } from "../contexts/PlottoContext";
import { buildRegex } from "../lib/plottoSymbols";
import { stripRefNumbers } from "../lib/plottoText";

// Renders conflict/clause text with character symbols highlighted as chips.
export default function ClauseText({ text, className = "" }) {
  const { characters } = usePlotto();
  const cleaned = stripRefNumbers(text || "");

  if (!characters.length) return <span className={className}>{cleaned}</span>;

  const regex = buildRegex(characters);
  const parts = [];
  let last = 0;
  let m;
  let guard = 0;
  regex.lastIndex = 0;
  while ((m = regex.exec(cleaned)) !== null) {
    if (++guard > 200) break;
    if (m.index > last) parts.push(cleaned.slice(last, m.index));
    parts.push(m[1]);
    last = m.index + m[1].length;
  }
  if (last < cleaned.length) parts.push(cleaned.slice(last));

  return (
    <span className={className}>
      {parts.map((part, i) => {
        const char = characters.find((c) => c.designation === part);
        if (char) {
          return (
            <span
              key={i}
              title={char.description}
              className="inline-flex items-center px-1.5 py-0.5 mx-0.5 text-xs font-mono bg-terra/10 text-terra border border-terra/20 rounded font-mono"
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
