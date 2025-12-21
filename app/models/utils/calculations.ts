/**
 * Calculation utilities for workout metrics
 */

/**
 * Calculates volume (kg) from weight and reps
 * Volume = weight × reps
 */
export function calculateSetVolume(weight: number | undefined, reps: number | undefined): number {
  if (weight === undefined || reps === undefined) return 0
  return weight * reps
}

/**
 * Calculates total volume from an array of sets
 */
export function calculateTotalVolume(
  sets: Array<{ weight?: number; reps?: number; isDone?: boolean }>,
  onlyCompleted = false,
): number {
  return sets.reduce((total, set) => {
    if (onlyCompleted && !set.isDone) return total
    return total + calculateSetVolume(set.weight, set.reps)
  }, 0)
}
