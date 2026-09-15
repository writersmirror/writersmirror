import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, Trash2, ArrowUp, ArrowDown, Save, X, Download, Book } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { usePlotto } from "../contexts/PlottoContext";
import { useBuilder } from "../contexts/BuilderContext";
import ClauseText from "../components/ClauseText";
import CharacterKey from "../components/CharacterKey";
import { renderPlainEnglish, buildAlias, refineAlias } from "../lib/plottoSymbols";
import { stripLeadArticle, transformNote } from "../lib/plottoText";
import { cn } from "../lib/utils";
import { toast } from "sonner";

export default function StoryBuilder() {
  const { user, token } = useAuth();
  const { characters, clauses, categories, loading: plottoLoading } = usePlotto();
  const {
    draft, setField, addConflict, prependConflict, removeConflict, moveConflict,
    updateConflictNote, reset, editingPlotId, setEditingPlotId,
  } = useBuilder();

  // eslint-disable-next-line
  const [detailCache, setDetailCache] = useState({});
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [saveTitle, setSaveTitle] = useState(draft.title || "");
  const [saveFolder, setSaveFolder] = useState(draft.folder || "Unfiled");

  // Drill-down tree state
  const [selectedCat, setSelectedCat] = useState("");
  const [selectedSub, setSelectedSub] = useState("");
  const [selectedHeading, setSelectedHeading] = useState("");
  const [results, setResults] = useState({ items: [], total: 0 });
  const [showAll, setShowAll] = useState(false);

  // Keep save panel in sync with draft
  useEffect(() => {
    setSaveTitle(draft.title || "");
    setSaveFolder(draft.folder || "Unfiled");
  }, [draft.title, draft.folder]);

  // Fetch conflict details for spine items
  const fetchDetail = useCallback(async (id) => {
    if (detailCache[id]) return;
    try {
      const d = await api.getConflict(id);
      setDetailCache((c) => ({ ...c, [id]: d }));
    } catch {}
  }, [detailCache]);

  useEffect(() => {
    draft.conflicts.forEach((c) => fetchDetail(c.id));
  }, [draft.conflicts, fetchDetail]);

  // Fetch results for drill-down
  useEffect(() => {
    if (!selectedHeading) {
      setResults({ items: [], total: 0 });
      return;
    }
    const params = { limit: 60 };
    if (selectedCat) params.category = selectedCat;
    if (selectedSub) params.subcategory = selectedSub;
    if (selectedHeading) params.heading = selectedHeading;
    api.getConflicts(params).then(setResults).catch(() => {});
  }, [selectedCat, selectedSub, selectedHeading]);

  const spineDetails = useMemo(
    () => draft.conflicts.map((c) => detailCache[c.id]).filter(Boolean),
    [draft.conflicts, detailCache]
  );

  const firstId = draft.conflicts[0]?.id;
  const lastId = draft.conflicts[draft.conflicts.length - 1]?.id;
  const firstDetail = firstId ? detailCache[firstId] : null;
  const lastDetail = lastId ? detailCache[lastId] : null;

  const allTexts = useMemo(() => {
    const texts = [];
    if (draft.a_clause) texts.push(draft.a_clause.description);
    if (draft.b_clause) texts.push(draft.b_clause.description);
    if (draft.c_clause) texts.push(draft.c_clause.description);
    spineDetails.forEach((d) => {
      d.permutations.forEach((p) => texts.push(p.description));
    });
    return texts;
  }, [draft.a_clause, draft.b_clause, draft.c_clause, spineDetails]);

  const alias = useMemo(() => {
    const steps = draft.conflicts.map((c) => {
      const d = detailCache[c.id];
      const transforms = [];
      if (d) {
        [...(d.lead_ups || []), ...(d.carry_ons || [])].forEach((g) => {
          g.links.forEach((l) => {
            (l.modifiers || []).forEach((m) => {
              const match = m.match(/^change\s+(\S+)\s+to\s+(\S+)$/i);
              if (match) transforms.push({ from: match[1], to: match[2] });
            });
          });
        });
      }
      return { transforms };
    });
    return refineAlias(buildAlias(steps), allTexts, characters);
  }, [draft.conflicts, detailCache, allTexts, characters]);

  const handleSave = async () => {
    if (!user) {
      toast.info("Sign in to save your story");
      return;
    }
    if (!saveTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }
    const payload = {
      title: saveTitle.trim(),
      folder: saveFolder.trim() || "Unfiled",
      a_clause: draft.a_clause,
      b_clause: draft.b_clause,
      c_clause: draft.c_clause,
      conflicts: draft.conflicts,
      notes: draft.notes,
    };
    try {
      if (editingPlotId) {
        await api.updatePlot(editingPlotId, payload, token);
        toast.success("Story updated");
      } else {
        const res = await api.createPlot(payload, token);
        setEditingPlotId(res.id);
        toast.success("Story saved");
      }
    } catch (err) {
      toast.error("Failed to save: " + err.message);
    }
  };

  const handleExport = () => {
    const lines = [];
    lines.push(`# ${saveTitle || "Untitled Story"}`);
    lines.push("");
    if (draft.a_clause) lines.push(`**Beginning:** ${stripLeadArticle(draft.a_clause.description)}`);
    if (draft.b_clause) lines.push(`**Middle:** ${draft.b_clause.description}`);
    if (draft.c_clause) lines.push(`**Conclusion:** ${draft.c_clause.description}`);
    lines.push("");
    lines.push("## Cast");
    if (characters.length && allTexts.length) {
      const cast = renderPlainEnglish(allTexts.join(" "), characters, alias);
      lines.push(cast);
    }
    lines.push("");
    lines.push("## Story Steps");
    spineDetails.forEach((d, i) => {
      const text = d.permutations.map((p) => p.description).join(" ");
      lines.push(`${i + 1}. ${renderPlainEnglish(text, characters, alias)}`);
    });
    if (draft.notes) {
      lines.push("");
      lines.push("## Notes");
      lines.push(draft.notes);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(saveTitle || "story").replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (plottoLoading) {
    return <div className="p-8 text-ink-muted text-sm">Loading Plotto data...</div>;
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen">
      {/* Left sidebar: drill-down tree + clause pickers */}
      <div className="lg:w-80 border-r border-line-strong bg-surface h-full overflow-y-auto thin-scroll p-5 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs tracking-[0.2em] uppercase text-ink-muted">Story Studio</h2>
          <button
            onClick={reset}
            data-testid="new-story-button"
            className="text-xs text-terra hover:underline"
          >
            New
          </button>
        </div>

        {/* Clause pickers */}
        <div className="space-y-3">
          <ClausePicker label="Beginning (A)" clauses={clauses.a || []} selected={draft.a_clause}
            onSelect={(c) => setField("a_clause", c)} testIdPrefix="a_clause" />
          <ClausePicker label="Middle (B)" clauses={clauses.b || []} selected={draft.b_clause}
            onSelect={(c) => setField("b_clause", c)} testIdPrefix="b_clause" />
          <ClausePicker label="Conclusion (C)" clauses={clauses.c || []} selected={draft.c_clause}
            onSelect={(c) => setField("c_clause", c)} testIdPrefix="c_clause" />
        </div>

        <div className="border-t border-line pt-4">
          <h3 className="text-xs tracking-[0.2em] uppercase text-ink-muted mb-2">Browse Conflicts</h3>
          <DrillDownTree
            categories={categories}
            selectedCat={selectedCat}
            setSelectedCat={(c) => { setSelectedCat(c); setSelectedSub(""); setSelectedHeading(""); }}
            selectedSub={selectedSub}
            setSelectedSub={(s) => { setSelectedSub(s); setSelectedHeading(""); }}
            selectedHeading={selectedHeading}
            setSelectedHeading={setSelectedHeading}
          />
        </div>
      </div>

      {/* Main canvas */}
      <div className="flex-1 overflow-y-auto thin-scroll p-6 drafting-grid">
        {/* Plot point results */}
        {selectedHeading && results.items.length > 0 && (
          <div className="mb-6" data-testid="plot-point-results">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs tracking-[0.2em] uppercase text-ink-muted">
                {showAll ? `All ${results.total} Plot Points` : `Plot Points (${Math.min(6, results.total)} of ${results.total})`}
              </h3>
              {results.total > 6 && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  data-testid="show-all-toggle"
                  className="text-xs text-terra hover:underline"
                >
                  {showAll ? "Show fewer" : `Show all ${results.total}`}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(showAll ? results.items : results.items.slice(0, 6)).map((item, i) => (
                <div
                  key={item.id}
                  data-testid={`plot-point-${i}`}
                  className="bg-surface border border-line-strong rounded-sm shadow-sm hover:shadow-md hover:border-terra hover:-translate-y-0.5 transition-all p-4 cursor-pointer"
                  onClick={() => {
                    addConflict({ id: item.id, summary: item.summary });
                    toast.success("Added to story");
                  }}
                >
                  <ClauseText text={item.summary} className="text-sm text-ink block" />
                  <div className="text-xs text-ink-muted mt-2">{item.subcategory}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Masterplot skeleton */}
        {(draft.a_clause || draft.b_clause || draft.c_clause) && (
          <div className="mb-6 bg-surface border border-line-strong rounded-sm p-5" data-testid="skeleton-preview">
            <h3 className="text-xs tracking-[0.2em] uppercase text-ink-muted mb-3">Masterplot</h3>
            <p className="text-sm text-ink leading-relaxed">
              {draft.a_clause && <span>{stripLeadArticle(draft.a_clause.description)}. </span>}
              {draft.b_clause && <span>{draft.b_clause.description}. </span>}
              {draft.c_clause && <span>{draft.c_clause.description.replace(/\.$/, "")}.</span>}
            </p>
          </div>
        )}

        {/* Story spine */}
        <div data-testid="stepping-view">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs tracking-[0.2em] uppercase text-ink-muted">Story Spine</h3>
            <span className="text-xs text-ink-muted" data-testid="spine-count">
              {draft.conflicts.length} {draft.conflicts.length === 1 ? "step" : "steps"} in your story
            </span>
          </div>

          {draft.conflicts.length === 0 ? (
            <div className="text-center py-12 text-ink-muted text-sm border border-dashed border-line-strong rounded-sm">
              No conflicts yet. Browse the tree on the left or add from the Browse page to start building.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Parent options (lead-ups) for first conflict */}
              {firstDetail && firstDetail.lead_ups && firstDetail.lead_ups.length > 0 &&
                firstDetail.lead_ups.some((g) => g.links.length > 0) && (
                <div data-testid="options-parent">
                  <div className="text-xs tracking-[0.15em] uppercase text-sage mb-2">Story Past — add before beginning</div>
                  {firstDetail.lead_ups.map((g, gi) =>
                    g.links.map((link, li) => {
                      const ordinal = gi + li + 1;
                      return (
                        <button
                          key={`${gi}-${li}`}
                          data-testid={`parent-option-${ordinal}`}
                          onClick={() => {
                            prependConflict({ id: link.ref, summary: link.label, transforms: [] });
                            toast.success("Prepended to story");
                          }}
                          className="w-full text-left bg-surface/80 hover:bg-surface border border-line-strong rounded-sm p-3 mb-2 hover:border-terra transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-xs font-medium bg-sage/15 text-sage rounded-sm">{ordinal}</span>
                            <div className="flex-1">
                              <ClauseText text={link.label} className="text-sm text-ink block" />
                              {link.modifiers && link.modifiers.length > 0 && (
                                <div className="text-xs text-ink-muted mt-1">
                                  {link.modifiers.map((m) => transformNote(m, characters)).join("; ")}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Spine nodes */}
              {draft.conflicts.map((c, i) => {
                const detail = detailCache[c.id];
                const summary = detail?.permutations?.[0]?.description || c.summary;
                return (
                  <div
                    key={`${c.id}-${i}`}
                    data-testid={`spine-node-${i}`}
                    className="bg-surface border-l-4 border-terra shadow-sm rounded-sm p-5"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-sm font-heading bg-terra/10 text-terra rounded-sm">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <ClauseText text={summary} className="text-sm text-ink leading-relaxed block" />
                        {detail && detail.lead_ups && detail.carry_ons && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {detail.lead_ups.flatMap((g) => g.links).flatMap((l) => l.modifiers || []).map((m, mi) => (
                              <span key={mi} className="text-xs px-2 py-0.5 bg-sage/10 text-sage border border-sage/20 rounded-sm">
                                {transformNote(m, characters)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveConflict(i, -1)}
                          data-testid={`spine-up-${i}`}
                          className="p-1 text-ink-muted hover:text-terra transition-colors"
                          disabled={i === 0}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          onClick={() => moveConflict(i, 1)}
                          data-testid={`spine-down-${i}`}
                          className="p-1 text-ink-muted hover:text-terra transition-colors"
                          disabled={i === draft.conflicts.length - 1}
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          onClick={() => removeConflict(i)}
                          data-testid={`spine-remove-${i}`}
                          className="p-1 text-ink-muted hover:text-error transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Child options (carry-ons) for last conflict */}
              {lastDetail && lastDetail.carry_ons && lastDetail.carry_ons.length > 0 &&
                lastDetail.carry_ons.some((g) => g.links.length > 0) && (
                <div data-testid="options-child">
                  <div className="text-xs tracking-[0.15em] uppercase text-sage mb-2">Story Future — add after ending</div>
                  {lastDetail.carry_ons.map((g, gi) =>
                    g.links.map((link, li) => {
                      const ordinal = gi + li + 1;
                      return (
                        <button
                          key={`${gi}-${li}`}
                          data-testid={`child-option-${ordinal}`}
                          onClick={() => {
                            addConflict({ id: link.ref, summary: link.label, transforms: [] });
                            toast.success("Appended to story");
                          }}
                          className="w-full text-left bg-surface/80 hover:bg-surface border border-line-strong rounded-sm p-3 mb-2 hover:border-terra transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-xs font-medium bg-sage/15 text-sage rounded-sm">{ordinal}</span>
                            <div className="flex-1">
                              <ClauseText text={link.label} className="text-sm text-ink block" />
                              {link.modifiers && link.modifiers.length > 0 && (
                                <div className="text-xs text-ink-muted mt-1">
                                  {link.modifiers.map((m) => transformNote(m, characters)).join("; ")}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Character key */}
        {allTexts.length > 0 && characters.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs tracking-[0.2em] uppercase text-ink-muted mb-3">Character Key</h3>
            <CharacterKey texts={allTexts} alias={alias} testIdPrefix="cast-key" />
          </div>
        )}

        {/* Plain English presentation */}
        {spineDetails.length > 0 && (
          <div className="mt-6 bg-surface border border-line-strong rounded-sm p-5" data-testid="final-presentation">
            <h3 className="text-xs tracking-[0.2em] uppercase text-ink-muted mb-3">Your Story in Plain English</h3>
            {draft.a_clause && (
              <div className="mb-2" data-testid="present-beginning">
                <span className="text-xs text-terra font-medium">Beginning · </span>
                <span className="text-sm text-ink">{renderPlainEnglish(stripLeadArticle(draft.a_clause.description), characters, alias)}</span>
              </div>
            )}
            {spineDetails.map((d, i) => {
              const text = d.permutations.map((p) => p.description).join(" ");
              return (
                <div key={i} className="mb-2" data-testid={`present-step-${d.id}`}>
                  <span className="text-xs text-terra font-medium">Step {i + 1} · </span>
                  <span className="text-sm text-ink">{renderPlainEnglish(text, characters, alias)}</span>
                </div>
              );
            })}
            {draft.c_clause && (
              <div className="mb-2" data-testid="present-conclusion">
                <span className="text-xs text-terra font-medium">Conclusion · </span>
                <span className="text-sm text-ink">{renderPlainEnglish(draft.c_clause.description, characters, alias)}</span>
              </div>
            )}
            {!draft.c_clause && (
              <div className="mb-2" data-testid="present-no-conclusion">
                <span className="text-xs text-ink-muted italic">No conclusion clause selected yet.</span>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="mt-6">
          <label className="block text-xs tracking-[0.2em] uppercase text-ink-muted mb-2">Notes</label>
          <textarea
            value={draft.notes}
            onChange={(e) => setField("notes", e.target.value)}
            placeholder="Add your story notes..."
            rows={3}
            data-testid="builder-notes"
            className="w-full px-3 py-2 bg-surface border border-line-strong rounded-sm text-sm focus:outline-none focus:border-terra transition-colors resize-y"
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 mt-6 pb-6">
          <button
            onClick={() => setShowSavePanel(!showSavePanel)}
            data-testid="process-steps-button"
            className="flex items-center gap-2 px-4 py-2 text-sm bg-terra text-white rounded-sm hover:bg-terra/90 transition-colors"
          >
            <Save size={14} /> Save Story
          </button>
          <button
            onClick={handleExport}
            data-testid="export-story-button"
            className="flex items-center gap-2 px-4 py-2 text-sm border border-line-strong text-ink rounded-sm hover:border-terra transition-colors"
          >
            <Download size={14} /> Export
          </button>
          <Link
            to="/browse"
            className="flex items-center gap-2 px-4 py-2 text-sm border border-line-strong text-ink rounded-sm hover:border-terra transition-colors"
          >
            <Book size={14} /> Browse More
          </Link>
        </div>

        {/* Save panel */}
        {showSavePanel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setShowSavePanel(false)}>
            <div
              data-testid="process-steps-review"
              className="bg-surface border border-line-strong rounded-sm shadow-lg p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-heading uppercase tracking-tight text-ink">Save Story</h3>
                <button onClick={() => setShowSavePanel(false)} className="text-ink-muted hover:text-terra">
                  <X size={18} />
                </button>
              </div>

              {user ? (
                <>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs tracking-[0.15em] uppercase text-ink-muted mb-1.5">Title</label>
                      <input
                        type="text"
                        value={saveTitle}
                        onChange={(e) => setSaveTitle(e.target.value)}
                        data-testid="review-title-input"
                        className="w-full px-3 py-2 border border-line-strong rounded-sm text-sm focus:outline-none focus:border-terra"
                      />
                    </div>
                    <div>
                      <label className="block text-xs tracking-[0.15em] uppercase text-ink-muted mb-1.5">Folder</label>
                      <input
                        type="text"
                        value={saveFolder}
                        onChange={(e) => setSaveFolder(e.target.value)}
                        data-testid="review-folder-input"
                        className="w-full px-3 py-2 border border-line-strong rounded-sm text-sm focus:outline-none focus:border-terra"
                      />
                    </div>
                  </div>

                  {/* Cast */}
                  {allTexts.length > 0 && (
                    <div className="mt-4">
                      <label className="block text-xs tracking-[0.15em] uppercase text-ink-muted mb-2">Cast</label>
                      <div data-testid="review-cast">
                        <CharacterKey texts={allTexts} alias={alias} testIdPrefix="review-cast-key" />
                      </div>
                    </div>
                  )}

                  {/* Steps */}
                  <div className="mt-4">
                    <label className="block text-xs tracking-[0.15em] uppercase text-ink-muted mb-2">Story Steps</label>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto thin-scroll">
                      {spineDetails.map((d, i) => (
                        <div key={i} data-testid={`review-step-${i}`} className="text-xs text-ink">
                          <span className="text-terra font-medium">{i + 1}.</span>{" "}
                          {renderPlainEnglish(d.permutations.map((p) => p.description).join(" "), characters, alias)}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    data-testid="review-save-button"
                    className="w-full mt-5 py-2.5 bg-terra text-white text-sm font-medium rounded-sm hover:bg-terra/90 transition-colors"
                  >
                    {editingPlotId ? "Update Story" : "Save Story"}
                  </button>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-ink-muted mb-4">Sign in to save your story to your library.</p>
                  <Link
                    to="/login"
                    data-testid="review-signin-button"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-terra text-white rounded-sm hover:bg-terra/90 transition-colors"
                  >
                    Sign In
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ClausePicker({ label, clauses, selected, onSelect, testIdPrefix }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        data-testid={`clause-picker-${testIdPrefix}`}
        className="w-full flex items-center justify-between text-xs tracking-[0.15em] uppercase text-ink-muted hover:text-terra transition-colors"
      >
        {label}
        <ChevronDown size={12} className={cn("transition-transform", open ? "" : "-rotate-90")} />
      </button>
      {open && (
        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto thin-scroll">
          {clauses.map((c) => (
            <button
              key={c.number}
              data-testid={`use-clause-${testIdPrefix}-${c.number}`}
              onClick={() => {
                onSelect(selected?.number === c.number ? null : c);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-2 py-1.5 text-xs rounded-sm transition-colors",
                selected?.number === c.number
                  ? "text-terra bg-terra/10 font-medium"
                  : "text-ink-muted hover:text-ink hover:bg-line/50"
              )}
            >
              {c.description}
            </button>
          ))}
        </div>
      )}
      {selected && (
        <div className="mt-1 text-xs text-ink bg-terra/5 border border-terra/20 rounded-sm px-2 py-1">
          {selected.description}
        </div>
      )}
    </div>
  );
}

function DrillDownTree({ categories, selectedCat, setSelectedCat, selectedSub, setSelectedSub, selectedHeading, setSelectedHeading }) {
  return (
    <div className="flex flex-col gap-1">
      {categories.map((cat) => (
        <div key={cat.category}>
          <button
            data-testid={`tree-group-${cat.category}`}
            onClick={() => setSelectedCat(selectedCat === cat.category ? "" : cat.category)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm transition-colors text-left",
              selectedCat === cat.category
                ? "text-terra font-medium bg-terra/10"
                : "text-ink-muted hover:text-ink hover:bg-line/50"
            )}
          >
            <ChevronRight size={10} className={selectedCat === cat.category ? "rotate-90 transition-transform" : "transition-transform"} />
            <span className="flex-1">{cat.category}</span>
            <span className="text-ink-muted/60">{cat.count}</span>
          </button>
          {selectedCat === cat.category && cat.subcategories.map((sub) => (
            <div key={sub.name} className="ml-4">
              <button
                data-testid={`tree-sub-${sub.name}`}
                onClick={() => setSelectedSub(selectedSub === sub.name ? "" : sub.name)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1 text-xs rounded-sm transition-colors text-left",
                  selectedSub === sub.name
                    ? "text-terra font-medium bg-terra/10"
                    : "text-ink-muted hover:text-ink hover:bg-line/50"
                )}
              >
                <ChevronRight size={10} className={selectedSub === sub.name ? "rotate-90 transition-transform" : "transition-transform"} />
                <span className="flex-1">{sub.name}</span>
                <span className="text-ink-muted/60">{sub.count}</span>
              </button>
              {selectedSub === sub.name && sub.headings.map((h) => (
                <button
                  key={h.name}
                  data-testid={`tree-heading-${h.name}`}
                  onClick={() => setSelectedHeading(selectedHeading === h.name ? "" : h.name)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1 ml-4 text-xs rounded-sm transition-colors text-left",
                    selectedHeading === h.name
                      ? "text-terra font-medium bg-terra/10"
                      : "text-ink-muted hover:text-ink hover:bg-line/50"
                  )}
                >
                  <span className="flex-1 truncate">{h.name}</span>
                  <span className="text-ink-muted/60">{h.count}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
