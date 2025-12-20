# UI/UX Improvements (5 items) — Implementation Plan

## Executive Summary
- **Objective:** Apply 5 small UX/UI improvements requested across workout set rows, workout session initialization, and session overlay actions.
- **Approach:** Minimal, localized changes leveraging existing patterns (current SetRow placeholder logic, ActiveWorkoutScreen workingIndex logic, existing MST store structure).
- **Timeline:** ~0.5–1 day.
- **Success Metrics:** Visual behavior matches requirements; existing Jest suite passes with minimal assertion updates.

## Current-State Notes (files reviewed)
- `app/components/workout/SetRow.tsx` (placeholder logic + row styling) — lines ~145–219, ~244–282.
- `app/screens/ActiveWorkoutScreen.tsx` (working set numbering + set row mapping) — lines ~160–207.
- `app/models/WorkoutStore.ts` (session/exercise initialization) — lines ~179–227.
- `app/components/SetTypeIndicator.tsx` (working index display) — lines ~31–45.
- `app/components/session/SessionOverlayBar.tsx` (button layout) — lines ~29–48.
- Tests:
  - `app/models/WorkoutStore.test.ts` — lines ~44–52.
  - `app/components/workout/__tests__/SetRow.test.tsx` — placeholder + style assertions.
  - `app/components/__tests__/SetTypeIndicator.test.tsx` — working index behavior.

## Requirements Analysis
### Functional Requirements
1. **Done-set display for untouched 0 values:** When `isDone=true` and user never typed, show `0` as **white + bold** (not placeholder styling).
2. **Default set on add exercise:** `addExerciseToSessionUnsafe` should create a `WorkoutExercise` with **one default `working` set** with required numeric fields set to `0`.
   - `startSessionFromTemplateUnsafe` must use the same helper so template-based sessions also get default sets.
3. **Sequential working set numbering:** Ensure the UI shows sequential numbers **only for `working`** sets (ignoring warmup/dropset/failure).
4. **SetRow UI redesign:**
   - Remove “input box” look (transparent background/padding; `underlineColorAndroid="transparent"`).
   - Alternate row background (solid) by row order using new prop `rowIndex` (0-based from `map`).
   - Keep done button behavior intact.
5. **SessionOverlayBar buttons:** Move continue arrow icon **left of** `Devam` and increase text size for `Devam` and `Sil`.

### Non-Functional Requirements
- **Minimal diff / low risk:** avoid refactors; keep existing APIs unless needed.
- **Maintain existing theme usage:** rely on `colors.palette.neutral100/neutral200` etc.

## Design Principles Analysis (Mandatory)
- **YAGNI:** Only implement the 5 requested UI/UX changes; no new set types, no extra persistence behavior.
- **KISS:** Add one `rowIndex?: number` prop and a small MST helper; keep logic local to SetRow/WorkoutStore.
- **DRY:** Introduce a single WorkoutStore helper to create the default `working` set snapshot; reuse for template start via `addExerciseToSessionUnsafe` (or explicitly call helper from both).
- **Leverage existing systems:** Use existing `exerciseStore.getRequiredFieldsForExercise()` and existing `SetTypeIndicator` index behavior.

## Technical Design

### 1) SetRow: done + untouched 0 should render as white/bold "0"
**File:** `app/components/workout/SetRow.tsx`

**Current behavior:**
- For `weight`/`reps`, if `!isTouched` and value is `0|undefined`, `shouldShowPlaceholder` becomes true (line ~153–156) and `inputValue` is `""`, making the placeholder appear with `placeholderTextColor` dim styling.

**Change (minimal):**
- When `isDone===true` and `key` is `weight|reps` and `current` is `0` and `!isTouched`, force:
  - `shouldShowPlaceholder = false`
  - `inputValue = "0"`
  - apply `color: "#FFFFFF"` (or `colors.text` if already white in theme) and bold font.

**Success criteria:**
- Marking a set done (without typing) shows visible `0` values in white, bold text, with no placeholder.

### 2) WorkoutStore: new exercise starts with one default working set
**File:** `app/models/WorkoutStore.ts`

**Current behavior:**
- `addExerciseToSessionUnsafe` pushes `sets: []` (line ~196–202).
- `startSessionFromTemplateUnsafe` calls `addExerciseToSessionUnsafe` for each template exercise (line ~224–226).

**Change (minimal, DRY):**
- Add private helper in `.actions` scope:
  - `function buildDefaultWorkingSetData(exerciseId: string): Partial<SetData>`
    - uses `root.exerciseStore.getRequiredFieldsForExercise(exerciseId)`
    - returns `{ setType: "working", ...requiredFields: 0 }`
  - `function buildDefaultWorkingSetSnapshot(exerciseId: string): ExerciseSetSnapshotIn`
    - `id: generateId()`
    - `...buildSetSnapshot(buildDefaultWorkingSetData(exerciseId))`
- In `addExerciseToSessionUnsafe`, initialize `sets: [buildDefaultWorkingSetSnapshot(exerciseId)]`.
- Ensure `startSessionFromTemplateUnsafe` continues to call `addExerciseToSessionUnsafe` (already shares behavior).

**Success criteria:**
- After adding an exercise, `currentSession.exercises[n].sets.length === 1` and required fields are `0`.
- Template-based sessions also start each exercise with exactly one default working set.

### 3) Sequential working set numbering + SetTypeIndicator
**Files:**
- `app/screens/ActiveWorkoutScreen.tsx`
- `app/components/SetTypeIndicator.tsx`
- `app/components/workout/SetRow.tsx`

**Current behavior:**
- ActiveWorkoutScreen computes `workingIndex` and passes `index={displayIndex}` only for working sets (line ~176–203).
- SetRow passes `index` through to SetTypeIndicator only when `setTypeId === "working"` (line ~253–257).
- SetTypeIndicator renders the numeric index only for working sets (line ~35).

**Change:**
- Likely **no functional change needed**; only ensure that with the new `rowIndex` prop (requirement #4), the working `index` logic stays intact.

**Success criteria:**
- For a set list like `[warmup, working, dropset, working]`, badges display `[W, 1, D, 2]`.

### 4) SetRow redesign: remove input box look + alternating row backgrounds
**Files:**
- `app/components/workout/SetRow.tsx`
- `app/screens/ActiveWorkoutScreen.tsx`

**Change A — new prop:**
- Add `rowIndex?: number` to `SetRowProps`.
- In ActiveWorkoutScreen map, change `we.sets.map((s) => ...)` to `we.sets.map((s, i) => ...)` and pass `rowIndex={i}`.

**Change B — alternating backgrounds:**
- Update `rowStyle` in SetRow:
  - Highest priority: `isDone` keeps current success background.
  - Else if `typeof rowIndex === "number"`, use `rowIndex % 2` to select `colors.palette.neutral100` vs `colors.palette.neutral200`.
  - Keep borderRadius/padding consistent.

**Change C — inputs styling:**
- Update `$input` style to remove boxy look:
  - `backgroundColor: "transparent"`
  - reduce/remove padding
- Add `underlineColorAndroid="transparent"` to `TextInput`.

**Success criteria:**
- Rows show alternating solid backgrounds.
- Inputs appear as plain text fields, not “cards/boxes”.

### 5) SessionOverlayBar button tweaks
**File:** `app/components/session/SessionOverlayBar.tsx`

**Change (minimal):**
- In Continue button, render `<Icon .../>` before `<Text text="Devam" .../>`.
- Increase size props for both `Devam` and `Sil` from `size="xs"` to `size="sm"` (or next available), keeping weights.

**Success criteria:**
- Continue button reads: `[icon] Devam`.
- Devam/Sil text is visibly larger.

## Implementation Roadmap
### Phase 1 — Store defaults (WorkoutStore)
- Implement helper(s) and update `addExerciseToSessionUnsafe`.
- Validate template start still works.

### Phase 2 — SetRow visual changes
- Add `rowIndex` prop and alternating background.
- Adjust done+placeholder edge case.
- Remove input box styling.

### Phase 3 — SessionOverlayBar layout
- Swap icon/text order for continue.
- Increase text sizes.

### Phase 4 — Tests update
- Update failing assertions only (see below).

## Jest Test Impact + Minimal Assertion Updates
### `app/models/WorkoutStore.test.ts`
- Test "creates a session..." currently asserts new exercise has `sets` length **0** (lines ~44–52).
  - **Update** to `expect(sets).toHaveLength(1)`.
  - Optionally add minimal value check: `expect(sets?.[0].setType).toBe("working")`.

### `app/components/workout/__tests__/SetRow.test.tsx`
- Existing placeholder test remains valid because it does **not** set `isDone=true`.
- If styling changes cause snapshot/style differences:
  - Keep existing fontFamily assertions (bold on typed values) as-is.
  - Add **one new test** (only if required) for requirement #1:
    - render SetRow with `isDone={true}` and `value={{ weight:0, reps:0 }}` and ensure `Kg`/`Reps` inputs `props.value === "0"`.

### `app/components/__tests__/SetTypeIndicator.test.tsx`
- No change expected (already asserts index display for working sets).

## Risk Assessment
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Default set changes affect flows expecting zero sets | Medium | Medium | Update tests; visually confirm UI doesn’t duplicate sets on add-set. |
| Placeholder logic regression for non-done sets | Low | Medium | Keep conditional scoped to `isDone && weight/reps && value===0 && !touched`. |
| Theme palette mismatch for alternating backgrounds | Low | Low | Use existing `colors.palette.neutral100/neutral200` already in theme. |

## Rollback Plan
- Revert commits that change `WorkoutStore.ts`, `SetRow.tsx`, `ActiveWorkoutScreen.tsx`, `SessionOverlayBar.tsx`.
- Verify rollback by running `npm test` (or repo’s existing Jest command) and manually checking set entry UI.

## Dependencies & Prerequisites
- None beyond existing stores/theme/components.

## Validation Checklist
- [ ] YAGNI: only requested 5 changes implemented.
- [ ] KISS: single new prop (`rowIndex`) and one store helper.
- [ ] DRY: shared helper used for default set creation.
- [ ] Existing systems leveraged (exerciseStore required fields, existing SetTypeIndicator behavior).
- [ ] Jest tests updated minimally.
- [ ] **Line count ≤ 1000** (current: 187).
