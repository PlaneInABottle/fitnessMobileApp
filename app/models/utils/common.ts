/**
 * Common utility functions shared across stores
 */

/**
 * Sanitizes text by trimming and normalizing whitespace
 */
export function sanitizeText(value: string, maxLength?: number): string {
  const trimmed = value.trim().replace(/\s+/g, " ")
  if (maxLength !== undefined && trimmed.length > maxLength) {
    return trimmed.slice(0, maxLength)
  }
  return trimmed
}

/**
 * Generates a unique ID using timestamp and random string
 */
export function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Converts a value to a finite number, returns undefined if invalid
 */
export function toFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}
