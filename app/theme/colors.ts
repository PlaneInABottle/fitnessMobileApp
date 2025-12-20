/**
 * Fitness App Light Theme Color Palette
 * A lighter variant of the dark fitness theme for accessibility options
 */
const palette = {
  // Neutrals - Light mode grays
  neutral100: "#FFFFFF",
  neutral200: "#F5F5F7",
  neutral300: "#E5E5EA",
  neutral400: "#D1D1D6",
  neutral500: "#8E8E93",
  neutral600: "#636366",
  neutral700: "#48484A",
  neutral800: "#2C2C2E",
  neutral900: "#1C1C1E",

  // Primary - iOS Blue
  primary100: "#E3F2FF",
  primary200: "#B3DAFF",
  primary300: "#66B8FF",
  primary400: "#3399FF",
  primary500: "#007AFF",
  primary600: "#0066CC",

  // Success - Completed sets green
  success100: "#D1FAE5",
  success200: "#A7F3D0",
  success500: "#30D158",

  // Warning - Warmup set yellow
  warning100: "#FFF9E6",
  warning200: "#FFF0B3",
  warning500: "#FFD60A",

  // Info - Drop set cyan
  info100: "#E6F9FF",
  info200: "#B3EEFF",
  info500: "#64D2FF",

  // Error/Failure - Red-orange
  error100: "#FFE5E3",
  error200: "#FFBAB5",
  error500: "#FF453A",
  errorDark: "#FF3B30",

  // Overlays
  overlay20: "rgba(0, 0, 0, 0.2)",
  overlay50: "rgba(0, 0, 0, 0.5)",
} as const

/**
 * Set type colors for workout tracking
 */
export const setTypeColors = {
  warmup: palette.warning500,
  working: palette.neutral900,
  dropset: palette.info500,
  failure: palette.error500,
} as const

export const colors = {
  palette,
  transparent: "rgba(0, 0, 0, 0)",

  // Text colors
  text: palette.neutral900,
  textDim: palette.neutral600,
  textMuted: palette.neutral500,

  // Backgrounds
  background: palette.neutral200,
  backgroundSecondary: palette.neutral100,
  card: palette.neutral100,
  cardSecondary: palette.neutral200,

  // Interactive elements
  tint: palette.primary500,
  tintInactive: palette.neutral400,

  // Borders and separators
  border: palette.neutral400,
  separator: palette.neutral300,

  // Status colors
  error: palette.error500,
  errorBackground: palette.error100,
  success: palette.success500,
  successBackground: palette.success100,
  warning: palette.warning500,
  warningBackground: palette.warning100,
  info: palette.info500,
  infoBackground: palette.info100,

  // Set type colors (exposed at top level for convenience)
  setTypeColors,
} as const
