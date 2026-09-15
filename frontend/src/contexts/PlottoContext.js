import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../lib/api";

const PlottoContext = createContext(null);

export function PlottoProvider({ children }) {
  const [characters, setCharacters] = useState([]);
  const [clauses, setClauses] = useState({ a: [], b: [], c: [] });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [chars, cls, cats] = await Promise.all([
          api.getCharacters(),
          api.getClauses(),
          api.getCategories(),
        ]);
        if (!active) return;
        setCharacters(chars);
        setClauses(cls);
        setCategories(cats);
      } catch (err) {
        console.error("Failed to load Plotto data:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <PlottoContext.Provider value={{ characters, clauses, categories, loading }}>
      {children}
    </PlottoContext.Provider>
  );
}

export function usePlotto() {
  const ctx = useContext(PlottoContext);
  if (!ctx) throw new Error("usePlotto must be used within PlottoProvider");
  return ctx;
}
