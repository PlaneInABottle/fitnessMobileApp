/**
 * Shared constants across stores
 */

/**
 * Valid set type IDs
 */
export const SET_TYPE_IDS = ["warmup", "working", "dropset", "failure"] as const

export type SetTypeId = (typeof SET_TYPE_IDS)[number]
