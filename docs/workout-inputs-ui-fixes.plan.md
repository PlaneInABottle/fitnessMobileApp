# Workout Inputs + UI Fixes (5 items) — Implementation Plan

## Executive Summary
- **Objective:** Fix 4 UI/input issues in `ActiveWorkoutScreen`/`SetRow`, and fix template persistence so templates can store per-exercise set structures (type/weight/reps/time/distance/restTime) and restore them when starting a session.
- **Approach (KISS/YAGNI):** Make the smallest changes that solve the reported behavior; reuse existing theming tokens (`colors.*`) and existing MST models/patterns in `WorkoutStore.ts`.
- **Primary success metrics:**
  - While typing in set inputs, users can fully clear/edit values with no forced `0` flicker.
  - Done button is visually green (distinct from orange row background) in light/dark.
  - Set rows are full-bleed to the screen edges; add-set button remains inset.
  - Templates can persist and restore set structures; update-from-session persists sets; existing templates (exerciseIds-only) still work.

## Scope & Requirements
### In scope (exactly 5 fixes)
1. **Input deletion behavior**: Empty input should stay empty while focused; only coerce to `0` on blur/submit when `allowEmptyNumbers={false}`.
2. **Done button color**: Keep row background `colors.warningBackground`; done button fill should be clearly green using `colors.success`.
3. **Full-width row backgrounds**: SetRow background should extend to screen walls; remove border radius and any horizontal insets that create edge gaps.
4. **Add Set button sizing + margins**: Keep set rows full width, but inset the “+ Set Ekle” button and make it visually smaller.
5. **Template update bug**: Persist per-exercise sets in templates; starting from a template restores those sets; updating a template from current session persists sets; maintain backward compatibility with existing templates.

### Out of scope (YAGNI)
- Template editing UI, advanced versioning/migrations beyond backward-compatible optional fields.
- New theme tokens or a new form/input framework.

## Current State (code pointers)
- **Set input parsing that forces 0**: `app/components/workout/SetRow.tsx` → `toNumberOrUndefined(text, allowEmpty)` returns `0` for empty when `allowEmptyNumbers=false` (lines ~81–86) and is used directly in `onChangeText` (line ~190–193).
- **Done row background + done button styling**: `SetRow.tsx` `rowStyle` sets `colors.warningBackground` for `isDone` (line ~223) and `$doneButtonDone` is currently transparent (lines ~403–406).
- **Row rounding**: `SetRow.tsx` `rowStyle` base has `borderRadius: 6` (line ~216).
- **ActiveWorkout set rows use allowEmptyNumbers=false**: `app/screens/ActiveWorkoutScreen.tsx` passes `allowEmptyNumbers={false}` to SetRow (line ~203).
- **Add set button styling**: `ActiveWorkoutScreen.tsx` `$addSetButton` has no horizontal margin; can touch edges after full-bleed layout (lines ~279–285).
- **Templates**: `app/models/WorkoutStore.ts` `WorkoutTemplateModel` has `exerciseIds` only (lines ~100–105). `updateTemplateFromCurrentSession` only updates `exerciseIds` (lines ~534–548). `startSessionFromTemplateUnsafe` creates exercises from `exerciseIds` and uses default sets (lines ~224–246). `getTemplateUpdateSummary` assumes baseline of 1 set/exercise (lines ~514–529).

## Design Principles Analysis (planning gate)
- **YAGNI:** Only add template fields needed to persist/restore sets; do not add template editor, versioning, or new storage layers.
- **KISS:** Keep logic local to `SetRow.tsx` and `WorkoutStore.ts`; avoid new utilities/modules unless repetition becomes real.
- **DRY:** Add small helpers inside `WorkoutStore.ts` for converting session ↔ template exercise/sets to avoid duplicating mapping logic.
- **Leverage existing systems:** Use existing theme tokens (`colors.success`, `colors.warningBackground`), existing MST models (`ExerciseSetModel`/`WorkoutExerciseModel`), existing tests.

---

# Fix 1 — Input deletion behavior (no forced 0 while focused)
## Problem
`ActiveWorkoutScreen` uses `allowEmptyNumbers={false}`. In `SetRow`, empty text becomes `0` via `toNumberOrUndefined('', false)`, and because the field becomes “touched”, the input renders `"0"` (flicker/forced 0 while the user is trying to delete).

## Minimal design
Implement **local string state per editable field** inside `SetRow` that takes precedence **only while that field is focused**. On blur/submit:
- if the local text is empty and `allowEmptyNumbers === false`, call `onChange` with `0` (persisted), and clear local draft state.
- if local text is a valid number, call `onChange` with that number (if not already).

This preserves existing validation (store still sees numbers) while making the input UX correct.

## Exact code changes
### File: `app/components/workout/SetRow.tsx`
1. Add state for draft text + focus:
   - `const [draftText, setDraftText] = useState<Partial<Record<EditableFieldKey, string>>>({})`
   - `const [focusedField, setFocusedField] = useState<EditableFieldKey | null>(null)`
2. In `renderFieldCell` (edit branch) for `TextInput`:
   - Add `onFocus={() => { setFocusedField(key); setDraftText((p)=> ({...p, [key]: inputValue})) }}`
   - Update `value={...}` so that **when `focusedField === key`**, use `draftText[key] ?? ""` instead of derived `inputValue`.
   - Update `onChangeText`:
     - `setDraftText((p) => ({ ...p, [key]: t }))`
     - keep `setLocalTouched` behavior as-is.
     - If `t.trim() === ""`: **do not coerce to 0 here**; just return (no `onChange` call), or call `onChange({ ...value }, key)` if the UI relies on `touchedKey` being emitted.
     - Else: parse to number (reuse `toNumberOrUndefined(t, true)` or introduce `toNumberOrUndefinedAllowEmptyAlways`); if parsed is `undefined`, ignore; if number, call `onChange({ ...value, [key]: parsed }, key)`.
   - Add `onBlur` and `onSubmitEditing` (same handler):
     - read `const t = (draftText[key] ?? "").trim()`
     - if `t === ""`:
       - if `allowEmptyNumbers` is false → `onChange({ ...value, [key]: 0 }, key)`
       - if `allowEmptyNumbers` is true → `onChange({ ...value, [key]: undefined }, key)` (optional; in current app, ActiveWorkout uses false)
     - clear focus + draft state: `setFocusedField((f)=> (f===key ? null : f))` and `setDraftText((p)=> ({...p, [key]: undefined}))`.
3. Keep existing placeholder/"done zero" logic for non-focused fields so the rest of the UI stays unchanged.

### Expected behavior after change
- While focused, user can delete to empty and keep it empty (no flicker).
- Leaving the field (blur/submit) with empty input persists `0` when `allowEmptyNumbers={false}`.

## Tests to update/add
### File: `app/components/workout/__tests__/SetRow.test.tsx`
Add a test case:
- Start with `weight: 12`.
- Focus Kg input, clear it: `fireEvent(kg, 'focus'); fireEvent.changeText(kg, '')`.
- Assert **still empty while focused**: `expect(getByLabelText('Kg').props.value).toBe('')`.
- Blur: `fireEvent(kg, 'blur')`.
- Assert coerced to 0: `expect(getByLabelText('Kg').props.value).toBe('0')`.

Risk note: If React Native testing env doesn’t propagate focus/blur reliably, use `fireEvent(kgInput, 'focus')` / `'blur'` explicitly (as above).

---

# Fix 2 — Done button color (green fill, row stays warningBackground)
## Problem
Completed rows are orange-ish (`colors.warningBackground`), but the done button itself is not clearly “done/green” (currently transparent).

## Minimal design
Only adjust `$doneButtonDone` (and optionally `$doneTextDone`) so the done button is filled with `colors.success` and remains readable in both themes.

## Exact code changes
### File: `app/components/workout/SetRow.tsx`
- Update `$doneButtonDone`:
  - `backgroundColor: colors.success`
  - `borderColor: colors.success` (or keep `colors.text` if preferred; success border usually looks cleaner)
- Validate checkmark contrast:
  - If needed, set `$doneTextDone` to `colors.palette.neutral100` (white in light theme, black in dark theme) to guarantee high contrast on green.
  - If existing `$doneTextDone: colors.text` already looks good, keep it (KISS).

---

# Fix 3 — Full-width row backgrounds (no edge gaps)
## Problem
`SetRow` applies `borderRadius: 6`, which visually leaves rounded corners and can show background “gaps” at the screen edges in a full-bleed layout.

## Minimal design
Remove border radius only from the row container (not inputs), keeping the row content layout intact.

## Exact code changes
### File: `app/components/workout/SetRow.tsx`
- In `rowStyle` base, remove `borderRadius: 6`.
- Do not add new wrapper views or padding.

### Validation
- Set rows should visually touch left/right screen edges with a rectangular background.
- Content stays aligned due to existing per-cell padding (`$previousCell`, `$cell`).

---

# Fix 4 — Add Set button sizing + margins (inset button without reintroducing row gaps)
## Problem
After making set rows full-bleed, the “+ Set Ekle” button can touch the screen edges.

## Minimal design
Only style the add-set button container in `ActiveWorkoutScreen`:
- add horizontal margins
- reduce min height and/or padding to feel smaller

## Exact code changes
### File: `app/screens/ActiveWorkoutScreen.tsx`
- Update `$addSetButton`:
  - add `marginHorizontal: spacing.md` (or `spacing.lg` if needed)
  - reduce size: `minHeight: 44` (override Button’s default 56)
  - optionally reduce radius: keep `borderRadius: 8` as-is

Do **not** add `paddingHorizontal` to `$setsContainer` or `$content`, to avoid reintroducing row background gaps.

---

# Fix 5 — Template update bug (persist per-exercise sets in templates)
## Problem
Templates currently store only `exerciseIds`, so updating from a current session cannot save sets/weights/reps/etc, and starting a session from a template cannot restore a structured routine.

## Minimal data model design (backward compatible)
Extend `WorkoutTemplateModel` to optionally store a richer structure:
- `template.exercises?: Array<{ exerciseId: string; sets: Array<{ setType; weight?; reps?; time?; distance?; restTime? }> }>`

**Backward compatibility strategy:**
- Keep `exerciseIds` as-is for existing templates.
- New field is optional/empty by default.
- `startSessionFromTemplate`:
  - if `template.exercises` is present and non-empty, build session exercises/sets from it.
  - else fallback to current behavior using `exerciseIds` + default set.

## Exact code changes
### File: `app/models/WorkoutStore.ts`
1. **Add new MST models** (inside the same file; no new modules):
   - `TemplateSetModel` (same fields as `ExerciseSetModel` minus `id`)
   - `TemplateExerciseModel` with `exerciseId` + `sets: types.array(TemplateSetModel)`
2. **Extend `WorkoutTemplateModel`**:
   - add `exercises: types.optional(types.array(TemplateExerciseModel), [])`
   - keep `exerciseIds` untouched.
3. **Helper mapping functions** (to keep DRY):
   - `function buildTemplateExerciseSnapshotsFromSession(session): TemplateExerciseSnapshotIn[]`
   - `function buildWorkoutExercisesFromTemplate(template, root): WorkoutExerciseSnapshotIn[]` (generates set IDs via existing `generateId()`)
4. **Update `createTemplateFromSessionUnsafe(name)`**:
   - currently calls `createTemplateUnsafe(name, session.exercises.map(...))`.
   - After creation, immediately set `template.exercises = ...` based on session sets (or refactor `createTemplateFromSessionUnsafe` to call a new `createTemplateFromSessionWithSetsUnsafe`).
5. **Update `startSessionFromTemplateUnsafe(templateId)`**:
   - If `template.exercises.length > 0`:
     - validate all exerciseIds exist.
     - create session with exercises mapped from `template.exercises`, each with sets created from the template set list.
   - Else: keep existing logic with `template.exerciseIds` and `addExerciseToSessionUnsafe`.
6. **Update `updateTemplateFromCurrentSession(templateId)`**:
   - In addition to `template.exerciseIds = ...`, persist:
     - `template.exercises = cast(session.exercises.map((we) => ({ exerciseId: we.exerciseId, sets: we.sets.map(({ setType, weight, reps, time, distance, restTime }) => ({ setType, weight, reps, time, distance, restTime })) })))`
   - Keep `template.lastUsedAt = new Date()`.
7. **Update `getTemplateUpdateSummary(templateId)` baseline**:
   - When `template.exercises` contains an entry for an exercise, baseline set count is `templateExercise.sets.length`.
   - Else (old templates), baseline remains `1` per exercise (current behavior).
   - For removed exercises: baseline removed sets should be `baselineCount` (template sets length if known, else 1).

### Files: tests
#### `app/models/WorkoutStore.test.ts`
Add/extend tests:
1. **Backward compatibility:** existing test “creates a template from a session and can start a session from it” should still pass. Additionally assert that `template.exercises.length > 0` and set shapes match the session.
2. **Update template persists sets:**
   - Create a template, start session from it.
   - Add a set and update weight/reps in session.
   - Call `updateTemplateFromCurrentSession(templateId)`.
   - Start a new session from the template and assert:
     - number of sets per exercise matches
     - weight/reps values restored
3. **Summary baseline uses template set counts:**
   - Create a template with stored sets (via create-from-session or update-from-session).
   - Start a session from that template and add/remove sets.
   - Assert `addedSets/removedSets` reflect **template baseline**, not hard-coded 1.

#### `app/screens/__tests__/workoutFlow.test.tsx`
No change expected for the existing “template completion triggers update Alert” because it uses `createTemplate()` (exerciseIds-only). Add a follow-up test only if failures occur (YAGNI).

---

## Implementation Roadmap (phased)
### Phase 0 — Baseline safety
- Run unit tests once before changes: `npm test`.

### Phase 1 — SetRow input UX + done button + full-bleed rows
- Edit `SetRow.tsx` to implement Fixes 1–3.
- Update `SetRow.test.tsx` accordingly.

### Phase 2 — ActiveWorkout add-set button inset
- Edit `ActiveWorkoutScreen.tsx` `$addSetButton` only.

### Phase 3 — Template persistence (models + store actions)
- Edit `WorkoutStore.ts` to add template set structure and update mapping logic.
- Update `WorkoutStore.test.ts`.
- Run tests again.

---

## Risk Assessment
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Input draft state causes mismatch between displayed value and persisted store value while focused | Medium | Medium | Limit draft override to focused field only; on blur always reconcile via `onChange`. |
| Template model change breaks snapshot loading | Low | High | Add optional field only; keep `exerciseIds` unchanged; add tests for old templates. |
| Start-from-template now restores sets and may change user expectations | Low | Medium | Only apply when template has stored sets; keep old behavior otherwise. |

## Rollback Plan
- All changes are localized to 3 files + tests.
- Roll back by reverting the commit containing:
  - `SetRow.tsx` changes
  - `WorkoutStore.ts` template model changes
  - Updated tests

## Success Criteria & Validation
- **Fix 1:** Clearing an input keeps it empty until blur; blur coerces to 0 when `allowEmptyNumbers=false`.
- **Fix 2:** Done button is visibly green (success) on orange row background in light/dark.
- **Fix 3:** Set row backgrounds are full width with no rounded-corner edge gaps.
- **Fix 4:** Add-set button has horizontal inset and feels smaller; rows remain full-bleed.
- **Fix 5:** Templates store and restore sets; updating a template from a session persists set data; existing templates still start with default sets.

## Design Principles Validation Checklist
- [x] **YAGNI:** No template editor, no migrations beyond optional fields.
- [x] **KISS:** Local state in `SetRow`, optional fields in MST model.
- [x] **DRY:** Session↔template mapping centralized in `WorkoutStore.ts` helpers.
- [x] **Existing systems leveraged:** Uses existing theme tokens and MST patterns.

## Line Count Requirement
- **Maximum Length:** 1000 lines
- **Current:** 256 lines
