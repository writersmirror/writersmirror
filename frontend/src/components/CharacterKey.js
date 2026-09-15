import React from "react";
import { usePlotto } from "../contexts/PlottoContext";
import { resolveCast, buildAlias, refineAlias } from "../lib/plottoSymbols";

// Shows the "cast" — all character symbols used in the given texts, translated to plain English.
export default function CharacterKey({ texts, alias: overrideAlias, testIdPrefix = "char-key" }) {
  const { characters } = usePlotto();

  if (!texts || !texts.length || !characters.length) return null;

  let alias = overrideAlias;
  if (!alias) {
    alias = refineAlias(buildAlias([]), texts, characters);
  }

  const cast = resolveCast(texts, characters, alias);

  if (!cast.length) return null;

  return (
    <div className="flex flex-wrap gap-2" data-testid={testIdPrefix}>
      {cast.map((c) => (
        <div
          key={c.sym}
          data-testid={`${testIdPrefix}-${c.sym}`}
          className="flex items-center gap-1.5 px-2 py-1 bg-surface border border-line rounded-sm text-xs"
        >
          <span className="font-mono font-medium text-terra">{c.sym}</span>
          <span className="text-ink-muted capitalize">{c.label}</span>
          {c.aka.length > 0 && (
            <span className="text-ink-muted/60 italic">(also {c.aka.join(", ")})</span>
          )}
        </div>
      ))}
    </div>
  );
}
