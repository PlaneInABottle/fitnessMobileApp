# Per-Exercise Notes During Active Workouts — Implementation Plan

## Executive Summary
- **Objective:** Allow users to add free-text notes per exercise while a workout session is active, and keep those notes in MST state for the duration of the session.
- **Approach (KISS/YAGNI):** Add one string field (`notes`) to the active workout exercise model, a small `ExerciseNotesInput` wrapper around the existing `TextField`, and render it in `ActiveWorkoutScreen` between the exercise header and set rows.
- **Non-goals (explicit):** No changes to templates, and do not store user-entered notes into historical/session history or memory analytics.

---

## Current State (Repo Evidence)
- **Active workout per-exercise model:** `app/models/WorkoutStore.ts` defines `WorkoutExerciseModel` with only `{ id, exerciseId, sets }` (lines **78–82**).
- **Active workout UI layout:** `app/screens/ActiveWorkoutScreen.tsx` renders, per exercise:
  1) `ExerciseCard` (line **188**)
  2) Sets container (`$setsContainer`) with `SetRow` list + "+ Set Ekle" button (lines **190–233**)
- **Reusable input component:** `app/components/TextField.tsx` supports i18n-based placeholders via `placeholderTx` / `placeholderTxOptions` (lines **69–81**, **144–147**).
- **i18n key coverage:** `test/i18n.test.ts` greps the app for `*Tx="..."` strings (including `placeholderTx`) and verifies those keys exist in `app/i18n/en.ts`.

---

## 1) Files to Change/Add (paths)
### MST / State
- **Change:** `app/models/WorkoutStore.ts`
- **Change (tests):** `app/models/WorkoutStore.test.ts`

### UI
- **Add:** `app/components/workout/ExerciseNotesInput.tsx` (new)
- **Change:** `app/screens/ActiveWorkoutScreen.tsx`

### i18n
- **Change:** `app/i18n/en.ts` (add a new key/value)
  - Add a new translation key (namespace `workout`) to avoid hardcoding UI strings:
    ```ts
    const en = {
      ...,
      workout: {
        exerciseNotesPlaceholder: "Buraya not ekleyin...",
      },
    }
    ```
- **Add (optional but recommended):** `test/workoutNotesPlaceholder.test.ts` (assert the Turkish placeholder value to prevent regressions)

### UI tests
- **Change:** `app/screens/__tests__/activeWorkoutSetInteractions.test.tsx` (add assertions for notes input)

---

## 2) Exact MST Model Updates (properties + actions)
### 2.1 Add `notes` field to `WorkoutExerciseModel`
**File:** `app/models/WorkoutStore.ts`

**Current:**
```ts
export const WorkoutExerciseModel = types.model("WorkoutExercise", {
  id: types.identifier,
  exerciseId: types.string,
  sets: types.optional(types.array(ExerciseSetModel), []),
})
```

**Update (minimal):** add a default-empty string field.
```ts
export const WorkoutExerciseModel = types.model("WorkoutExercise", {
  id: types.identifier,
  exerciseId: types.string,
  notes: types.optional(types.string, ""),
  sets: types.optional(types.array(ExerciseSetModel), []),
})
```

**Rationale:**
- `types.optional(types.string, "")` ensures older snapshots (missing `notes`) still hydrate cleanly.

### 2.2 Add store action to update notes during an active session
**File:** `app/models/WorkoutStore.ts`

Follow existing action patterns like `updateSetInWorkoutExercise` (lines **520–533**).

**Add unsafe helper (near other helpers, e.g. near `updateSetInWorkoutExerciseUnsafe` around lines ~352+):**
```ts
function updateNotesInWorkoutExerciseUnsafe(workoutExerciseId: string, notes: string) {
  const workoutExercise = requireWorkoutExercise(workoutExerciseId)
  workoutExercise.notes = notes
}
```

**Add public action (in the returned actions object, near other per-exercise mutators like `updateSetInWorkoutExercise`):**
```ts
updateNotesInWorkoutExercise(workoutExerciseId: string, notes: string): boolean {
  try {
    updateNotesInWorkoutExerciseUnsafe(workoutExerciseId, notes)
    self.lastError = undefined
    return true
  } catch (e) {
    setError(e)
    return false
  }
}
```

**Notes (YAGNI/KISS):**
- Do **not** over-sanitize/trim user input; preserve what the user typed.
- No extra validation rules unless product explicitly requests (e.g., max length).

### 2.3 Ensure notes are NOT persisted into historical data
Requirement: “Do not modify…historical data; only active workout exercise state.”

**Risk in current implementation:** `completeSessionUnsafe()` does `const snapshot = getSnapshot(session)` then `self.sessionHistory.push(cast(snapshot))` (lines **389–416**). After adding `notes`, this would store notes in history.

**Minimal mitigation (recommended):** strip `notes` from the snapshot before storing to `sessionHistory`.

**Implementation sketch (inside `completeSessionUnsafe`, before pushing to history):**
```ts
const snapshot = getSnapshot(session)
const snapshotForHistory = {
  ...snapshot,
  exercises: (snapshot.exercises ?? []).map(({ notes: _ignored, ...rest }) => rest),
}

self.currentSession = undefined
self.sessionHistory.push(cast(snapshotForHistory))
```

This keeps the model change (notes exists on active `WorkoutExerciseModel`) while ensuring completed sessions don’t contain user-entered notes.

**Why this works:** because `notes` is optional with a default; omitting it in `snapshotForHistory` is valid and results in `""` in the stored MST instance.

---

## 3) UI Integration Steps
### 3.1 Add `ExerciseNotesInput` component (TextField wrapper)
**File (new):** `app/components/workout/ExerciseNotesInput.tsx`

**Responsibilities (SRP):**
- Render a multiline `TextField` configured for “exercise notes”.
- Provide consistent placeholder and styling.

**Props (keep tiny):**
```ts
type ExerciseNotesInputProps = {
  value: string
  onChangeText: (text: string) => void
}
```

**TextField config:**
- `multiline`
- `placeholderTx="workout:exerciseNotesPlaceholder"`
- `placeholderTxOptions={{}}` (important so Jest’s `i18next` mock renders `{}` rather than `undefined`)
- `value={value}`
- `onChangeText={onChangeText}`
- (Optional) add `accessibilityLabel="Exercise notes"` for test stability (not user-visible copy).

**Styling (minimal):** align to existing set-area inset.
- Use `containerStyle={{ marginHorizontal: spacing.md }}` by leveraging `useAppTheme()` inside the component.
- Keep height modest (e.g. `TextInputProps={{ numberOfLines: 3 }}`) to avoid pushing sets too far down.

### 3.2 Render notes input in `ActiveWorkoutScreen`
**File:** `app/screens/ActiveWorkoutScreen.tsx`

**Insert point:** inside the `session.exercises.map` block, between:
- `ExerciseCard` (currently line **188**)
- `$setsContainer` wrapper (currently line **190**)

**Pseudo-change:**
```tsx
<View key={we.id} style={themed($exerciseSection)}>
  <ExerciseCard exercise={exercise} note="Aynı devam" />

  <ExerciseNotesInput
    value={we.notes}
    onChangeText={(text) => workoutStore.updateNotesInWorkoutExercise(we.id, text)}
  />

  <View style={themed($setsContainer)}>
    ...
  </View>
</View>
```

**Show previous notes:** because `value={we.notes}`, any existing MST value is displayed immediately.

---

## 4) Test Plan (assertions + locations)
### 4.1 Model tests: notes default/update + history non-persistence
**File:** `app/models/WorkoutStore.test.ts`

Add a focused test (new `it(...)`) covering:
1. Start session + add exercise
2. Assert default `notes === ""`
3. Call `updateNotesInWorkoutExercise(weId, "foo")`
4. Assert `currentSession.exercises[0].notes === "foo"`
5. Complete the session
6. Assert `sessionHistory[0].exercises[0].notes === ""` (or that user-entered content is not present)

This directly enforces the “active only” requirement.

### 4.2 UI test: input renders + typing persists to MST
**File:** `app/screens/__tests__/activeWorkoutSetInteractions.test.tsx`

Add a new test:
- Create store, start session, add `bench-press`
- Render ActiveWorkout
- Find notes input by placeholder:
  - expected placeholder in tests: `"workout:exerciseNotesPlaceholder {}"` (due to i18next mock + `placeholderTxOptions={{}}`)
- `fireEvent.changeText(notesInput, "my note")`
- Assert MST updated:
  - `expect(store.workoutStore.currentSession?.exercises[0].notes).toBe("my note")`

Optional additional assertion:
- Re-query the input and ensure it reflects the value (e.g., `getByDisplayValue("my note")`), to verify UI is bound to MST state.

### 4.3 i18n regression test: placeholder must be Turkish
**File (new, recommended):** `test/workoutNotesPlaceholder.test.ts`

Assert the translation source-of-truth:
```ts
import en from "../app/i18n/en"
expect(en.workout.exerciseNotesPlaceholder).toBe("Buraya not ekleyin...")
```

This avoids coupling to the Jest i18n mock behavior while guaranteeing the required Turkish copy is present.

### 4.4 Run order
- `npm test` (full suite)
- If iterating locally:
  - `npm test app/models/WorkoutStore.test.ts`
  - `npm test app/screens/__tests__/activeWorkoutSetInteractions.test.tsx`
  - `npm test test/i18n.test.ts`

---

## 5) Risks / Edge Cases
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Notes accidentally persisted to `sessionHistory` after adding field | Medium | High | Strip `notes` before pushing to history (Section 2.3) + add model test assertion. |
| i18n placeholder key exists but string not Turkish | Low | Medium | Add explicit i18n regression test (Section 4.3). |
| Many multiline inputs in a ScrollView cause keyboard/layout issues | Medium | Medium | Keep input height small (`numberOfLines` ~3), avoid auto-expanding behavior, verify on-device. |
| TextField placeholderTx in tests renders unexpected string due to i18next mock (`undefined` options) | Medium | Low | Pass `placeholderTxOptions={{}}` to force stable `"{}"` output. |
| Users expect notes to persist across sessions (not requested) | Medium | Low | Keep scope explicit (active session only); revisit later if requirement changes. |

---

## Rollback Plan
- Revert the commit that adds:
  - `WorkoutExerciseModel.notes`
  - the `updateNotesInWorkoutExercise` action
  - `ExerciseNotesInput` and its usage in `ActiveWorkoutScreen`
  - i18n key + tests

---

## Design Principles Validation (Mandatory)
- [x] **YAGNI:** Notes are stored only for the active session; no persistence layer, no template changes.
- [x] **KISS:** One new field + one simple action + one small UI component.
- [x] **DRY:** Reuse existing `TextField` and existing store error-handling patterns.
- [x] **Leverage Existing Systems:** Use MST models in `WorkoutStore.ts` and existing i18n + TextField `placeholderTx`.

## Line Count
- **Maximum Length:** 1000 lines
- **Current:** 261 lines (`wc -l docs/active-workout-exercise-notes.plan.md`).
