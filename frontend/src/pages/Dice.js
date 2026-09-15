import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Dice5, RefreshCw, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { useBuilder } from "../contexts/BuilderContext";
import ClauseText from "../components/ClauseText";
import { toast } from "sonner";

export default function Dice() {
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState(false);
  const navigate = useNavigate();
  const { setField, addConflict } = useBuilder();

  const roll = useCallback(async () => {
    setRolling(true);
    try {
      const data = await api.getRandomPlot();
      setSuggestion(data);
    } catch {
      toast.error("Failed to roll the dice");
    } finally {
      setRolling(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => { roll(); }, [roll]);

  const sendToBuilder = () => {
    if (!suggestion) return;
    setField("a_clause", suggestion.a_clause);
    setField("b_clause", suggestion.b_clause);
    setField("c_clause", suggestion.c_clause);
    addConflict({
      id: suggestion.conflict.id,
      summary: suggestion.conflict.summary,
    });
    toast.success("Sent to Story Studio");
    navigate("/builder");
  };

  if (loading) {
    return <div className="p-8 text-ink-muted text-sm">Rolling the dice...</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-heading uppercase tracking-tight text-ink mb-2">
          Roll the Dice
        </h1>
        <p className="text-sm text-ink-muted">
          A random plot suggestion from the Plotto system
        </p>
      </div>

      {suggestion && (
        <div
          data-testid="dice-suggestion"
          className="bg-surface border border-line-strong rounded-sm shadow-sm p-8 mb-6"
        >
          {/* A/B/C Clauses */}
          <div className="space-y-4 mb-6">
            <div>
              <div className="text-xs tracking-[0.2em] uppercase text-ink-muted mb-1">Beginning (A)</div>
              <p className="text-lg text-ink font-body">
                {suggestion.a_clause.description}
              </p>
            </div>
            <div>
              <div className="text-xs tracking-[0.2em] uppercase text-ink-muted mb-1">Middle (B)</div>
              <p className="text-lg text-ink font-body">
                {suggestion.b_clause.description}
              </p>
            </div>
            <div>
              <div className="text-xs tracking-[0.2em] uppercase text-ink-muted mb-1">Conclusion (C)</div>
              <p className="text-lg text-ink font-body">
                {suggestion.c_clause.description}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-line my-6" />

          {/* Suggested conflict */}
          <div>
            <div className="text-xs tracking-[0.2em] uppercase text-ink-muted mb-2">Opening Conflict</div>
            <Link
              to={`/conflict/${suggestion.conflict.id}`}
              data-testid="dice-conflict-link"
              className="block bg-paper border border-line rounded-sm p-4 hover:border-terra transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs tracking-[0.15em] uppercase text-ink-muted">
                  {suggestion.conflict.category}
                </span>
                <span className="text-xs text-ink-muted">·</span>
                <span className="text-xs text-ink-muted">{suggestion.conflict.subcategory}</span>
              </div>
              <ClauseText
                text={suggestion.conflict.summary}
                className="text-sm leading-relaxed text-ink block"
              />
            </Link>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={roll}
          disabled={rolling}
          data-testid="roll-dice-button"
          className="flex items-center gap-2 px-6 py-3 text-sm bg-terra text-white rounded-sm hover:bg-terra/90 transition-colors disabled:opacity-50"
        >
          {rolling ? <RefreshCw size={16} className="animate-spin" /> : <Dice5 size={16} />}
          {rolling ? "Rolling..." : "Roll Again"}
        </button>
        {suggestion && (
          <button
            onClick={sendToBuilder}
            data-testid="dice-to-builder"
            className="flex items-center gap-2 px-6 py-3 text-sm border border-line-strong text-ink rounded-sm hover:border-terra hover:text-terra transition-colors"
          >
            <ArrowRight size={16} /> Open in Builder
          </button>
        )}
      </div>
    </div>
  );
}
