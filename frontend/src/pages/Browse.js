import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, Bookmark, BookmarkCheck, ChevronRight, ChevronDown } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { usePlotto } from "../contexts/PlottoContext";
import { useBuilder } from "../contexts/BuilderContext";
import ClauseText from "../components/ClauseText";
import { cn } from "../lib/utils";
import { toast } from "sonner";

export default function Browse() {
  const { categories } = usePlotto();
  const { user, token } = useAuth();
  const { addConflict } = useBuilder();

  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [selectedSub, setSelectedSub] = useState("");
  const [selectedHeading, setSelectedHeading] = useState("");
  const [expandedCats, setExpandedCats] = useState({});
  const [expandedSubs, setExpandedSubs] = useState({});
  const [results, setResults] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bookmarks, setBookmarks] = useState(new Set());

  // Load bookmarks
  useEffect(() => {
    if (!user || !token) return;
    api.getBookmarks(token).then((docs) => {
      setBookmarks(new Set(docs.map((d) => d.conflict_id)));
    }).catch(() => {});
  }, [user, token]);

  // Fetch conflicts
  const fetchConflicts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 24 };
      if (search) params.search = search;
      if (selectedCat) params.category = selectedCat;
      if (selectedSub) params.subcategory = selectedSub;
      if (selectedHeading) params.heading = selectedHeading;
      const data = await api.getConflicts(params);
      setResults(data);
    } catch (err) {
      toast.error("Failed to load conflicts");
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedCat, selectedSub, selectedHeading]);

  useEffect(() => {
    const timer = setTimeout(fetchConflicts, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchConflicts]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, selectedCat, selectedSub, selectedHeading]);

  const toggleBookmark = async (conflictId) => {
    if (!user) {
      toast.info("Sign in to bookmark conflicts");
      return;
    }
    if (bookmarks.has(conflictId)) {
      try {
        await api.removeBookmark(conflictId, token);
        setBookmarks((s) => { const n = new Set(s); n.delete(conflictId); return n; });
      } catch { toast.error("Failed to remove bookmark"); }
    } else {
      try {
        await api.addBookmark(conflictId, token);
        setBookmarks((s) => new Set(s).add(conflictId));
      } catch { toast.error("Failed to add bookmark"); }
    }
  };

  const selectCategory = (cat) => {
    if (selectedCat === cat) {
      setSelectedCat("");
      setSelectedSub("");
      setSelectedHeading("");
    } else {
      setSelectedCat(cat);
      setSelectedSub("");
      setSelectedHeading("");
    }
  };

  const selectSub = (sub) => {
    if (selectedSub === sub) {
      setSelectedSub("");
      setSelectedHeading("");
    } else {
      setSelectedSub(sub);
      setSelectedHeading("");
    }
  };

  const breadcrumb = [selectedCat, selectedSub, selectedHeading].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col lg:flex-row h-screen">
      {/* Category rail */}
      <div className="lg:w-72 border-r border-line-strong bg-surface overflow-y-auto thin-scroll p-4 hidden lg:block">
        <h2 className="text-xs tracking-[0.2em] uppercase text-ink-muted mb-4">Categories</h2>
        <div className="flex flex-col gap-1">
          {categories.map((cat) => (
            <div key={cat.category}>
              <button
                data-testid={`tree-group-${cat.category}`}
                onClick={() => selectCategory(cat.category)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm transition-colors text-left",
                  selectedCat === cat.category
                    ? "text-terra font-medium bg-terra/10 border-l-2 border-terra"
                    : "text-ink-muted hover:text-ink hover:bg-line/50"
                )}
              >
                {cat.subcategories.length > 0 && (
                  <ChevronDown
                    size={14}
                    className={cn("transition-transform", expandedCats[cat.category] ? "" : "-rotate-90")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedCats((s) => ({ ...s, [cat.category]: !s[cat.category] }));
                    }}
                  />
                )}
                <span className="flex-1">{cat.category}</span>
                <span className="text-xs text-ink-muted/60">{cat.count}</span>
              </button>

              {selectedCat === cat.category && cat.subcategories.map((sub) => (
                <div key={sub.name} className="ml-4 mt-0.5">
                  <button
                    data-testid={`tree-sub-${sub.name}`}
                    onClick={() => selectSub(sub.name)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-sm transition-colors text-left",
                      selectedSub === sub.name
                        ? "text-terra font-medium bg-terra/10"
                        : "text-ink-muted hover:text-ink hover:bg-line/50"
                    )}
                  >
                    {sub.headings.length > 1 && (
                      <ChevronDown
                        size={12}
                        className={cn("transition-transform", expandedSubs[sub.name] ? "" : "-rotate-90")}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedSubs((s) => ({ ...s, [sub.name]: !s[sub.name] }));
                        }}
                      />
                    )}
                    <span className="flex-1">{sub.name}</span>
                    <span className="text-xs text-ink-muted/60">{sub.count}</span>
                  </button>

                  {(selectedSub === sub.name || expandedSubs[sub.name]) && sub.headings.map((h) => (
                    <button
                      key={h.name}
                      data-testid={`tree-heading-${h.name}`}
                      onClick={() => setSelectedHeading(selectedHeading === h.name ? "" : h.name)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-1.5 ml-4 text-xs rounded-sm transition-colors text-left",
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
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto thin-scroll p-6 drafting-grid">
        {/* Search bar */}
        <div className="mb-6">
          <div className="relative max-w-xl">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="Search 1,852 conflicts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="browse-search-input"
              className="w-full pl-10 pr-4 py-2.5 bg-surface border border-line-strong rounded-sm text-sm focus:outline-none focus:border-terra transition-colors"
            />
          </div>
          {breadcrumb && (
            <p className="text-xs text-ink-muted mt-3 tracking-wide">
              {results.total} conflicts in {breadcrumb}
            </p>
          )}
          {!breadcrumb && results.total > 0 && (
            <p className="text-xs text-ink-muted mt-3 tracking-wide">
              {results.total} conflicts
            </p>
          )}
        </div>

        {/* Results grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-ink-muted text-sm">Loading...</div>
          </div>
        ) : results.items.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-ink-muted text-sm">No conflicts found. Try a different search or filter.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {results.items.map((item, i) => (
              <div
                key={item.id}
                data-testid={`conflict-card-${item.id}`}
                className="bg-surface border border-line-strong rounded-sm shadow-sm hover:shadow-md hover:border-terra hover:-translate-y-0.5 transition-all p-5 cursor-pointer group"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <Link to={`/conflict/${item.id}`} className="block">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs tracking-[0.15em] uppercase text-ink-muted">
                      {item.category}
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        toggleBookmark(item.id);
                      }}
                      data-testid={`bookmark-${item.id}`}
                      className="text-ink-muted hover:text-terra transition-colors"
                    >
                      {bookmarks.has(item.id) ? (
                        <BookmarkCheck size={16} className="text-terra" />
                      ) : (
                        <Bookmark size={16} />
                      )}
                    </button>
                  </div>
                  <ClauseText
                    text={item.summary}
                    className="text-sm leading-relaxed text-ink block"
                  />
                  <div className="flex items-center gap-3 mt-3 text-xs text-ink-muted">
                    <span>{item.subcategory}</span>
                    {item.lead_up_count > 0 && <span>· {item.lead_up_count} lead-ups</span>}
                    {item.carry_on_count > 0 && <span>· {item.carry_on_count} carry-ons</span>}
                  </div>
                </Link>
                <button
                  onClick={() => {
                    addConflict({ id: item.id, summary: item.summary });
                    toast.success("Added to Story Studio");
                  }}
                  data-testid={`add-to-builder-${item.id}`}
                  className="mt-3 text-xs text-terra hover:underline flex items-center gap-1"
                >
                  <ChevronRight size={12} /> Add to Story Studio
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {results.pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8 pb-4">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              data-testid="pagination-prev"
              className="px-3 py-1.5 text-sm border border-line-strong rounded-sm disabled:opacity-40 hover:border-terra transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-ink-muted px-2">
              Page {page} of {results.pages}
            </span>
            <button
              onClick={() => setPage(Math.min(results.pages, page + 1))}
              disabled={page >= results.pages}
              data-testid="pagination-next"
              className="px-3 py-1.5 text-sm border border-line-strong rounded-sm disabled:opacity-40 hover:border-terra transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
