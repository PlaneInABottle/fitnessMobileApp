# Persistent Exercise Notes ("Note Memories") — Implementation Plan

## Executive Summary
- **Objective:** Persist per-exercise notes across workout sessions and surface the last note as the next session’s placeholder, using the same persistence mechanism as set memories.
- **Approach (minimal):** Add an exercise-level `noteMemories` map to `PerformanceMemoryStore` (parallel to `patternMemories`) and record note memories when the user types a non-empty note; compute placeholder in `ActiveWorkoutScreen` with priority **template → memory → default**.
- **Success metrics:** (1) A note entered once is suggested (as placeholder) the next time that exercise appears; (2) empty edits do not erase prior notes; (3) set memory behavior is unchanged.

## Current State (code facts)
### Notes today (ephemeral)
- `WorkoutExerciseModel` has `notes: string` (active session only) (`app/models/WorkoutStore.ts` line ~60-66).
- `completeSessionUnsafe()` explicitly clears notes when writing history: `notes: "" // Notes are for active session UX only` (`app/models/WorkoutStore.ts` line ~454-474).
- `ActiveWorkoutScreen` renders `<NoteInput value={we.notes} ... />` without any placeholder customization (`app/screens/ActiveWorkoutScreen.tsx` line ~211-216).
- `NoteInput` hard-codes placeholder: `placeholder="Buraya not ekleyin..."` (`app/components/workout/NoteInput.tsx` line ~16-26).

### Set memories today (persistent)
- `PerformanceMemoryStore` uses `schemaVersion: 2` and persists `patternMemories` keyed by `${exerciseId}::${category}|${setType}|${order}` (`app/models/PerformanceMemoryStore.ts` line ~102-107, 67-69).
- `recordCompletedWorkout()` stores last completed set values only (no notes) (`app/models/PerformanceMemoryStore.ts` line ~221-259).
- Root store migration currently normalizes performance memory snapshots to v2 via `migratePerformanceMemoryStoreSnapshotToV2()` (`app/models/setupRootStore.ts` line ~32-43).

## Requirements
1) Exercise notes persist across workout sessions like set memories.
2) Prior notes appear as placeholders in new sessions.
3) Placeholder priority: **template notes > performance-memory notes > default placeholder**.
4) Notes update when users type new content; if user leaves note empty, previous note should remain.

## Non-Requirements / Constraints
- **No visual changes** to note input styling; only placeholder value logic may change.
- **Do not change set memory functionality** (schema, keys, behaviors).
- **Do not alter workout completion flow** (keep set recording + history behavior as-is).
- **Backward compatible** with existing persisted snapshots.

---

## Proposed Architecture (minimal, leverage existing systems)
### 1) Data model addition: exercise-level note memories in `PerformanceMemoryStore`
**Rationale:** Set memories live in `PerformanceMemoryStore` and are already persisted via encrypted storage (`setupRootStore.ts` onSnapshot stores `performanceMemoryStore` in secure storage). Notes should follow the same persistence path.

#### New MST models/types
Add alongside existing types in `app/models/PerformanceMemoryStore.ts`:
- `ExerciseNoteMemoryEntryModel`:
  - `exerciseId: string`
  - `category: ExerciseCategory` (reuse `EXERCISE_CATEGORY_VALUES` enum pattern)
  - `note: string` (stored as-is; trim when deciding whether to update)
  - `updatedAt: Date`

#### New store field
In `PerformanceMemoryStoreModel` (`app/models/PerformanceMemoryStore.ts` line ~102-107):
- Add `noteMemories: types.optional(types.map(ExerciseNoteMemoryEntryModel), {})`
- Bump `schemaVersion` to **3** (keep accepting v2 input via migration).

#### Keying strategy (KISS)
Exercise notes are exercise-level (not set-level), so keep keys simple:
- `noteKey = `${exerciseId}::${category}``

This avoids impacting existing set key logic and keeps lookup O(1).

### 2) Store API additions (small, SRP)
Add views/actions to `PerformanceMemoryStore`:

#### Views
- `getExerciseNoteMemory(exerciseId: string, category: ExerciseCategory): string | undefined`
  - Returns `entry.note` if present and non-empty (optional: `trim()` check here).

#### Actions
- `recordExerciseNoteMemory(args: { exerciseId: string; category: ExerciseCategory; note: string; updatedAt?: Date }): void`
  - **Fail-fast validation:** ignore invalid IDs/categories.
  - **YAGNI:** only store if `note.trim().length > 0`.
  - If an entry exists, update only when the incoming `updatedAt` is newer/equal.

**Important behavior:** If user clears the note (empty/whitespace), **do not update memory**, preserving the last meaningful note.

### 3) Where to record note memories (don’t touch completion)
To comply with “do not alter workout completion flow”, persist notes **when the user types** (not during `completeSessionUnsafe`).

Integration point:
- `ActiveWorkoutScreen.tsx` currently handles note edits:
  - `onChangeText={(value) => workoutStore.updateWorkoutExerciseNotes(we.id, value)}` (line ~211-216)

Proposed minimal extension:
- After updating `workoutStore`, also call `performanceMemoryStore.recordExerciseNoteMemory(...)` **only if** `value.trim()` is non-empty.
- Category is available as `exercise.category` already used for set placeholder/memory (`ActiveWorkoutScreen.tsx` line ~252-257).

**Optional micro-optimization (not required):** debounce note memory writes (e.g., 300–500ms) to reduce snapshot churn; keep it simple unless profiling shows a problem.

---

## Template Notes Support (minimal template model change)
### Goal
Enable templates to define a suggested note that overrides memory placeholders.

### Minimal model change
`TemplateExerciseModel` currently has only `{ exerciseId, sets }` (`app/models/WorkoutStore.ts` line ~96-100).

Add:
- `notes: types.optional(types.string, "")`

### How templates get notes (keep it minimal)
Leverage existing template creation/update flows:
- `buildTemplateExercisesFromSession()` (currently maps `exerciseId` + `sets`) (`WorkoutStore.ts` line ~242-256)
  - Extend mapping to include `notes: we.notes`.

This automatically covers:
- `createTemplateFromSessionUnsafe()` (uses `buildTemplateExercisesFromSession`) (`WorkoutStore.ts` line ~505-516)
- `updateTemplateFromCurrentSession()` (also uses `buildTemplateExercisesFromSession`) (`WorkoutStore.ts` line ~715-724)

**Note:** `buildWorkoutExercisesFromTemplate()` should **not** prefill `WorkoutExercise.notes` (so notes still behave like placeholders, not initial values).

Backward compatibility: old templates lacking `notes` will default to `""`.

---

## UI Integration (placeholder priority)
### NoteInput: keep appearance, allow placeholder injection
`NoteInput` currently hardcodes the placeholder (`NoteInput.tsx` line ~16-26).

Minimal change:
- Add optional prop: `placeholder?: string`
- Pass through to `<TextField placeholder={placeholder ?? "Buraya not ekleyin..."} />`

No styling changes.

### ActiveWorkoutScreen: compute placeholder with priority
At render of each exercise (`ActiveWorkoutScreen.tsx` around line ~186+):
1. **Template note (highest priority):**
   - From `template?.exercises.find(...).notes` (new optional field)
   - Use if `trim().length > 0`
2. **Performance-memory note:**
   - `performanceMemoryStore.getExerciseNoteMemory(we.exerciseId, exercise.category)`
3. **Default:**
   - `"Buraya not ekleyin..."`

Then:
- `<NoteInput value={we.notes} placeholder={computedPlaceholder} ... />`

### “Empty edit should not override” rule
- `onChangeText` updates `WorkoutExercise.notes` always.
- `recordExerciseNoteMemory` only runs when `trim(value)` is non-empty.
- So clearing the input results in:
  - Visible empty input (user intent during session)
  - Next session placeholder still shows previous memory/template note.

---

## Persistence + Migration Plan (backward compatible)
### Schema strategy
- Increment `PerformanceMemoryStore.schemaVersion` from **2 → 3**.
- Keep existing v2 migration function intact for older snapshots.

### New migration function
Add `migratePerformanceMemoryStoreSnapshotToV3(input, exerciseStoreSnapshot)`:
- First, reuse existing `migratePerformanceMemoryStoreSnapshotToV2` to normalize legacy shapes.
- Then, ensure:
  - `schemaVersion: 3`
  - `noteMemories: {}` if missing/invalid
  - Keep `patternMemories` + `personalRecords` untouched.

### Root store setup
Update `app/models/setupRootStore.ts` (line ~32-43):
- Replace call to `migratePerformanceMemoryStoreSnapshotToV2` with `...ToV3`.
- Update fallback performance memory snapshot to include `noteMemories: {}` and `schemaVersion: 3`.

This maintains the same persistence architecture (secure storage) while expanding the stored shape.

---

## Testing Strategy (Definition of Done)
### Unit tests (models)
Add/extend tests in `app/models/PerformanceMemoryStore.test.ts`:
1. **Stores and returns note memory**
   - Call `recordExerciseNoteMemory({exerciseId:"bench-press", category:"STRENGTH", note:"Keep elbows tucked"})`
   - Expect `getExerciseNoteMemory(...)` returns the note.
2. **Does not overwrite on empty**
   - Seed with note `"A"`, then call record with `""` and with `"   "`
   - Expect stored note remains `"A"`.
3. **Does not affect set placeholders**
   - Existing tests for `patternMemories` should still pass unchanged.

### Migration tests
Add a dedicated test file or extend existing ones:
- Given a v2 snapshot (no `noteMemories`), `migratePerformanceMemoryStoreSnapshotToV3` returns a v3 snapshot with empty `noteMemories` and preserved `patternMemories`.

### UI tests (screen)
Update/add tests in `app/screens/__tests__/exerciseNotes.test.tsx`:
1. **Default placeholder remains Turkish when no template/memory**
   - Expect placeholder `"Buraya not ekleyin..."`.
2. **Memory placeholder**
   - Seed memory with note for bench press; start new session with bench press; expect placeholder equals memory note.
3. **Template note overrides memory**
   - Create a template with bench press `notes:"Template note"` and also seed memory note.
   - Start session from template; expect placeholder `"Template note"`.
4. **Clearing note doesn’t erase memory**
   - Seed memory note.
   - In a session, user types `""` (clear) → end session / start new one.
   - Expect placeholder still shows original memory note.

(Tests can remain using React Native Testing Library patterns already present in this repo.)

---

## Risk Assessment & Mitigations
| Risk | Prob. | Impact | Mitigation |
|------|-------|--------|------------|
| Excess snapshot writes while typing | Med | Low/Med | Keep simple initially; optionally debounce; only persist when `trim()` non-empty. |
| Migration regression for existing users | Low | High | Add v2→v3 migration tests; keep v2 migration intact and layered. |
| Placeholder priority bugs | Med | Med | UI tests for priority order; centralize placeholder computation in screen helper. |

---

## Rollback Plan
- **Trigger:** Increased crashes during rehydration or incorrect placeholder behavior.
- **Rollback steps:**
  1. Revert `setupRootStore` to use v2 migration and drop `noteMemories` field usage.
  2. Keep `NoteInput` placeholder default constant.
  3. Leave stored `noteMemories` in secure storage; it will be ignored by v2 logic (backward compatible).

---

## Design Principles Validation Checklist
### YAGNI
- [x] Only store exercise-level last note (no history, no per-set notes).
- [x] No new UI for editing templates; we reuse existing template save/update paths.

### KISS
- [x] Single `noteMemories` map keyed by `exerciseId::category`.
- [x] Record on `onChangeText` with simple non-empty guard.

### DRY
- [x] Reuse existing persistence path (`PerformanceMemoryStore` + secure snapshot storage).
- [x] Reuse existing category enums and migration pattern.

### Leverage Existing Systems
- [x] Keep `WorkoutExercise.notes` as session state; use `PerformanceMemoryStore` for persistence.
- [x] Keep set memory logic unchanged.

---

## Dependencies & Prerequisites
- No new libraries.
- Requires updating TypeScript types exposed from `app/models/index.ts` only if new exports are needed.

---

## Line Count Requirement
- **Line count ≤ 1000** (current: ~230; verify via `wc -l docs/exercise-notes-memory.plan.md`).
