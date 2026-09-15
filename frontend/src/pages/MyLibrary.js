import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Library as LibraryIcon, Trash2, FolderOpen, Edit3, ChevronDown, FolderInput, Pencil, Check, X } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useBuilder } from "../contexts/BuilderContext";
import ClauseText from "../components/ClauseText";
import { cn } from "../lib/utils";
import { toast } from "sonner";

export default function MyLibrary() {
  const { user, token } = useAuth();
  const { loadPlot } = useBuilder();
  const navigate = useNavigate();

  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [moveTarget, setMoveTarget] = useState(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getPlots(token);
      setPlots(data);
    } catch {
      toast.error("Failed to load library");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Group plots by folder
  const folders = plots.reduce((acc, p) => {
    const f = p.folder || "Unfiled";
    if (!acc[f]) acc[f] = [];
    acc[f].push(p);
    return acc;
  }, {});
  const folderNames = Object.keys(folders).sort();

  const handleDelete = async (id) => {
    try {
      await api.deletePlot(id, token);
      setPlots((p) => p.filter((x) => x.id !== id));
      toast.success("Story deleted");
    } catch {
      toast.error("Failed to delete");
    }
    setDeleteTarget(null);
  };

  const handleOpen = (plot) => {
    loadPlot(plot);
    navigate("/builder");
  };

  const handleRenameFolder = async (oldName) => {
    const newName = renameValue.trim() || "Unfiled";
    if (newName === oldName) { setRenamingFolder(null); return; }
    try {
      await api.renameFolder(oldName, newName, token);
      setPlots((p) => p.map((x) => x.folder === oldName ? { ...x, folder: newName } : x));
      toast.success("Folder renamed");
    } catch {
      toast.error("Failed to rename folder");
    }
    setRenamingFolder(null);
  };

  const handleMove = async (plotId, folder) => {
    try {
      await api.movePlot(plotId, folder, token);
      setPlots((p) => p.map((x) => x.id === plotId ? { ...x, folder } : x));
      toast.success("Story moved");
    } catch {
      toast.error("Failed to move story");
    }
    setMoveTarget(null);
  };

  if (loading) {
    return <div className="p-8 text-ink-muted text-sm">Loading your library...</div>;
  }

  if (plots.length === 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto py-16 text-center">
        <LibraryIcon size={48} className="mx-auto text-line-strong mb-4" />
        <h2 className="text-xl font-heading text-ink mb-2">No saved stories yet</h2>
        <p className="text-sm text-ink-muted mb-6">
          Build a story in the Story Studio and save it to see it here.
        </p>
        <Link
          to="/builder"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-terra text-white rounded-sm hover:bg-terra/90 transition-colors"
        >
          Go to Story Studio
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-heading uppercase tracking-tight text-ink mb-6">
        My Library
      </h1>

      {folderNames.map((folder) => (
        <div key={folder} className="mb-8">
          {/* Folder header */}
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen size={18} className="text-sage" />
            {renamingFolder === folder ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRenameFolder(folder)}
                  autoFocus
                  data-testid="rename-folder-input"
                  className="px-2 py-1 text-sm border border-line-strong rounded-sm focus:outline-none focus:border-terra"
                />
                <button
                  onClick={() => handleRenameFolder(folder)}
                  data-testid="rename-folder-confirm"
                  className="p-1 text-terra hover:text-terra/80"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setRenamingFolder(null)}
                  className="p-1 text-ink-muted hover:text-ink"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <h2
                  data-testid={`folder-${folder}`}
                  className="text-sm font-heading uppercase tracking-wide text-ink"
                >
                  {folder}
                </h2>
                <span className="text-xs text-ink-muted">({folders[folder].length})</span>
                <button
                  onClick={() => { setRenamingFolder(folder); setRenameValue(folder); }}
                  data-testid={`rename-folder-${folder}`}
                  className="p-1 text-ink-muted hover:text-terra transition-colors"
                >
                  <Pencil size={12} />
                </button>
              </>
            )}
          </div>

          {/* Plot cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {folders[folder].map((plot) => (
              <div
                key={plot.id}
                data-testid={`plot-card-${plot.id}`}
                className="bg-surface border border-line-strong rounded-sm shadow-sm hover:shadow-md hover:border-terra transition-all p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-medium text-ink flex-1">{plot.title}</h3>
                  <div className="flex items-center gap-1">
                    {/* Move dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setMoveTarget(moveTarget === plot.id ? null : plot.id)}
                        data-testid={`move-plot-${plot.id}`}
                        className="p-1 text-ink-muted hover:text-terra transition-colors"
                      >
                        <FolderInput size={14} />
                      </button>
                      {moveTarget === plot.id && (
                        <div className="absolute right-0 top-7 z-10 bg-surface border border-line-strong rounded-sm shadow-lg py-1 min-w-32">
                          {folderNames.filter((f) => f !== folder).map((f) => (
                            <button
                              key={f}
                              onClick={() => handleMove(plot.id, f)}
                              data-testid={`move-target-${plot.id}-${f}`}
                              className="w-full text-left px-3 py-1.5 text-xs text-ink hover:bg-terra/10 hover:text-terra"
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleOpen(plot)}
                      data-testid={`open-plot-${plot.id}`}
                      className="p-1 text-ink-muted hover:text-terra transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(plot)}
                      data-testid={`delete-plot-${plot.id}`}
                      className="p-1 text-ink-muted hover:text-error transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-ink-muted mb-2">
                  {plot.conflicts.length} {plot.conflicts.length === 1 ? "step" : "steps"}
                  {plot.a_clause && " · has beginning"}
                  {plot.c_clause && " · has conclusion"}
                </div>
                {plot.conflicts.length > 0 && (
                  <div className="space-y-1">
                    {plot.conflicts.slice(0, 2).map((c, i) => (
                      <div key={i} className="text-xs text-ink-muted truncate">
                        {i + 1}. {c.summary || c.id}
                      </div>
                    ))}
                    {plot.conflicts.length > 2 && (
                      <div className="text-xs text-ink-muted/60">
                        + {plot.conflicts.length - 2} more...
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setDeleteTarget(null)}>
          <div className="bg-surface border border-line-strong rounded-sm shadow-lg p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-heading text-ink mb-2">Delete Story?</h3>
            <p className="text-sm text-ink-muted mb-4">
              "{deleteTarget.title}" will be permanently deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-ink-muted hover:text-ink transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget.id)}
                data-testid="confirm-delete"
                className="px-4 py-2 text-sm bg-error text-white rounded-sm hover:bg-error/90 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
