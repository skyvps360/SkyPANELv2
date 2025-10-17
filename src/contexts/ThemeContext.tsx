import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_THEME_ID,
  ThemeId,
  ThemePreset,
  themePresets,
  ThemeVariables,
} from "@/theme/presets";

interface ThemeContextValue {
  themeId: ThemeId;
  setTheme: (themeId: ThemeId) => void;
  themes: ThemePreset[];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "containerstacks:theme";
const STYLE_ELEMENT_ID = "containerstacks-theme-style";

const serializeVariables = (vars: ThemeVariables): string =>
  Object.entries(vars)
    .map(([key, value]) => `  --${key}: ${value};`)
    .join("\n");

const ensureStyleElement = (): HTMLStyleElement | null => {
  if (typeof document === "undefined") {
    return null;
  }

  let styleEl = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;

  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ELEMENT_ID;
    styleEl.setAttribute("data-managed-by", "ThemeContext");
    document.head.appendChild(styleEl);
  }

  return styleEl;
};

const applyTheme = (preset: ThemePreset) => {
  if (typeof document === "undefined") {
    return;
  }

  const styleEl = ensureStyleElement();
  if (!styleEl) {
    return;
  }

  const lightBlock = serializeVariables(preset.light);
  const darkBlock = serializeVariables(preset.dark);

  styleEl.textContent = `:root {\n${lightBlock}\n}\n:root.dark, .dark {\n${darkBlock}\n}`;
  document.documentElement.dataset.theme = preset.id;
};

const getStoredTheme = (): ThemeId | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return null;
  }

  return themePresets.some((preset) => preset.id === stored)
    ? (stored as ThemeId)
    : null;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeId, setThemeId] = useState<ThemeId>(() => getStoredTheme() ?? DEFAULT_THEME_ID);

  const preset = useMemo(
    () => themePresets.find((item) => item.id === themeId) ?? themePresets[0],
    [themeId]
  );

  useLayoutEffect(() => {
    applyTheme(preset);
  }, [preset]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, preset.id);
  }, [preset.id]);

  const handleSetTheme = useCallback((next: ThemeId) => {
    setThemeId(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId: preset.id,
      setTheme: handleSetTheme,
      themes: themePresets,
    }),
    [handleSetTheme, preset.id]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
