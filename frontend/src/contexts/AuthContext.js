import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("plotto_token"));
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async (t) => {
    if (!t) {
      setLoading(false);
      return;
    }
    try {
      const me = await api.getMe(t);
      setUser(me);
    } catch {
      // Try refresh
      try {
        const res = await api.refresh();
        if (res.access_token) {
          localStorage.setItem("plotto_token", res.access_token);
          setToken(res.access_token);
          const me = await api.getMe(res.access_token);
          setUser(me);
        }
      } catch {
        localStorage.removeItem("plotto_token");
        setToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe(token);
  }, [fetchMe, token]);

  const login = useCallback(async (email, password, captchaId, captchaAnswer) => {
    const res = await api.login({ email, password, captcha_id: captchaId, captcha_answer: captchaAnswer });
    localStorage.setItem("plotto_token", res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (name, email, password, captchaId, captchaAnswer) => {
    const res = await api.register({ name, email, password, captcha_id: captchaId, captcha_answer: captchaAnswer });
    localStorage.setItem("plotto_token", res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch {}
    localStorage.removeItem("plotto_token");
    localStorage.removeItem("plotto_draft_v1");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
