import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
const AuthContext = createContext({ user: null, token: null, login: () => {}, logout: () => {} });
const STORAGE_KEY = "estatepulse_auth";
function expiresAt(token) {
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000; }
  catch { return 0; }
}
function readSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved?.user && saved?.token && expiresAt(saved.token) > Date.now() ? saved : null;
  } catch { return null; }
}
export function AuthProvider({ children }) {
  // Lazy initialization prevents redirects before the saved session is restored.
  const [session, setSession] = useState(readSession);
  useEffect(() => {
    if (!session) { localStorage.removeItem(STORAGE_KEY); return; }
    const timer = setTimeout(() => setSession(null), Math.max(0, expiresAt(session.token) - Date.now()));
    return () => clearTimeout(timer);
  }, [session]);
  const value = useMemo(() => ({
    user: session?.user || null, token: session?.token || null,
    login(payload) {
      if (!payload?.user || !payload?.token) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setSession(payload);
    },
    logout() { localStorage.removeItem(STORAGE_KEY); setSession(null); },
  }), [session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
