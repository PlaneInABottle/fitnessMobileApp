# Revised Workout Set Interactions — Implementation Plan

## Executive Summary
- **Objective:** Revise Active Workout set interactions to match updated UX: tap-to-open set options from the set type pill, always-visible **Set** button that immediately adds a valid working set, remove Cancel and Undo Last Set, and keep rows always editable while Done only toggles styling.
- **Approach (YAGNI/KISS):** Reuse existing inline-edit `SetRow` + existing `WorkoutStore.addSetToWorkoutExercise` / `updateSetInWorkoutExercise` / `deleteSetFromWorkoutExercise`. Remove draft/undo UI states instead of adding new abstractions.
- **Primary touchpoints:**
  - `app/screens/ActiveWorkoutScreen.tsx` (set lifecycle + UI buttons + bottom sheet wiring)
  - `app/components/workout/SetOptionsBottomSheet.tsx` (reduce options)

## Reviewer Docs Read (Complete)
- `docs/ui-ux-improvements.review.md`
- `docs/screen-safe-area-headers.review.md`
- `docs/bug-fixes-validation.review.md`
- `docs/session-overlay.review.md`
- `docs/bug-audit.review.md`
- `docs/navigation-state-fixes.review.md`

## Current State (Key References)
- **Draft add-set flow + Cancel + Undo:**
  - `ActiveWorkoutScreen.tsx` contains `editingWorkoutExerciseId`, `draftSetData`, `draftTouched`, `inlineError`, `undoableSet` (lines ~29–45) and the undo expiry effect (lines ~46–58).
  - Draft add set is: `handleStartAddSet()` + draft `SetRow` + separate Cancel button (lines ~60–75 and ~258–286).
  - Undo button UI: (lines ~248–256) + handler `handleUndoLastSet` (lines ~175–179).
- **Rows already editable + Done only toggles green styling:**
  - Persisted sets are rendered using `SetRow mode="edit"` and `onDone={() => handleToggleDone(s.id)}` (lines ~225–246).
  - `SetRow` applies green styling when `isDone` is true (SetRow.tsx lines ~159–166).
- **Bottom sheet:**
  - `SetOptionsBottomSheet.tsx` currently shows **Edit Set**, **Delete Set**, **Change Type (X)** (lines ~84–109) with props `onEdit`, `onDelete`, `onChangeType`, `setTypeName` (lines ~17–24).
  - Bottom sheet is opened from set rows via `onPressSetType={() => handleOpenSetOptions(...)}` (ActiveWorkoutScreen.tsx line ~234) which is already a **tap** on the set type pill (SetRow.tsx lines ~206–222).

## Requirements
### Functional
1. **Bottom sheet opens on TAP of set type pill/text** (not long press).
2. **Remove Cancel button entirely** from ActiveWorkoutScreen.
3. **Add Set button always visible**; pressing it immediately adds a new set with:
   - `setType = 'working'`
   - all *required* numeric fields initialized to `0` so validation passes.
4. **Rows always editable**; pressing Done toggles done/undone styling (green) but does not exit edit.
5. **Remove Undo Last Set** feature.
6. **Bottom sheet options:** `Delete set`, `Change type` (optional: `Done/Undone` toggle if deemed useful).

### Non-functional
- **KISS:** Remove UI modes/state instead of adding new ones.
- **Data integrity:** New sets must pass `SetStore.validateSetData` (SetStore.ts lines ~50–98).
- **Accessibility:** Keep/use existing `accessibilityLabel` on set type pill and bottom sheet actions.

## Files to Modify (Expected)
### Source
1. `app/screens/ActiveWorkoutScreen.tsx`
2. `app/components/workout/SetOptionsBottomSheet.tsx`

### Tests
1. `app/screens/__tests__/undoSetFunctionality.test.tsx` (remove or repurpose)
2. `app/screens/__tests__/workoutFlow.test.tsx` (update add-set flow expectations)
3. `app/components/workout/__tests__/SetOptionsBottomSheet.test.tsx` (update options + props)
4. `app/screens/__tests__/activeWorkoutSetInteractions.test.tsx` (ensure still valid after sheet changes)

## Minimal Diffs Approach (What NOT to change)
- Do **not** change MST models (`WorkoutStore`, `SetStore`) or validation rules.
- Do **not** change `SetRow` editing logic; it already satisfies “rows always editable” and “Done toggles styling only”.
- Do **not** add new bottom sheet libraries; keep existing `Modal` + `Animated` implementation.

## Technical Design

### 1) Always-visible **Set** button that immediately adds a valid set
**Where:** `ActiveWorkoutScreen.tsx`.

**Current pain:** The draft flow exists only to collect required fields before insert (and enables Cancel/Undo). The new requirement is immediate creation with valid defaults.

**Plan:** Replace draft creation with a single handler (per workout exercise section):
- Determine the exerciseId for the current workoutExercise (`we.exerciseId` is already available).
- Compute required fields using existing API:
  - `exerciseStore.getRequiredFieldsForExercise(exerciseId)` (ExerciseStore.ts lines ~135–139).
- Build initial set data:
  ```ts
  const required = exerciseStore.getRequiredFieldsForExercise(exerciseId)
  const initialSetData: Partial<SetData> = {
    setType: "working",
    ...Object.fromEntries(required.map((k) => [k, 0])),
  }
  ```
  Rationale: `SetStore.validateSetData` rejects `undefined` for required fields (SetStore.ts lines ~79–81).
- Call `workoutStore.addSetToWorkoutExercise(workoutExerciseId, initialSetData)`.
- On failure, rely on the existing `workoutStore.lastError` display (already shown near the top of the screen, ActiveWorkoutScreen.tsx lines ~205–211).

**Edge cases (keep simple):**
- If required fields is empty (unknown exercise), still set `{ setType: "working" }` and let store validation fail; show existing error.

### 2) Remove Cancel button and all draft-add state
**Where:** `ActiveWorkoutScreen.tsx`.

**Remove:**
- State: `editingWorkoutExerciseId`, `draftSetData`, `draftTouched`, `inlineError`.
- Handlers: `handleStartAddSet`, `handleCancelAddSet`, `handleDraftChange`, `handleDoneAddSet`.
- UI: The conditional draft `SetRow` and `Button text="Cancel"` (currently lines ~258–283).

**Replace UI block with:**
- A single always-visible button at the bottom of each exercise’s set table.
- **Label choice:** Prefer **"Set"** to match requirement #3, but keep **"Add Set"** if you want the smallest UI copy change.

### 3) Keep rows editable; Done toggles styling only
**Where:** already implemented.

**Confirm wiring:**
- Existing sets remain rendered as:
  - `mode="edit"`
  - `isDone={!!doneSetIds[s.id]}`
  - `onDone={() => handleToggleDone(s.id)}`
- Ensure we do not introduce any logic that switches `mode` away from `"edit"`.

### 4) Bottom sheet opens on tap of set type
**Where:** `SetRow.tsx` already triggers set-type interactions via `Pressable onPress` (SetRow.tsx lines ~206–222).

**Screen wiring (explicit):**
- For each set row:
  - `onPressSetType={() => handleOpenSetOptions(we.id, idx, s.id, s.setType)}`

### 5) Remove Undo Last Set feature
**Where:** `ActiveWorkoutScreen.tsx`.

**Remove:**
- `undoableSet` state and its expiry `useEffect` (lines ~39–58).
- Undo button rendering (lines ~248–256).
- Handler `handleUndoLastSet` (lines ~175–179).
- Any undo-clearing in delete handler (lines ~151–158).

### 6) Bottom sheet options: Delete set, Change type (optional Done toggle)
**Where:** `SetOptionsBottomSheet.tsx` and its usage in `ActiveWorkoutScreen.tsx`.

**Minimal change option (recommended for smallest diff):**
- Keep existing component structure and animation.
- Remove **Edit Set** option and the `onEdit` prop.
- Keep **Delete Set**.
- Keep **Change Type (X)** as a single action that cycles to the next setType (current behavior via `handleChangeSetType()` in ActiveWorkoutScreen.tsx lines ~162–173).

**Optional (only if requested in this change):**
- Add a third option: **Mark Done** / **Mark Undone**.
  - Would require passing `isDone` and `onToggleDone` into the bottom sheet.
  - This is not necessary because the row already has an explicit Done button; keep out unless product confirms value.

## SetRow Prop Wiring (Explicit Contract)
This section describes how the screen should use the existing `SetRow` API without changing `SetRow` itself.

### For persisted set rows (`we.sets.map(...)`)
- `onPressSetType`:
  - Purpose: open bottom sheet for that set.
  - Example: `onPressSetType={() => handleOpenSetOptions(we.id, idx, s.id, s.setType)}`
- `onDone`:
  - Purpose: toggle done/undone styling only.
  - Example: `onDone={() => handleToggleDone(s.id)}`
- `onChange`:
  - Purpose: update store on every input edit.
  - `SetRow` calls `onChange({ ...value, [key]: nextValue }, key)`.
  - Screen should pass that object directly as the patch:
    - `onChange={(next) => workoutStore.updateSetInWorkoutExercise(we.id, s.id, next)}`
  - Rationale: `WorkoutStore.updateSetInWorkoutExercise` merges the patch and re-validates (WorkoutStore.ts lines ~226–244).

### For header row
- Keep: `SetRow category={exercise.category} mode="header"`.

## Computing initial setData for Add Set (Validation-safe)
Use existing ExerciseStore category/requirements as the single source of truth.

### Algorithm (KISS)
1. `requiredKeys = exerciseStore.getRequiredFieldsForExercise(exerciseId)`.
2. Build `initialSetData`:
   - Always include: `{ setType: "working" }`.
   - For each required key in `requiredKeys`, set numeric value to `0`.
3. Call `workoutStore.addSetToWorkoutExercise(workoutExerciseId, initialSetData)`.

### Why this passes validation
- `SetStore.validateSetData()` checks that every required field is present and finite (SetStore.ts lines ~74–95).
- The min constraints allow `0` today (SetStore.ts `FIELD_RANGES` lines ~26–32). This matches requirement “initialize to 0 so validation passes”.

## Implementation Steps (Numbered)
1. **ActiveWorkoutScreen — remove Undo Last Set**
   - Delete `undoableSet` state + expiry effect + UI + handler.
   - Update any tests that reference “Undo Last Set”.
2. **ActiveWorkoutScreen — remove draft add-set mode and Cancel**
   - Remove draft state and handlers.
   - Replace the conditional draft UI with a single button.
3. **ActiveWorkoutScreen — implement immediate add-set handler**
   - Create helper `buildInitialSetData(exerciseId: string): Partial<SetData>` in the screen module.
   - Wire button `onPress` to call `workoutStore.addSetToWorkoutExercise(we.id, buildInitialSetData(we.exerciseId))`.
4. **SetOptionsBottomSheet — remove Edit option**
   - Remove `onEdit` prop.
   - Remove “Edit Set” Pressable.
   - Ensure accessibility labels remain correct for remaining options.
5. **ActiveWorkoutScreen — bottom sheet props update**
   - Update `SetOptionsBottomSheet` usage to match new prop interface.
   - Keep `handleChangeSetType` and `handleDeleteSet` behaviors.

## Testing Strategy

### Update/remove existing tests
1. **Remove Undo tests**
   - `app/screens/__tests__/undoSetFunctionality.test.tsx`
   - Replace with one small assertion test OR delete the suite entirely.
   - Recommended: delete, because feature is explicitly removed.
2. **Update Workout MVP flow test**
   - `app/screens/__tests__/workoutFlow.test.tsx`
   - Replace:
     - Old flow: press “Add Set” → fill draft inputs → press done labeled “Add set”.
     - New flow: press “Set/Add Set” → assert a new row exists → edit inputs in that row.
   - Remove draft-only placeholder expectations if placeholders are no longer shown for the add flow.
3. **Update SetOptionsBottomSheet unit tests**
   - `app/components/workout/__tests__/SetOptionsBottomSheet.test.tsx`
   - Expect only “Delete Set” and “Change Type (X)” (and updated accessibility labels).
   - Update callbacks to match removed `onEdit`.
4. **Keep/adjust ActiveWorkout set interaction test**
   - `app/screens/__tests__/activeWorkoutSetInteractions.test.tsx`
   - Should remain mostly valid: it taps `"Set type: Working"` and expects modal to open, then toggles done and asserts inputs remain.

### Manual test checklist
- Start workout → add an exercise → press **Set/Add Set** repeatedly:
  - Each press should immediately add another set row.
  - No Cancel button should exist.
  - No Undo Last Set button should appear.
- Tap set type pill → bottom sheet opens.
- Press Change Type → set type changes and pill updates.
- Edit numeric fields inline; values persist.
- Press Done button; row styling toggles green but inputs remain editable.

## Risks & Considerations
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Users confuse default 0 values as “real data” | Medium | Low/Med | Accept per requirement; if needed later, reintroduce placeholders or leave fields blank and loosen validation (out of scope) |
| Removing Undo is behavior change | High | Low | Explicit requirement; remove tests and UI to avoid partial behavior |
| Bottom sheet prop interface change breaks tests | High | Low | Update tests in same PR |

## Success Criteria
- [ ] Bottom sheet opens on **tap** of set type pill/text.
- [ ] No Cancel button exists in ActiveWorkoutScreen.
- [ ] Set/Add Set button is always visible and immediately adds a set with `setType="working"` and required fields initialized to `0`.
- [ ] Set rows remain editable at all times; Done toggles styling only.
- [ ] Undo Last Set is fully removed (no UI, no state, no tests).
- [ ] Bottom sheet options are **Delete Set** and **Change Type** (optional Done toggle is not implemented unless explicitly approved).

## Design Principles Validation Checklist
### YAGNI
- [x] No new features beyond the six explicitly requested behaviors.
- [x] Optional Done toggle in sheet is explicitly deferred unless requested.

### KISS
- [x] Replace draft state machine with a single button handler.
- [x] Keep bottom sheet implementation and simply remove one option.

### DRY
- [x] Reuse `exerciseStore.getRequiredFieldsForExercise` for required fields.
- [x] Reuse `WorkoutStore` for validation + set mutation.

### Leverage Existing Systems
- [x] Keep existing stores, validation, UI components.
- [x] Keep existing bottom sheet animation implementation.

---
**Line count ≤ 1000 lines (current: run `wc -l docs/revised-workout-set-interactions.plan.md`).**
