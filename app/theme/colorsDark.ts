/**
 * Fitness Tracker dark theme color palette.
 * PRIMARY theme designed for gym environment readability.
 * Based on established fitness-tracking app design patterns.
 */
const palette = {
  // Neutrals - Dark mode. Near-black surfaces preserve contrast without the glare of pure black.
  neutral100: "#0B0D10", // Main background
  neutral200: "#15181D", // Card background
  neutral300: "#20242B", // Card secondary / elevated surfaces
  neutral400: "#2B3038", // Separator
  neutral500: "#3A414B", // Border
  neutral600: "#737B88", // Text tertiary
  neutral700: "#A2A8B2", // Text secondary
  neutral800: "#F1F3F5", // Text primary (off-white)
  neutral900: "#FFFFFF", // Pure white for emphasis

  // Primary - iOS Blue (main action color)
  primary100: "#003366",
  primary200: "#004C99",
  primary300: "#0066CC",
  primary400: "#0077ED",
  primary500: "#007AFF", // iOS system blue
  primary600: "#3399FF",

  // Success - Completed sets green
  success100: "#0D3320",
  success200: "#1A6640",
  success500: "#30D158", // iOS system green

  // Warning - Warmup set yellow (W indicator)
  warning100: "#332B00",
  warning200: "#665500",
  warning500: "#FFD60A", // iOS system yellow

  // Info - Drop set cyan (D indicator)
  info100: "#003344",
  info200: "#006688",
  info500: "#64D2FF", // iOS system cyan

  // Error/Failure - Red-orange (F indicator)
  error100: "#330F0D",
  error200: "#661F1A",
  error500: "#FF453A", // iOS system red-orange
  errorDark: "#FF3B30", // Standard iOS red

  // Overlays
  overlay20: "rgba(0, 0, 0, 0.2)",
  overlay50: "rgba(0, 0, 0, 0.5)",
  overlay80: "rgba(0, 0, 0, 0.8)",
} as const

/**
 * Set type colors for workout tracking
 * These match the workout set indicators used throughout the app.
 */
export const setTypeColors = {
  warmup: palette.warning500, // Yellow "W" indicator
  working: palette.neutral900, // White text for regular sets
  dropset: palette.info500, // Cyan "D" indicator
  failure: palette.error500, // Red-orange "F" indicator
} as const

export const colors = {
  palette,
  transparent: "rgba(0, 0, 0, 0)",

  // Text colors
  text: palette.neutral800, // Off-white for comfortable primary text
  textDim: palette.neutral700, // Gray for secondary text
  textMuted: palette.neutral600, // Darker gray for tertiary/disabled

  // Backgrounds
  background: palette.neutral100,
  backgroundSecondary: palette.neutral200, // Slightly elevated background
  card: palette.neutral200, // Card background
  cardSecondary: palette.neutral300, // Elevated card / nested elements

  // Interactive elements
  tint: palette.primary500, // iOS blue for buttons/links
  tintInactive: palette.neutral600, // Inactive state

  // Borders and separators
  border: palette.neutral500, // Border color
  separator: palette.neutral400, // Line separators

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
