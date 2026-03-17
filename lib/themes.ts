export type ThemeMode = 'dark' | 'light'
export type ThemeFamily = 'nexora' | 'atelier' | 'fjord' | 'graphite'

export interface ThemePreviewPalette {
  bg: string
  surface: string
  accent: string
  text: string
}

export interface ThemeDefinition {
  id: ThemeFamily
  name: string
  description: string
  light: ThemePreviewPalette
  dark: ThemePreviewPalette
}

export const THEME_FAMILIES: ThemeDefinition[] = [
  {
    id: 'nexora',
    name: 'Nexora',
    description: 'Warm terracotta accents with balanced contrast for everyday work.',
    light: {
      bg: '#f5f1e7',
      surface: '#faf6ed',
      accent: '#cf6943',
      text: '#3e392f',
    },
    dark: {
      bg: '#2c2b29',
      surface: '#32312f',
      accent: '#d97955',
      text: '#f5efe3',
    },
  },
  {
    id: 'atelier',
    name: 'Atelier',
    description: 'Paper-and-clay tones with a softer editorial feel.',
    light: {
      bg: '#f6efe6',
      surface: '#fffaf3',
      accent: '#b86648',
      text: '#43362d',
    },
    dark: {
      bg: '#2b2522',
      surface: '#332c28',
      accent: '#d38a62',
      text: '#f4eadc',
    },
  },
  {
    id: 'fjord',
    name: 'Fjord',
    description: 'Cool slate blues for a sharper analytical workspace.',
    light: {
      bg: '#eef3f6',
      surface: '#f7fbfd',
      accent: '#437b90',
      text: '#22343d',
    },
    dark: {
      bg: '#18232a',
      surface: '#1e2d35',
      accent: '#5fa1b9',
      text: '#e7f0f4',
    },
  },
  {
    id: 'graphite',
    name: 'Graphite',
    description: 'Neutral monochrome with clean amber highlights.',
    light: {
      bg: '#f1f1ef',
      surface: '#fafaf8',
      accent: '#8d6c3f',
      text: '#2d2d2a',
    },
    dark: {
      bg: '#1e1e1d',
      surface: '#252523',
      accent: '#c59b5a',
      text: '#efefea',
    },
  },
]

export const DEFAULT_THEME_MODE: ThemeMode = 'dark'
export const DEFAULT_THEME_FAMILY: ThemeFamily = 'nexora'

const VALID_THEME_MODES = new Set<ThemeMode>(['dark', 'light'])
const VALID_THEME_FAMILIES = new Set<ThemeFamily>(['nexora', 'atelier', 'fjord', 'graphite'])

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && VALID_THEME_MODES.has(value as ThemeMode)
}

export function isThemeFamily(value: unknown): value is ThemeFamily {
  return typeof value === 'string' && VALID_THEME_FAMILIES.has(value as ThemeFamily)
}

export function normalizeThemeMode(value: unknown): ThemeMode {
  return isThemeMode(value) ? value : DEFAULT_THEME_MODE
}

export function normalizeThemeFamily(value: unknown): ThemeFamily {
  return isThemeFamily(value) ? value : DEFAULT_THEME_FAMILY
}

export function getThemeDefinition(family: ThemeFamily): ThemeDefinition {
  return THEME_FAMILIES.find((theme) => theme.id === family) ?? THEME_FAMILIES[0]
}
