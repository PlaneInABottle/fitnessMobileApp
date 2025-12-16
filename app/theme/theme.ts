import { colors as colorsLight } from "./colors"
import { colors as colorsDark } from "./colorsDark"
import { spacing as spacingLight } from "./spacing"
import { spacing as spacingDark } from "./spacingDark"
import { timing } from "./timing"
import type { Theme } from "./types"
import { typography } from "./typography"

/**
 * Light theme configuration
 * Secondary theme - available for accessibility preferences
 */
export const lightTheme: Theme = {
  colors: colorsLight,
  spacing: spacingLight,
  typography,
  timing,
  isDark: false,
}

/**
 * Dark theme configuration
 * PRIMARY theme - optimized for gym environment and OLED screens
 * Based on Hevy/Antrenman app design patterns
 */
export const darkTheme: Theme = {
  colors: colorsDark,
  spacing: spacingDark,
  typography,
  timing,
  isDark: true,
}

/**
 * Default theme for the fitness app
 * Dark theme is the primary experience
 */
export const defaultTheme = darkTheme
