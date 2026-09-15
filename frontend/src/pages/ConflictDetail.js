import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  Plus,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { usePlotto } from "../contexts/PlottoContext";
import { useBuilder } from "../contexts/BuilderContext";
import ClauseText from "../components/ClauseText";
import CharacterKey from "../components/CharacterKey";
import { transformNote } from "../lib/plottoText";

import { toast } from "sonner";

export default function ConflictDetail() {
  const { id } = useParams();

  // FIX: user এবং token দুটোই AuthContext থেকে নেওয়া হচ্ছে
  const { user, token } = useAuth();

  const { characters } = usePlotto();
  const { addConflict } = useBuilder();

  const [conflict, setConflict] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    setLoading(true);

    api
      .getConflict(id)
      .then((data) => setConflict(data))
      .catch(() => toast.error("Failed to load conflict"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user || !token) return;

    api
      .getBookmarks(token)
      .then((docs) => {
        setBookmarked(docs.some((d) => d.conflict_id === id));
      })
      .catch(() => {});
  }, [user, token, id]);

  const toggleBookmark = async () => {
    if (!user) {
      toast.info("Sign in to bookmark");
      return;
    }

    if (bookmarked) {
      try {
        await api.removeBookmark(id, token);
        setBookmarked(false);
      } catch {
        toast.error("Failed");
      }
    } else {
      try {
        await api.addBookmark(id, token);
        setBookmarked(true);
      } catch {
        toast.error("Failed");
      }
    }
  };

  if (loading) {
    return <div className="p-8 text-ink-muted text-sm">Loading...</div>;
  }

  if (!conflict) {
    return (
      <div className="p-8 text-ink-muted">
        Conflict not found.
      </div>
    );
  }

  const allTexts = [
    ...conflict.permutations.map((p) => p.description),
    ...(conflict.lead_ups || []).flatMap((g) =>
      g.links.map((l) => l.label || "")
    ),
    ...(conflict.carry_ons || []).flatMap((g) =>
      g.links.map((l) => l.label || "")
    ),
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        to="/browse"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-terra transition-colors mb-6"
      >
        <ArrowLeft size={14} /> Back to Browse
      </Link>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-ink-muted mb-3">
        <span className="tracking-[0.15em] uppercase">
          {conflict.category}
        </span>

        <ChevronRight size={10} />

        <span>{conflict.subcategory}</span>

        {conflict.b_heading && (
          <>
            <ChevronRight size={10} />
            <span className="truncate">{conflict.b_heading}</span>
          </>
        )}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-heading tracking-tight text-ink">
          Conflict Detail
        </h1>

        <div className="flex gap-2">
          <button
            onClick={toggleBookmark}
            data-testid="detail-bookmark-button"
            className="p-2 border border-line-strong rounded-sm hover:border-terra transition-colors"
          >
            {bookmarked ? (
              <BookmarkCheck size={18} className="text-terra" />
            ) : (
              <Bookmark size={18} />
            )}
          </button>

          <button
            onClick={() => {
              addConflict({
                id: conflict.id,
                summary:
                  conflict.permutations[0]?.description || "",
              });

              toast.success("Added to Story Studio");
            }}
            data-testid="detail-add-to-builder"
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-terra text-white rounded-sm hover:bg-terra/90 transition-colors"
          >
            <Plus size={14} /> Add to Story
          </button>
        </div>
      </div>

      {/* Flags */}
      <div className="flex gap-2 mb-4">
        {conflict.is_beginning && (
          <span className="px-2 py-1 text-xs bg-sage/15 text-sage border border-sage/30 rounded-sm">
            Natural Beginning
          </span>
        )}

        {conflict.is_ending && (
          <span className="px-2 py-1 text-xs bg-sage/15 text-sage border border-sage/30 rounded-sm">
            Natural Conclusion
          </span>
        )}
      </div>

      {/* Permutations */}
      <div className="mb-8">
        <h2 className="text-xs tracking-[0.2em] uppercase text-ink-muted mb-3">
          Permutations
        </h2>

        <div className="space-y-3">
          {conflict.permutations.map((p) => (
            <div
              key={p.number}
              data-testid={`permutation-${p.number}`}
              className="bg-surface border border-line-strong rounded-sm p-4"
            >
              <div className="text-xs text-ink-muted mb-1">
                Part {p.number}
              </div>

              <ClauseText
                text={p.description}
                className="text-sm leading-relaxed text-ink block"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Lead-ups (Parent situations) */}
      <div className="mb-8">
        <h2 className="text-xs tracking-[0.2em] uppercase text-ink-muted mb-3">
          Parent Situations · Lead-ups (
          {conflict.lead_ups.reduce(
            (n, g) => n + g.links.length,
            0
          )}
          )
        </h2>

        {conflict.lead_ups.length === 0 ||
        conflict.lead_ups.every(
          (g) => g.links.length === 0
        ) ? (
          <p
            className="text-sm text-ink-muted italic"
            data-testid="no-lead-ups"
          >
            This conflict has no lead-ups — it is a natural
            story beginning.
          </p>
        ) : (
          <div className="space-y-2">
            {conflict.lead_ups.map((group, gi) =>
              group.links.map((link, li) => {
                const ordinal = gi + li + 1;

                return (
                  <Link
                    key={`${gi}-${li}`}
                    to={`/conflict/${link.ref}`}
                    data-testid={`ref-link-${link.ref}`}
                    className="block bg-surface border border-line-strong rounded-sm p-3 hover:border-terra transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-xs font-medium bg-terra/10 text-terra rounded-sm">
                        {ordinal}
                      </span>

                      <div className="flex-1 min-w-0">
                        <ClauseText
                          text={link.label}
                          className="text-sm text-ink block"
                        />

                        <div className="flex items-center gap-2 mt-1">
                          {link.starts_story && (
                            <span className="text-xs text-sage">
                              · story beginning
                            </span>
                          )}

                          {link.leads_to_end && (
                            <span className="text-xs text-sage">
                              · possible ending
                            </span>
                          )}

                          {link.modifiers &&
                            link.modifiers.length > 0 && (
                              <span className="text-xs text-ink-muted">
                                ·{" "}
                                {link.modifiers
                                  .map((m) =>
                                    transformNote(
                                      m,
                                      characters
                                    )
                                  )
                                  .join("; ")}
                              </span>
                            )}
                        </div>
                      </div>

                      <ChevronRight
                        size={14}
                        className="text-ink-muted group-hover:text-terra transition-colors"
                      />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Carry-ons (Child situations) */}
      <div className="mb-8">
        <h2 className="text-xs tracking-[0.2em] uppercase text-ink-muted mb-3">
          Child Situations · Carry-ons (
          {conflict.carry_ons.reduce(
            (n, g) => n + g.links.length,
            0
          )}
          )
        </h2>

        {conflict.carry_ons.length === 0 ||
        conflict.carry_ons.every(
          (g) => g.links.length === 0
        ) ? (
          <p
            className="text-sm text-ink-muted italic"
            data-testid="no-carry-ons"
          >
            This conflict has no carry-ons — it is a natural
            story conclusion.
          </p>
        ) : (
          <div className="space-y-2">
            {conflict.carry_ons.map((group, gi) =>
              group.links.map((link, li) => {
                const ordinal = gi + li + 1;

                return (
                  <Link
                    key={`${gi}-${li}`}
                    to={`/conflict/${link.ref}`}
                    data-testid={`ref-link-${link.ref}`}
                    className="block bg-surface border border-line-strong rounded-sm p-3 hover:border-terra transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-xs font-medium bg-terra/10 text-terra rounded-sm">
                        {ordinal}
                      </span>

                      <div className="flex-1 min-w-0">
                        <ClauseText
                          text={link.label}
                          className="text-sm text-ink block"
                        />

                        <div className="flex items-center gap-2 mt-1">
                          {link.starts_story && (
                            <span className="text-xs text-sage">
                              · story beginning
                            </span>
                          )}

                          {link.leads_to_end && (
                            <span className="text-xs text-sage">
                              · possible ending
                            </span>
                          )}

                          {link.modifiers &&
                            link.modifiers.length > 0 && (
                              <span className="text-xs text-ink-muted">
                                ·{" "}
                                {link.modifiers
                                  .map((m) =>
                                    transformNote(
                                      m,
                                      characters
                                    )
                                  )
                                  .join("; ")}
                              </span>
                            )}
                        </div>
                      </div>

                      <ChevronRight
                        size={14}
                        className="text-ink-muted group-hover:text-terra transition-colors"
                      />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Suggested connections */}
      {conflict.suggested_connections &&
        conflict.suggested_connections.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs tracking-[0.2em] uppercase text-ink-muted mb-3">
              You Might Also Jump To
            </h2>

            <div
              className="space-y-2"
              data-testid="suggested-connections"
            >
              {conflict.suggested_connections.map((s, i) => (
                <Link
                  key={s.ref}
                  to={`/conflict/${s.ref}`}
                  data-testid={`suggested-link-${s.ref}`}
                  className="block bg-surface border border-line rounded-sm p-3 hover:border-terra transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-xs font-medium bg-sage/15 text-sage rounded-sm">
                      {i + 1}
                    </span>

                    <div className="flex-1">
                      <ClauseText
                        text={s.label}
                        className="text-sm text-ink block"
                      />

                      {s.shared_themes &&
                        s.shared_themes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {s.shared_themes
                              .slice(0, 5)
                              .map((t) => (
                                <span
                                  key={t}
                                  className="text-xs px-1.5 py-0.5 bg-line/60 text-ink-muted rounded-sm"
                                >
                                  {t}
                                </span>
                              ))}
                          </div>
                        )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      {/* Character key */}
      <div className="mb-8">
        <h2 className="text-xs tracking-[0.2em] uppercase text-ink-muted mb-3">
          Character Key
        </h2>

        <CharacterKey
          texts={allTexts}
          testIdPrefix="character-key"
        />
      </div>
    </div>
  );
}