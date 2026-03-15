"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, getStoredTheme, getUser, setStoredTheme, setStoredUser } from "@/lib/api";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const resolveInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "dark";

  const storedTheme = getStoredTheme();
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  const userTheme = getUser()?.theme;
  if (userTheme === "dark" || userTheme === "light") {
    return userTheme;
  }

  return "dark";
};

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(resolveInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    setStoredTheme(theme);
  }, [theme]);

  const persistTheme = async (nextTheme: Theme) => {
    setThemeState(nextTheme);

    const currentUser = getUser();
    if (!currentUser) return;

    const optimisticUser = { ...currentUser, theme: nextTheme };
    setStoredUser(optimisticUser);

    try {
      const { data } = await api.put("/users/theme", { theme: nextTheme });
      setStoredUser(data);
      setThemeState(data.theme);
    } catch {
      // Keep the optimistic theme locally even if the save fails.
    }
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: persistTheme,
      toggleTheme: () => persistTheme(theme === "dark" ? "light" : "dark"),
    }),
    [theme]
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
