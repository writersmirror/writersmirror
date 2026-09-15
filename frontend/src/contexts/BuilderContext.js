import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { api } from "../lib/api";

const DRAFT_KEY = "plotto_draft_v1";

const BuilderContext = createContext(null);

export function BuilderProvider({ children }) {
  const { user, token } = useAuth();
  const [draft, setDraft] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      return saved ? JSON.parse(saved) : { title: "", folder: "Unfiled", a_clause: null, b_clause: null, c_clause: null, conflicts: [], notes: "" };
    } catch {
      return { title: "", folder: "Unfiled", a_clause: null, b_clause: null, c_clause: null, conflicts: [], notes: "" };
    }
  });
  const [editingPlotId, setEditingPlotId] = useState(null);
  const saveTimer = useRef(null);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  // Sync to server when logged in (debounced)
  useEffect(() => {
    if (!user || !token) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await api.putDraft(draft, token);
      } catch (err) {
        console.error("Draft sync failed:", err);
      }
    }, 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [draft, user, token]);

  // Pull server draft on login if local draft is empty
  useEffect(() => {
    if (!user || !token) return;
    const localEmpty = !draft.conflicts || draft.conflicts.length === 0;
    if (localEmpty) {
      api.getDraft(token).then((res) => {
        if (res && res.draft && res.draft.conflicts && res.draft.conflicts.length > 0) {
          setDraft(res.draft);
        }
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  const setField = useCallback((field, value) => {
    setDraft((d) => ({ ...d, [field]: value }));
  }, []);

  const addConflict = useCallback((conflict) => {
    setDraft((d) => {
      if (d.conflicts.some((c) => c.id === conflict.id)) return d;
      return { ...d, conflicts: [...d.conflicts, { id: conflict.id, summary: conflict.summary || "", note: "", transforms: conflict.transforms || [] }] };
    });
  }, []);

  const prependConflict = useCallback((conflict) => {
    setDraft((d) => {
      if (d.conflicts.some((c) => c.id === conflict.id)) return d;
      return { ...d, conflicts: [{ id: conflict.id, summary: conflict.summary || "", note: "", transforms: conflict.transforms || [] }, ...d.conflicts] };
    });
  }, []);

  const removeConflict = useCallback((index) => {
    setDraft((d) => ({ ...d, conflicts: d.conflicts.filter((_, i) => i !== index) }));
  }, []);

  const moveConflict = useCallback((index, dir) => {
    setDraft((d) => {
      const arr = [...d.conflicts];
      const newIndex = index + dir;
      if (newIndex < 0 || newIndex >= arr.length) return d;
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
      return { ...d, conflicts: arr };
    });
  }, []);

  const updateConflictNote = useCallback((index, note) => {
    setDraft((d) => {
      const arr = [...d.conflicts];
      if (arr[index]) arr[index] = { ...arr[index], note };
      return { ...d, conflicts: arr };
    });
  }, []);

  const reset = useCallback(() => {
    setDraft({ title: "", folder: "Unfiled", a_clause: null, b_clause: null, c_clause: null, conflicts: [], notes: "" });
    setEditingPlotId(null);
  }, []);

  const loadPlot = useCallback((plot) => {
    setDraft({
      title: plot.title || "",
      folder: plot.folder || "Unfiled",
      a_clause: plot.a_clause || null,
      b_clause: plot.b_clause || null,
      c_clause: plot.c_clause || null,
      conflicts: plot.conflicts || [],
      notes: plot.notes || "",
    });
    setEditingPlotId(plot.id || null);
  }, []);

  return (
    <BuilderContext.Provider value={{
      draft, setField, addConflict, prependConflict, removeConflict, moveConflict,
      updateConflictNote, reset, loadPlot, editingPlotId, setEditingPlotId,
    }}>
      {children}
    </BuilderContext.Provider>
  );
}

export function useBuilder() {
  const ctx = useContext(BuilderContext);
  if (!ctx) throw new Error("useBuilder must be used within BuilderProvider");
  return ctx;
}
