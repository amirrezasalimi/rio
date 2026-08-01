export const RIO_CONTENT_COLORS = {
  white: '#ffffff',
  surface: '#fffdf8',
  primary: '#328fdf',
  primaryLight: '#86c9ff',
  accent: '#ed674e',
  ink: '#18324a',
} as const;

export const RIO_BORDER_COLOR_PRESETS = [
  RIO_CONTENT_COLORS.white,
  RIO_CONTENT_COLORS.primary,
  RIO_CONTENT_COLORS.accent,
  RIO_CONTENT_COLORS.ink,
] as const;
