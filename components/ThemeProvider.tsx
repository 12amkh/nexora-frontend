"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  api,
  getStoredTheme,
  getStoredThemeFamily,
  getUser,
  setStoredTheme,
  setStoredThemeFamily,
  setStoredUser,
} from "@/lib/api";
import {
  DEFAULT_THEME_FAMILY,
  DEFAULT_THEME_MODE,
  normalizeThemeFamily,
  normalizeThemeMode,
  type ThemeFamily,
  type ThemeMode,
} from "@/lib/themes";

interface ThemeContextValue {
  themeMode: ThemeMode;
  themeFamily: ThemeFamily;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setThemeFamily: (family: ThemeFamily) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const resolveInitialThemeMode = (): ThemeMode => {
  if (typeof window === "undefined") return DEFAULT_THEME_MODE;
  return normalizeThemeMode(getStoredTheme() ?? getUser()?.theme ?? DEFAULT_THEME_MODE);
};

const resolveInitialThemeFamily = (): ThemeFamily => {
  if (typeof window === "undefined") return DEFAULT_THEME_FAMILY;
  return normalizeThemeFamily(getStoredThemeFamily() ?? getUser()?.theme_family ?? DEFAULT_THEME_FAMILY);
};

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(resolveInitialThemeMode);
  const [themeFamily, setThemeFamilyState] = useState<ThemeFamily>(resolveInitialThemeFamily);

  useEffect(() => {
    document.documentElement.dataset.themeMode = themeMode;
    document.documentElement.dataset.themeFamily = themeFamily;
    setStoredTheme(themeMode);
    setStoredThemeFamily(themeFamily);
  }, [themeFamily, themeMode]);

  const persistThemePreferences = async (nextThemeMode: ThemeMode, nextThemeFamily: ThemeFamily) => {
    setThemeMode(nextThemeMode);
    setThemeFamilyState(nextThemeFamily);

    const currentUser = getUser();
    if (!currentUser) return;

    const optimisticUser = {
      ...currentUser,
      theme: nextThemeMode,
      theme_family: nextThemeFamily,
    };
    setStoredUser(optimisticUser);

    try {
      const { data } = await api.put("/users/theme", {
        theme: nextThemeMode,
        theme_family: nextThemeFamily,
      });
      setStoredUser(data);
      setThemeMode(normalizeThemeMode(data.theme));
      setThemeFamilyState(normalizeThemeFamily(data.theme_family));
    } catch {
      // Keep the optimistic theme locally even if the save fails.
    }
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeMode,
      themeFamily,
      theme: themeMode,
      setTheme: (nextThemeMode) => persistThemePreferences(nextThemeMode, themeFamily),
      setThemeFamily: (nextThemeFamily) => persistThemePreferences(themeMode, nextThemeFamily),
      toggleTheme: () =>
        persistThemePreferences(themeMode === "dark" ? "light" : "dark", themeFamily),
    }),
    [themeFamily, themeMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
