# UI Refinement Mission — Implementation Plan

## Executive Summary
- **Objective:** Apply 5 targeted UI/polish fixes across Active Workout + templates + workout completion stats + routine card CTA.
- **Approach (KISS/YAGNI):** Localized style tweaks + small derivation/placeholder fixes; **no new data structures** and no new screens.
- **Primary success metrics:**
  - ActiveWorkout list has **no unwanted vertical gaps** between sections/rows.
  - Starting from a template shows template numbers as **placeholders** (not pre-filled values), including **time/distance**.
  - WorkoutComplete shows correct **exercise** and **set** counts.
  - RoutineCard “Start Routine” text is white.
  - Inputs have more horizontal breathing room while row backgrounds remain full-bleed.

## Context / Repo Evidence (files + current lines)
- **ActiveWorkout gaps:** `app/screens/ActiveWorkoutScreen.tsx`
  - `$content.gap = spacing.lg` (lines **271–276**)
  - `$exerciseSection.gap = spacing.sm` (lines **278–283**)
  - `$setsContainer.gap = spacing.xs` (lines **285–287**)
- **SetRow header spacing + placeholder behavior:** `app/components/workout/SetRow.tsx`
  - `$headerRow.paddingVertical = 4` and `marginBottom = 4` (lines **385–389**)
  - Placeholder-showing logic is currently gated to **Kg/Reps** (lines **154–177**)
- **Template → session set values are copied in full:** `app/models/WorkoutStore.ts`
  - `buildWorkoutExercisesFromTemplate(...)` sets `weight/reps/time/distance` from template (lines **239–273**)
- **Workout complete stats calculation:** `app/screens/WorkoutCompleteScreen.tsx`
  - `exerciseCount` and `totalSets` derived in `useMemo` (lines **39–61**)
- **Routine CTA text color:** `app/components/RoutineCard.tsx`
  - `$startButtonText.color = colors.palette.neutral100` (lines **95–98**)
- **Note input indentation:** `app/components/workout/NoteInput.tsx`
  - `$inputIndent.marginHorizontal = spacing.md` (lines **39–41**)

## Reviewer / Existing Plan Docs Read (complete)
- `docs/workout-inputs-ui-fixes.plan.md`
- `docs/ui-ux-improvements.plan.md`
- `docs/workout-ui-styling-and-persistence.plan.md`
- `docs/note-ui-refinement.plan.md`
- `docs/workout-persistence.md`

---

## Requirements Analysis

### (1) Remove gaps between exercise rows/sections in ActiveWorkout
**Goal:** Visually remove extra spacing between exercise blocks and between set rows.

### (2) Template placeholders when starting a session from template
**Goal:** Template set numbers should appear as placeholders (suggested values), not pre-filled values.
- Must work for **weight/reps/time/distance**.
- Must **not** change persisted data structures.

### (3) Workout completion numbers bug
**Goal:** Fix incorrect exercise/set counts on the WorkoutComplete screen **without changing data structures**.

### (4) RoutineCard Start Routine text white
**Goal:** Ensure the button label is white in all themes.

### (5) Increase horizontal gaps for inputs while keeping full-width row backgrounds
**Goal:** Increase internal padding/indent for NoteInput and SetRow numeric columns without adding outer margins that reduce background width.

---

## Technical Design (Design Principles Applied)

### YAGNI
- No new template fields or models.
- No migration/versioning work.
- No new placeholder “engine”; use existing `SetRow.placeholders` prop and existing template data.

### KISS
- Spacing changes are **single-line style tweaks**.
- Template placeholders are derived at render-time (ActiveWorkout) from `session.templateId` + `workoutStore.templates`.

### DRY
- Build a tiny helper inside `ActiveWorkoutScreen` (inline function) to compute per-set placeholders from template data.

### Leverage Existing Systems
- Use existing:
  - MST `WorkoutStore.templates` and `WorkoutSession.templateId`
  - `SetRow.placeholders` prop
  - theme spacing tokens (`spacing.*`)

---

## Implementation Roadmap

### Phase 0 — Baseline + repro checklist
1. Run: `npm test`.
2. Manual repro checklist:
   - Active workout: multiple exercises + multiple sets → visually inspect vertical gaps.
   - Start routine from a template that has stored set numbers → verify inputs show placeholders.
   - Complete workout → verify WorkoutComplete “Egzersiz” and “Set” match reality.

**Success criteria:** Baseline tests pass; issues reproduced/confirmed.

---

### Phase 1 — Remove ActiveWorkout vertical gaps (Requirement #1)

#### File: `app/screens/ActiveWorkoutScreen.tsx`
**Change set (minimal diffs):**
1. `$content` (lines **271–276**)
   - `gap: spacing.lg` → `gap: 0`
2. `$exerciseSection` (lines **278–283**)
   - `gap: spacing.sm` → `gap: 0`
3. `$setsContainer` (lines **285–287**)
   - `gap: spacing.xs` → `gap: 0`

**Optional micro-tweak (only if still visible gaps):**
- If a remaining gap is caused by SetRow header spacing (see Phase 2), adjust there (preferred) rather than adding new wrappers.

**Validation:**
- Set header row sits flush to first set row.
- Exercises stack without large vertical whitespace.

**Rollback:** Revert these three `gap` values.

---

### Phase 2 — SetRow spacing + placeholder logic for time/distance (Requirements #1, #2, #5)

#### 2A) Reduce header spacing
**File:** `app/components/workout/SetRow.tsx`
- `$headerRow` (lines **385–389**)
  - `marginBottom: 4` → `marginBottom: 0`
  - (Optional) `paddingVertical: 4` → `paddingVertical: 2` (only if header still feels tall)

#### 2B) Extend placeholder behavior to time/distance
**Problem:** Current placeholder-show logic is gated to `weight/reps` only (lines **154–177**).

**Minimal design:**
- Treat *any* numeric field (`weight`, `reps`, `time`, `distance`) as placeholder-eligible when:
  - not touched
  - not done-forced
  - value is `0` or `undefined`

**Implementation details (in `renderFieldCell`, edit branch):**
- Replace `isKgOrReps` gating with a generalized `normalizedCurrent` and `isZeroOrUndefined`.
- Keep existing “done forces 0” behavior, but apply it consistently.

**Expected behavior:**
- TIMED/CARDIO rows show placeholder text (template or default) instead of rendering literal `0`.

#### 2C) Increase horizontal “breathing room” inside set cells
**File:** `app/components/workout/SetRow.tsx`
- `$cell.paddingHorizontal` (line **401–404**) increase from `8` → `12` (or `14`).
- `$previousCell.paddingHorizontal` (line **396–400**) increase from `8` → `12` (match `$cell`).

**Why this meets “full-width background” requirement:**
- Background is applied on the row container; changing cell padding does not add outer margins.

#### Tests (recommended, small additions)
**File:** `app/components/workout/__tests__/SetRow.test.tsx`
- Add a new harness for `category="TIMED"` (or modify existing Harness to accept `category`) and test:
  - When `time: 0` untouched → input `value === ""` (placeholder visible).
  - When `isDone` and `time` is `0/undefined` → input `value === "0"`.

**Success criteria:** SetRow tests cover time placeholder behavior.

---

### Phase 3 — Template placeholders end-to-end (Requirement #2)

#### 3A) Stop copying template numeric values into session sets
**File:** `app/models/WorkoutStore.ts`
**Where:** `buildWorkoutExercisesFromTemplate(...)` (lines **239–273**)

**Minimal diff intent:**
- Keep:
  - same exercise order
  - same number of sets
  - same `setType` per set
- Change:
  - Do **not** set `weight/reps/time/distance` to template values; initialize required numeric fields to `0`.

**Suggested implementation:**
- For each template set `s`, build session set data from **required fields**:
  - `const base = buildDefaultWorkingSetData(te.exerciseId, root)`
  - `const setData = { ...base, setType: s.setType as SetTypeId }`
  - (Optional) keep `restTime` as actual if you want it persisted; otherwise omit (YAGNI).

This keeps validation intact (`validateSetData`) while ensuring the UI can show placeholders.

#### 3B) Pass template numbers as `SetRow.placeholders`
**File:** `app/screens/ActiveWorkoutScreen.tsx`
**Where:** inside `session.exercises.map` + `we.sets.map` (lines **183–231**)

**Plan:**
1. If `session.templateId` exists, fetch the template:
   - `const template = workoutStore.templates.get(session.templateId)`
2. For each workout exercise `we`, find matching template exercise:
   - `const te = template?.exercises.find((x) => x.exerciseId === we.exerciseId)`
3. For each set index `i`, read the corresponding template set:
   - `const ts = te?.sets[i]`
4. Pass placeholders:
   - `placeholders={{ weight: ts?.weight != null ? String(ts.weight) : undefined, reps: ... , time: ..., distance: ... }}`

**Edge cases (handled simply):**
- If template missing exercise or set index out of range → omit placeholders (SetRow falls back to default placeholder).
- If user adds extra sets during the session → extra sets have no template placeholder (expected).

**Success criteria:**
- Starting from template shows template numbers in placeholder text, not as prefilled values.

---

### Phase 4 — Fix WorkoutComplete counts bug (Requirement #3)

#### Hypothesis (most likely root cause)
`WorkoutCompleteScreen` derives `exerciseCount`/`totalSets` in a `useMemo` with dependency `[session]` (lines **39–61**). In MobX/MST, `session` can remain the same object reference while its nested arrays change, which can lead to stale memoized counts.

#### Fix (KISS)
**File:** `app/screens/WorkoutCompleteScreen.tsx`
- Replace the `useMemo` block with direct derivations in render scope (or `useMemo` with primitive dependencies).
  - Example approach: compute `exerciseCount` and `totalSets` directly from `session.exercises` each render.

#### Make it testable (smallest stable hook)
- Add `testID` on the two stat value `<Text>` elements:
  - `testID="workoutComplete.exerciseCount"`
  - `testID="workoutComplete.totalSets"`

#### Regression test
**File:** `app/screens/__tests__/workoutFlow.test.tsx`
- In the MVP flow test (around lines **109–165**), after navigating to WorkoutComplete:
  - Assert `getByTestId("workoutComplete.exerciseCount").props.children === "1"`
  - Assert `getByTestId("workoutComplete.totalSets").props.children === "2"`

**Success criteria:** Counts match the session state at completion and remain correct if underlying session changes before finishing.

---

### Phase 5 — RoutineCard button text white (Requirement #4)

#### File: `app/components/RoutineCard.tsx`
- `$startButtonText` (lines **95–98**)
  - Change `color: colors.palette.neutral100` → `color: "#FFFFFF"`

**Validation:** “Start Routine” is white in both light and dark themes.

---

### Phase 6 — Increase horizontal gaps for inputs (Requirement #5)

#### 6A) Note input indentation
**File:** `app/components/workout/NoteInput.tsx`
- `$inputIndent` (lines **39–41**)
  - Increase `marginHorizontal: spacing.md` → `marginHorizontal: spacing.lg`

**Why safe:** Changes only text indentation; wrapper background remains full width.

#### 6B) Set input spacing
Covered by Phase 2C (`$cell.paddingHorizontal` / `$previousCell.paddingHorizontal`).

---

## Testing Strategy
Run in this order:
1. `npm test`
2. `npm run lint:check`
3. `npm run compile`

Note: there is **no** `npm run format` script in `package.json` currently; do not add one for this mission (YAGNI).

---

## Risk Assessment
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Removing `gap` makes layout feel cramped | Medium | Low | Only set inter-section gaps to 0; keep existing padding/top/bottom. |
| Placeholder logic change affects non-template timed/cardio display | Medium | Medium | Keep the “done forces 0” behavior; add tests for TIMED placeholder + done. |
| Template placeholder mapping by set index diverges if set orders differ | Low | Medium | Accept as KISS; if this occurs in practice, map by `(setType, order)` later (out of scope now). |
| WorkoutComplete count test becomes brittle (text matching) | Medium | Low | Add `testID`s to stat values to stabilize tests. |

---

## Rollback Plan
- Revert the single commit that contains:
  - `ActiveWorkoutScreen.tsx` gap changes
  - `SetRow.tsx` placeholder + spacing changes
  - `WorkoutStore.ts` template session creation change
  - `WorkoutCompleteScreen.tsx` stats derivation change
  - `RoutineCard.tsx` text color change
  - Added/updated tests

---

## Success Criteria & Validation Checklist
- [ ] **(1)** ActiveWorkout has no unwanted vertical gaps (exercise sections + set rows).
- [ ] **(2)** Starting from a template shows template numbers as placeholders for weight/reps/time/distance.
- [ ] **(3)** WorkoutComplete shows correct exercise and set counts (backed by Jest regression test).
- [ ] **(4)** RoutineCard “Start Routine” text is white.
- [ ] **(5)** Inputs have increased horizontal breathing room, while row backgrounds stay full width.

### Design Principles Gate
- [ ] **YAGNI:** No new template persistence model; no new format tooling.
- [ ] **KISS:** Minimal style + derivation changes; no new components.
- [ ] **DRY:** Template placeholder derivation centralized to a small helper in ActiveWorkout.
- [ ] **Existing Systems:** Uses current theme + MST models.

### Line Count
- **Maximum:** 1000
- **Current:** 299 lines (`wc -l docs/ui-refinement-mission.plan.md`)
