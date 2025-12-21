/**
 * Shared constants across stores
 */

import { SetTypeId } from "../SetStore"

/**
 * Valid set type IDs
 */
export const SET_TYPE_IDS: readonly SetTypeId[] = [
  "warmup",
  "working",
  "dropset",
  "failure",
] as const
