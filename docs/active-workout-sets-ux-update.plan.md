# Active Workout – Sets UX Update Implementation Plan

## Executive Summary
- **Objective:** Align set entry/editing UX with updated requirements: tap-to-open set-type bottom sheet, remove Cancel, add “Set” (Add Set) button that immediately creates a new set with defaults, keep rows always editable, and remove undo-last-set.
- **Approach (KISS + existing system leverage):** Reuse existing `SetRow` inline edit mode and `WorkoutStore.addSetToWorkoutExercise` / `updateSetInWorkoutExercise` flows; simplify `ActiveWorkoutScreen` by removing draft/undo state; simplify `SetOptionsBottomSheet` to only set-type selection + delete.
- **Primary impact area:** `app/screens/ActiveWorkoutScreen.tsx` set lifecycle and `app/components/workout/SetOptionsBottomSheet.tsx` UI/props.

## Current State (code references)
- **Draft-based set creation + Cancel + Undo:**
  - `ActiveWorkoutScreen.tsx` maintains `editingWorkoutExerciseId`, `draftSetData`, `draftTouched`, `inlineError`, and `undoableSet` (lines 29–45, 39–58, 60–117, 175–179, 248–286).
  - UI enters a draft row (`SetRow mode="edit"`) with “Add set” done button + separate Cancel button (lines 258–283).
  - Undo button appears briefly after add (lines 248–256) and tests exist for this behavior (`app/screens/__tests__/undoSetFunctionality.test.tsx`).
- **Persisted sets already editable and “Done” toggles green styling only:**
  - Persisted sets are rendered with `SetRow mode="edit"` (lines 225–246) and `onDone` calls `handleToggleDone` (lines 132–134, 236).
  - `SetRow` applies green styling when `isDone` is true (SetRow.tsx lines 159–166).
- **Set options bottom sheet is a 3-option menu:**
  - `SetOptionsBottomSheet.tsx` shows “Edit Set”, “Delete Set”, “Change Type (X)” (lines 84–109) and expects props `onEdit`, `onDelete`, `onChangeType`, `setTypeName` (lines 17–24).

## Requirements
### Functional
1. **Bottom sheet opens on tap of set type (not long press).**
   - Expected: tapping the set type pill in an editable row opens the bottom sheet.
2. **Remove Cancel button entirely.**
   - No “draft add set” UI state that can be cancelled.
3. **Add “Set” button always visible.**
   - Pressing adds a new set immediately with `setType="working"`.
   - Initialize required fields to `0` for the exercise category.
4. **Rows always editable.**
   - Persisted sets use `SetRow mode="edit"`.
   - Pressing Done only toggles done/undone styling; it does not exit edit mode.
5. **Remove/disable undo-last-set (prefer remove).**
6. **Bottom sheet focuses on set type selection + delete.**
   - “Edit Set” option is not needed (inline edit is always available).

### Non-functional
- **Simplicity:** minimize state and UI modes (KISS).
- **Data integrity:** newly added sets must pass existing `SetStore.validateSetData` (required numeric fields present).
- **Accessibility:** keep meaningful `accessibilityLabel` for set-type tap target and actions.

## Technical Design
### A) Immediate set creation on “Add Set”
- **Where:** `ActiveWorkoutScreen.tsx`.
- **Design:** Replace the current draft flow (`handleStartAddSet` → edit row → `handleDoneAddSet`) with a single action handler:
  - Determine required fields using `exerciseStore.getRequiredFieldsForExercise(exerciseId)` (see `ExerciseStore.ts` lines 135–139).
  - Build `initialSetData: Partial<SetData> = { setType: "working", ...requiredFields.reduce((acc,k)=>({ ...acc, [k]: 0 }), {}) }`.
  - Call `workoutStore.addSetToWorkoutExercise(workoutExerciseId, initialSetData)`.
- **Why required fields must be set to 0:** `SetStore.validateSetData` rejects `undefined` for required fields (SetStore.ts lines 72–95).

### B) Always-editable rows + Done toggles style
- **Where:** already implemented in `ActiveWorkoutScreen.tsx` (persisted rows are `mode="edit"`, and `onDone` toggles `doneSetIds`).
- **Action:** keep this behavior; ensure no code path switches rows out of edit mode.

### C) Bottom sheet becomes “Set type selector + Delete”
- **Where:** `SetOptionsBottomSheet.tsx` and `ActiveWorkoutScreen.tsx`.
- **Design changes (minimal but sufficient):**
  - Remove “Edit Set” option from sheet and remove `onEdit` prop.
  - Replace “Change Type (cycle)” with a list of set types to pick from.
  - Proposed props:
    - `visible: boolean`, `onClose: () => void`, `onDelete: () => void`
    - `availableSetTypes: Array<{ id: SetTypeId; name: string }>`
    - `selectedSetTypeId: SetTypeId`
    - `onSelectSetType: (id: SetTypeId) => void`
  - UI:
    - Section title: “Set Type” (optional)
    - One button per type; visually indicate selected (e.g., bold text or checkmark)
    - “Delete Set” button (red)

### D) Remove undo-last-set
- **Where:** `ActiveWorkoutScreen.tsx`.
- **Design:** delete `undoableSet` state, expiry effect, and “Undo Last Set” UI.

## Implementation Steps (actionable)
1. **ActiveWorkoutScreen – remove draft add-set flow**
   - Update `app/screens/ActiveWorkoutScreen.tsx`:
     - Remove state: `editingWorkoutExerciseId`, `draftSetData`, `draftTouched`, `inlineError` (currently around lines 29–33) and their handlers (lines 60–117).
     - Replace the conditional UI that renders a draft `SetRow` + Cancel button (lines 258–283) with a single always-visible “Add Set” button.
2. **ActiveWorkoutScreen – implement immediate add with required fields = 0**
   - Add helper `buildInitialSetData(exerciseId)` in the screen (or inline in handler) using `exerciseStore.getRequiredFieldsForExercise`.
   - On “Add Set” press, call `workoutStore.addSetToWorkoutExercise(we.id, initialSetData)`.
   - Ensure the new set is editable immediately (already true because sets render with `mode="edit"`).
3. **ActiveWorkoutScreen – remove undo**
   - Remove `undoableSet` state + expiry effect (lines 39–58) and button rendering (lines 248–256) and handler (lines 175–179).
   - Remove any “clear undo” logic in delete handler (lines 151–158).
4. **SetOptionsBottomSheet – simplify to set type selection + delete**
   - Update `app/components/workout/SetOptionsBottomSheet.tsx`:
     - Update props (remove `onEdit`, `onChangeType`, `setTypeName`; add selection props).
     - Render list of set type options and a delete button.
     - Keep existing modal + slide animation pattern.
5. **ActiveWorkoutScreen – integrate new bottom sheet contract**
   - Replace `handleChangeSetType` (cycle logic, lines 162–173) with `handleSelectSetType(typeId)` that updates the selected set and closes sheet.
   - Update `SetOptionsBottomSheet` usage (lines 301–310) to pass available types and selected type id.
6. **Verify tap behavior (no long-press dependency)**
   - Ensure `SetRow` set-type pill continues to call `onPressSetType` on tap (SetRow.tsx lines 114–117, 206–222).

## Testing Strategy (tests to update)
### Update/Remove Tests
1. **Remove undo tests**
   - `app/screens/__tests__/undoSetFunctionality.test.tsx`
     - Either delete the file, or rewrite to assert no Undo button appears after adding a set.
     - Preferred (per requirement “prefer remove”): delete the tests and any references.
2. **Update workout flow tests that rely on draft-add UI**
   - `app/screens/__tests__/workoutFlow.test.tsx` (lines 129–151)
     - Replace steps:
       - Old: press “Add Set” → fill inputs → press done labeled “Add set”.
       - New: press “Add Set” → assert set count increments → edit the newly created row inputs (e.g., change reps/kg) → assert store updated.
     - Remove placeholder expectations tied to draft placeholders (lines 132–136, 147–151) unless product still wants placeholder suggestions.
3. **Update edge cases tests that rely on draft-add UI**
   - `app/screens/__tests__/edgeCases.test.tsx` (lines 72–87, 120–129)
     - Update to immediate add behavior and subsequent editing updates store.
4. **Update bottom sheet unit test**
   - `app/components/workout/__tests__/SetOptionsBottomSheet.test.tsx`
     - Update render expectations:
       - Old: “Edit Set”, “Delete Set”, “Change Type (Working)”.
       - New: “Delete Set” + set type list (e.g., “Warmup”, “Working”, “Drop Set”).
     - Update callback expectations to `onSelectSetType` and `onDelete` only.
5. **Update set interaction test**
   - `app/screens/__tests__/activeWorkoutSetInteractions.test.tsx`
     - Keep: tapping set type opens modal.
     - Update: assert that set type options are shown; optionally select a different type and assert store updates.

### New/Adjusted Coverage
- **Immediate add initializes required fields to 0** for each category:
  - Strength: `weight=0`, `reps=0`
  - Bodyweight: `reps=0`
  - Timed: `time=0`
  - Cardio: `time=0` (distance optional)
- **Inline editing updates store**: after editing an input, `WorkoutStore.updateSetInWorkoutExercise` persists changes.
- **Done toggles style only**: pressing done does not remove inputs.

## Risks & Considerations
- **UX change removes placeholder guidance:** currently placeholders come from `performanceMemoryStore.getPlaceholdersForSet` but are only wired for the draft row (ActiveWorkoutScreen.tsx lines 265–273). If UX still wants suggestions, we can optionally pass placeholders to persisted rows too (out of scope unless requested).
- **Validation edge:** initializing required fields to `0` means newly created sets are “valid” but may look like real values; ensure product is okay with 0 being the default.
- **Breaking change scope:** `SetOptionsBottomSheet` props change; internal-only component so impact should be limited to its import sites + tests.

## Success Criteria
- Tapping set type opens the bottom sheet.
- No Cancel button exists in Active Workout set entry.
- “Add Set” adds a new set immediately with setType=working and required numeric fields set to 0.
- All set rows remain editable at all times; Done toggles green highlight only.
- No Undo Last Set functionality or button remains.
- Bottom sheet contains set type selection controls and delete.

## Design Principles Validation Checklist
- **YAGNI:**
  - [x] No speculative features (e.g., advanced edit modes, multi-step wizards).
  - [x] Optional placeholder enhancements explicitly deferred.
- **KISS:**
  - [x] Single-step set creation; reduced UI states.
  - [x] Bottom sheet simplified to only necessary actions.
- **DRY:**
  - [x] Reuse existing `exerciseStore.getRequiredFieldsForExercise` and existing MST validation.
  - [x] Reuse existing `SetRow` edit behavior.
- **Leverage existing systems:**
  - [x] Keep `WorkoutStore` APIs; only adjust UI behavior.

**Line count ≤ 1000 lines (current: ~230).**
