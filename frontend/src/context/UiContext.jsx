import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LANGUAGE, DEFAULT_THEME, LANGUAGES, STORAGE_KEY, translate } from "../utils/i18n";

const UiContext = createContext({
  theme: DEFAULT_THEME,
  language: DEFAULT_LANGUAGE,
  setTheme: () => {},
  toggleTheme: () => {},
  setLanguage: () => {},
  t: (key) => key,
});

function readStoredSettings() {
  if (typeof window === "undefined") {
    return { theme: DEFAULT_THEME, language: DEFAULT_LANGUAGE };
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return { theme: DEFAULT_THEME, language: DEFAULT_LANGUAGE };

    const parsed = JSON.parse(saved);
    return {
      theme: parsed?.theme === "dark" ? "dark" : DEFAULT_THEME,
      language: LANGUAGES.includes(parsed?.language) ? parsed.language : DEFAULT_LANGUAGE,
    };
  } catch {
    return { theme: DEFAULT_THEME, language: DEFAULT_LANGUAGE };
  }
}

export function UiProvider({ children }) {
  const stored = readStoredSettings();
  const [theme, setTheme] = useState(stored.theme);
  const [language, setLanguage] = useState(stored.language);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    document.body.dataset.theme = theme;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ theme, language })
    );
  }, [theme, language]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? DEFAULT_THEME : "dark"));
  };

  const t = useMemo(
    () => (key, params) => translate(language, key, params),
    [language]
  );

  const value = useMemo(
    () => ({ theme, language, setTheme, toggleTheme, setLanguage, t }),
    [language, t, theme]
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi() {
  return useContext(UiContext);
}
