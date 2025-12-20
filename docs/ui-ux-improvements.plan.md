# UI/UX Improvements (10 items) — Implementation Plan

## Executive Summary
- **Objective:** Implement 10 targeted UI/UX improvements in workout logging and related screens with minimal behavioral risk.
- **Approach:** Prefer local/UI-only state changes where possible (KISS/YAGNI), reuse existing components and patterns (DRY), and avoid broad model changes unless required.
- **Timeline:** ~0.5–1.5 dev-days (mostly UI polish + one state-derivation change for volume).
- **Success Metrics:** Placeholder/done visuals match spec, set numbering stays sequential, counters update only on done toggle, and requested UI elements/spacing are updated.

## Current State (Repo Evidence)
- **Set row placeholder & done styling:** `app/components/workout/SetRow.tsx`
  - Placeholder/done logic in `renderFieldCell` (around lines **142–205**). `shouldForceDoneZero` currently requires `normalizedKgRepsCurrent === 0` (lines **156–161**) and does not treat `undefined` as needing a forced 0.
  - Row background alternation uses `colors.palette.neutral100/200` via `rowStyle` (lines **214–234**); the row background does **not** change to green when done.
- **Active workout list + numbering + counters:** `app/screens/ActiveWorkoutScreen.tsx`
  - Working set index numbering already sequential within each exercise section using `workingIndex` and `displayIndex` (lines **167–199**).
  - Done state tracked UI-only via `doneSetIds` (lines **33–79**); header setsCount uses `completedSetsCount` derived from `doneSetIds` (lines **64–67**, **124–125**).
  - Header volume currently uses `workoutStore.totalVolume` (line **123**), which updates live as the user types.
- **Default set for new exercise:** `app/models/WorkoutStore.ts`
  - `addExerciseToSessionUnsafe` adds one default working set snapshot (lines **206–220**) built from required fields set to `0` (lines **175–182**, **184–190**).
- **Session overlay bar buttons:** `app/components/session/SessionOverlayBar.tsx`
  - Devam uses `Icon caretLeft` (line **36**) and text size `md` (line **37**). Sil also uses size `md` (line **47**).
- **Workout tab pills:** `app/screens/WorkoutTabScreen.tsx` includes a pill labeled **“Keşfet”** (lines **113–125**).
- **Exercise library search spacing:** `app/screens/ExerciseLibraryScreen.tsx` `$searchContainer` has no `paddingTop` (lines **210–216**).

## Reviewer Documents
- None found/required for this change set (no reviewer docs referenced in repo context).

## Requirements → Implementation Plan (Numbered Mapping)

### 1) Placeholder styling: done should show white bold `0` even when untouched and value is `undefined`
**Files:**
- `app/components/workout/SetRow.tsx`
- Tests: `app/components/workout/__tests__/SetRow.test.tsx`

**Plan:**
- In `SetRow.tsx` `renderFieldCell` (lines **142–205**), update `shouldForceDoneZero` (currently lines **156–161**) to treat numeric fields (`weight`, `reps`) with `current === undefined` as also requiring forced display of `"0"` when:
  - `isDone === true`
  - `isKgOrReps === true`
  - not touched (`!isTouched`)
  - and current is either `0` **or** `undefined`
- Ensure in the forced-done case:
  - `inputValue` becomes `"0"` (already happens when `shouldForceDoneZero` is true; lines **168–174**)
  - placeholder is not used (because value is non-empty)
  - styling uses the existing forced-done override `color: "#FFFFFF"` + bold font family (line **200**).

**Test updates:**
- Add a new test case to `SetRow.test.tsx` similar to `"shows Kg/Reps as 0 when set is done and untouched"` (lines **44–58**) but with `initialValue={{ setType: "working" }}` (omitting weight/reps) and `isDone` true.

**Success criteria:**
- Pressing done on a row where Kg/Reps were never typed shows bold white `0` (not placeholder styling), even if underlying values are missing/undefined.

---

### 2) Default normal set for new exercise
**Files:**
- (Verification only) `app/models/WorkoutStore.ts`

**Plan:**
- Confirm current behavior already matches requirements:
  - `addExerciseToSessionUnsafe` creates `sets: [buildDefaultWorkingSetSnapshot(...)]` (lines **213–219**).
  - `buildDefaultWorkingSetData` sets `setType: "working"` and required numeric fields to `0` (lines **175–182**).
- **No code change planned**.

**Success criteria:**
- Adding an exercise creates exactly one default working set with required numeric fields initialized to 0.

---

### 3) Sequential normal set numbering (1 F 2 etc)
**Files:**
- (Verification only) `app/screens/ActiveWorkoutScreen.tsx`
- (Verification only) `app/components/SetTypeIndicator.tsx`

**Plan:**
- Keep existing numbering logic:
  - `displayIndex = isWorking ? ++workingIndex : undefined` (ActiveWorkoutScreen lines **171–174**)
  - `SetTypeIndicator` displays `index` for working sets else type letter (line **35**).
- Confirm no other screens render `SetRow` (repo grep shows only `ActiveWorkoutScreen.tsx`).

**Success criteria:**
- Mixed set types render `1, F, 2...` (already validated by `activeWorkoutSetInteractions.test.tsx` lines **33–62**).

---

### 4) Row UI redesign: no input boxes; alternating black/gray; completed rows override to green; done button separate
**Files:**
- `app/components/workout/SetRow.tsx`
- Potential test touch-ups: `app/screens/__tests__/activeWorkoutSetInteractions.test.tsx`, `app/components/workout/__tests__/SetRow.test.tsx`

**Plan (minimal-change interpretation):**
- Keep the existing table layout and editability, but restyle to look “inline” rather than “boxed”.
- In `SetRow.tsx`:
  1. Update `rowStyle` (lines **214–234**) to:
     - **Priority 1:** if `isDone` true, row background uses `colors.success` (or a success palette token) (satisfies #7).
     - **Priority 2:** else, alternating dark backgrounds based on `rowIndex` (preferred) or `index` for completed mode.
       - Prefer theme palette neutrals appropriate to the current theme (Existing Systems).
  2. Inputs: verify `$input` remains borderless/transparent (lines **362–372**) and does not introduce background “boxes”.
  3. Ensure text contrast is sufficient on darker backgrounds:
     - If needed, adjust `$previousText` (lines **356–360**) and/or default input/text colors to remain readable.
  4. Done button remains visually distinct:
     - Keep `$doneButton` / `$doneButtonDone` (lines **374–399**). Optionally adjust border/size only if it improves clarity on green row backgrounds.

**Risk & mitigation:**
- **Risk:** Dark alternating colors may reduce readability in light theme.
- **Mitigation:** Derive colors from theme rather than hard-coded hex; manually verify in both themes.

**Success criteria:**
- Rows look borderless/inline.
- Alternating dark row backgrounds are visible.
- Done state turns entire row green (override).

---

### 5) Devam button arrow position and increase Sil/Devam text size
### 6) Arrow direction should point right
**Files:**
- `app/components/session/SessionOverlayBar.tsx`
- Potential test touch-up: `app/components/session/__tests__/SessionOverlay.test.tsx`

**Plan:**
- In `SessionOverlayBar.tsx`:
  - Replace `Icon icon="caretLeft"` for Devam (line **36**) with `caretRight`.
  - Keep icon left of the label (layout already places Icon before Text).
  - Increase text size for both Devam and Sil from `size="md"` (lines **37**, **47**) to the next larger token (likely `lg`).

**Success criteria:**
- Devam shows a right-pointing arrow on the left of the word.
- Both buttons have larger text.

---

### 7) Completed row backgrounds green
**Files:**
- `app/components/workout/SetRow.tsx`

**Plan:**
- Implement as part of requirement #4 by prioritizing `isDone` in `rowStyle`.

**Success criteria:**
- Toggling done immediately turns the entire row background green.

---

### 8) Remove “Keşfet” button from WorkoutTabScreen
**Files:**
- `app/screens/WorkoutTabScreen.tsx`

**Plan:**
- Remove the `Pressable` pill containing the “Keşfet” label (lines **120–124**).
- Keep the “Yeni Rutin” pill and layout spacing intact.

**Success criteria:**
- “Keşfet” is no longer present.

---

### 9) Hacim (volume) and Sets counters update only when row done (not while typing)
**Files:**
- `app/screens/ActiveWorkoutScreen.tsx`
- Tests likely impacted/added: `app/screens/__tests__/activeWorkoutSetInteractions.test.tsx`, `app/screens/__tests__/workoutFlow.test.tsx`

**Plan (KISS/YAGNI, minimal blast radius):**
- Keep `workoutStore.totalVolume` unchanged (model stays “live”).
- Compute a UI-only `completedVolumeKg` based solely on done toggles:
  1. Add local state near `doneSetIds` (line **33**):
     - `doneSetVolumes: Record<string, number>` where value is the set’s volume snapshot at the time it’s marked done.
  2. Update `handleToggleDone` (lines **77–79**) signature to accept `workoutExerciseId` + `setId` so it can locate the set’s current values at toggle time.
     - **On marking done:** compute `volume = (weight ?? 0) * (reps ?? 0)` but only when both are finite numbers (mirror `WorkoutStore.totalVolume` logic at lines **122–133**).
     - Store `doneSetVolumes[setId] = volume`.
     - **On unmarking done:** delete `doneSetVolumes[setId]`.
  3. Derive `completedVolumeKg` via `useMemo(() => sum(Object.values(doneSetVolumes)), [doneSetVolumes])`.
  4. Pass `volumeKg={completedVolumeKg}` to `WorkoutHeader` instead of `workoutStore.totalVolume` (currently line **123**).
  5. Update delete-set flow (lines **91–96**) to also delete `doneSetVolumes[setId]`.

**Behavioral note (explicit):**
- Editing a set after it’s marked done does not affect header volume until the user toggles done off/on again (snapshot-at-done).

**Success criteria:**
- Header Sets count changes only on done toggle (already).
- Header Volume changes only when toggling done (no live updates while typing).

---

### 10) Add Exercise screen spacing: add paddingTop above search bar
**Files:**
- `app/screens/ExerciseLibraryScreen.tsx`

**Plan:**
- Add `paddingTop` to `$searchContainer` (lines **210–216**) using theme spacing (e.g., `spacing.sm` or `spacing.md`).

**Success criteria:**
- Visible additional spacing above the search field.

## Tests to Run (Jest)
Recommended order:
1. `yarn test app/components/workout/__tests__/SetRow.test.tsx`
2. `yarn test app/screens/__tests__/activeWorkoutSetInteractions.test.tsx`
3. `yarn test app/screens/__tests__/workoutFlow.test.tsx`
4. `yarn test` (full suite, if time)

Likely coverage:
- `SetRow.test.tsx` covers placeholder vs done-zero behavior.
- `activeWorkoutSetInteractions.test.tsx` covers mixed-type numbering and done toggling + editability.
- `workoutFlow.test.tsx` covers the MVP flow (start, add exercise, add set, complete).

## Acceptance Criteria Checklist
- [ ] (1) Done + untouched shows Kg/Reps as white bold `0` even if underlying value is `undefined`.
- [ ] (2) Adding an exercise creates one default working set with required numeric fields initialized to 0.
- [ ] (3) Working sets are numbered sequentially among working sets only (e.g., `1, F, 2`).
- [ ] (4) Set rows have no visible input borders/boxes; row has solid alternating dark backgrounds.
- [ ] (7) When done, entire row background becomes green and overrides alternation.
- [ ] (5) Devam/Sil text size increased.
- [ ] (6) Devam arrow points right and remains left of the label.
- [ ] (8) “Keşfet” pill removed from WorkoutTabScreen.
- [ ] (9) Header volume and sets counters only change on done toggle (volume is snapshot-at-done).
- [ ] (10) ExerciseLibrary search area has extra top padding.

## Risk Assessment & Mitigation
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Contrast issues with darker alternating rows in light theme | Medium | Medium | Use theme palette tokens rather than hard-coded colors; validate both themes manually. |
| Volume snapshot logic differs from `WorkoutStore.totalVolume` | Low | Medium | Keep store logic unchanged; apply snapshot only to header display. |
| Tests become brittle due to style changes | Medium | Low | Prefer behavioral assertions (text/value/labels) over snapshots; update only necessary assertions. |

## Rollback Plan
- If regressions occur:
  1. Revert header volume prop in `ActiveWorkoutScreen.tsx` back to `workoutStore.totalVolume`.
  2. Revert `SetRow.tsx` `rowStyle` changes to previous palette neutrals.
  3. Keep placeholder undefined-handling fix (#1) as a safe standalone improvement.

## Design Principles Validation (Mandatory)
- **YAGNI:** No speculative features; all scope maps to the 10 explicit requests.
- **KISS:** Local UI state for volume snapshots; minimal model churn.
- **DRY:** Reuse existing `weight * reps` volume definition; use theme styles/tokens.
- **Leverage Existing Systems:** Use existing `ThemeProvider` spacing/palette and icon set (`caretRight`).

## Line Count
- **Maximum Length:** 1000 lines
- **Current Line Count:** 238 lines (`wc -l docs/ui-ux-improvements.plan.md`).
