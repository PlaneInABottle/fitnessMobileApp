# Workout UI/UX Improvements Implementation Plan

## Executive Summary
- **Objective:** Implement 4 targeted UI/UX improvements in workout flow (completed set row color, full-width workout layout, template-update prompt on completion, and improved “Yeni Rutin” entry point).
- **Approach:** Minimal, incremental changes that reuse existing theme + MST store patterns; no new screens and no new libraries.
- **Timeline (rough):** 0.5–1 day UI styling + 0.5–1 day template-update prompt + tests.
- **Success Metrics:** Visual changes match requirements; new template-update prompt appears only for template-based sessions; all existing tests pass + new tests added.

## Current State Analysis (files + key lines)
- **Completed set row background:** `app/components/workout/SetRow.tsx` `rowStyle` uses `colors.success` when `isDone` (lines ~214–225).
- **Active workout layout gaps:** `app/screens/ActiveWorkoutScreen.tsx` uses `contentContainerStyle` padding `spacing.md` (lines ~265–270) and `$exerciseSection` applies card background + border radius + padding (lines ~271–277).
- **Exercise header has no card background:** `app/components/workout/ExerciseCard.tsx` `$container` only sets vertical padding/gap (lines ~99–103).
- **Template sessions:** `app/models/WorkoutStore.ts` has `startSessionFromTemplate` but `WorkoutSessionModel` has no `templateId` (lines ~88–94 and ~223–244).
- **Workout complete UI:** `app/screens/WorkoutCompleteScreen.tsx` currently offers “Şablon Olarak Kaydet” flow or “Bitti” (lines ~174–219).
- **Yeni Rutin pill:** `app/screens/WorkoutTabScreen.tsx` has “Yeni Rutin” as a pill in `$pillsRow` (lines ~113–121).

## Requirements
### 1) Completed set row background color
- Change completed set row background from green to an orange-ish tone for readability.
- Done checkbox button must remain visually distinct.

### 2) Full-width exercise cards + sets in ActiveWorkout
- Remove horizontal gaps (no inset cards).
- Use full-width dark/black section background; gray-ish surfaces should extend full width.

### 3) Template update prompt at workout completion (template-based sessions)
- Detect if current session was started from a template.
- On completion, show an **optional** prompt to update the originating template to match the session’s exercises.
- Show a summary of changes vs the template baseline:
  - added/removed exercises
  - added/removed sets vs baseline

### 4) Improve “Yeni Rutin” UI
- Move “Yeni Rutin” entry point above the routines list.
- Add emoji/icon and improved styling.
- Keep exact visible text “Yeni Rutin” to preserve existing tests.

## Technical Design (minimal + existing systems leveraged)
### Theme / Colors (Existing Systems)
- Prefer using existing palette (`warning*`) rather than introducing new theme systems.

### Data Model (MST)
- Add **optional** `templateId?: string` to `WorkoutSessionModel` to track template-origin sessions.
- Add a small, store-local diff helper to compute the change summary.

## Implementation Roadmap

### Phase 0 — Safety & Baseline
1. Ensure clean working tree.
2. Run existing tests once to confirm baseline: `npm test` (or existing test command in CI).

**Success criteria:** baseline tests pass.

---

### Phase 1 — Orangish completed set rows (SetRow)
**Files:**
- `app/components/workout/SetRow.tsx`

**Steps / Code changes (minimal):**
1. Update `rowStyle` when `isDone` (currently `backgroundColor: colors.success` around lines ~220–224) to use an orange-ish color:
   - Recommended: `backgroundColor: colors.warning` (existing theme key).
2. Ensure done checkbox remains distinct:
   - Update `$doneButtonDone` to use a dark border on the orange background (instead of white):
     - `borderColor: "#000000"`
   - Update `$doneTextDone` to black:
     - `color: "#000000"`
   - Update `previousValue` text color override (currently `isDone && { color: "#FFFFFF" }` around line ~294) to black for contrast.

**Notes (KISS/YAGNI):**
- No new theme keys required; reuse `colors.warning`.

**Validation:**
- Manual: toggle done on a set; row becomes orange-ish; checkmark + border remain clearly visible.
- No test changes required (visual-only).

---

### Phase 2 — Full-width exercise sections (ActiveWorkout + ExerciseCard)
**Files:**
- `app/screens/ActiveWorkoutScreen.tsx`
- `app/components/workout/ExerciseCard.tsx`

**Steps / Code changes:**
1. In `ActiveWorkoutScreen.tsx`:
   - Change `$content` (currently `padding: spacing.md`) to remove horizontal insets:
     - `paddingHorizontal: 0`
     - keep vertical padding via `paddingTop`/`paddingBottom` so spacing remains.
   - Update `$exerciseSection` to remove inset-card feel:
     - set `borderRadius: 0`
     - set `padding: 0`
     - keep `backgroundColor: colors.card` (gray-ish) so it fills full width.
   - Set `$scrollView` background explicitly to `colors.background` to ensure the “section top background” is dark/black (in dark theme):
     - add `backgroundColor: colors.background`.
2. In `ExerciseCard.tsx`:
   - Update `$container` to have a background and internal padding so header area reads as a card and fills width:
     - `backgroundColor: colors.card`
     - `paddingHorizontal: spacing.md`
     - `paddingTop/paddingBottom` (reuse existing spacing; keep minimal)

**Validation:**
- Manual: ActiveWorkout screen shows full-width sections without left/right gaps.
- Ensure `app/screens/__tests__/workoutScrollProps.test.tsx` still passes (no `flex: 1` added to `contentContainerStyle`).

---

### Phase 3 — Template update prompt + change summary (WorkoutStore + WorkoutCompleteScreen)
**Files:**
- `app/models/WorkoutStore.ts`
- `app/models/WorkoutStore.test.ts`
- `app/screens/WorkoutCompleteScreen.tsx`
- `app/screens/__tests__/workoutFlow.test.tsx`

#### 3.1 Data model: track template origin
1. In `WorkoutStore.ts`, extend `WorkoutSessionModel` (currently only `id`, `exercises`, `startedAt`, `completedAt` around lines ~88–94):
   - Add: `templateId: types.maybe(types.string)`
2. In `startSessionFromTemplateUnsafe(templateId)` (around lines ~223–244), when creating `currentSession`, set `templateId`.
3. In `startNewSessionUnsafe()`, omit `templateId` (it will be `undefined`).

**Success criteria:** template-started sessions can be detected at completion time.

#### 3.2 Store API: compute summary + update template
Add two new actions/helpers in `WorkoutStore.ts` (keep them store-local; no new modules):
1. `getTemplateUpdateSummary(templateId: string): { addedExerciseIds: string[]; removedExerciseIds: string[]; addedSets: number; removedSets: number } | undefined`
   - Inputs: `template = self.templates.get(templateId)` and `session = self.currentSession`.
   - Exercise diff:
     - `addedExerciseIds = session.exerciseIds not in template.exerciseIds`
     - `removedExerciseIds = template.exerciseIds not in session.exerciseIds`
   - Set diff (baseline definition):
     - **Baseline per exercise = 1 set** because `startSessionFromTemplate` currently creates exactly one default working set per exercise.
     - For each exercise present in both template + session, compare `sessionSetCount` vs `baseline=1`:
       - `added += max(0, sessionSetCount - 1)`
       - `removed += max(0, 1 - sessionSetCount)`
     - For added exercises (not in template), treat baseline as 0 and count all their sets as `added`.
     - For removed exercises, treat their baseline sets as removed (= 1 per removed exercise).
2. `updateTemplateFromCurrentSession(templateId: string): boolean`
   - Validate `currentSession` exists and `template` exists; otherwise set `lastError` and return false.
   - Update:
     - `template.exerciseIds = cast(session.exercises.map((we) => we.exerciseId))`
     - `template.lastUsedAt = new Date()` (optional but consistent with “used template” behavior)

**KISS/YAGNI rationale:**
- We do **not** store sets in templates (not currently supported); set diff is a best-effort summary based on known baseline behavior.

#### 3.3 UI: WorkoutComplete prompt + copy
In `WorkoutCompleteScreen.tsx`:
1. Detect template-session:
   - `const templateId = session?.templateId`
   - `const summary = templateId ? workoutStore.getTemplateUpdateSummary(templateId) : undefined`
2. When `summary` exists:
   - Show a new card section above the final action buttons:
     - Title: `"Şablonu güncelle?"`
     - Subtitle: `"Bu antrenmanda şablona göre değişiklik yaptın:"`
     - Summary lines (simple + testable):
       - `Egzersiz: +{added} / -{removed}`
       - `Set: +{addedSets} / -{removedSets}`
     - Buttons:
       - Primary: `"Şablonu Güncelle"` → calls `updateTemplateFromCurrentSession(templateId)` then `completeSession()` and navigates home.
       - Secondary: `"Bitti"` → current behavior (`completeSession()` then navigate home).
3. Preserve existing “Şablon Olarak Kaydet” flow for **non-template** sessions exactly as today.

**Behavior rules:**
- If templateId exists but template missing (deleted): fall back to existing non-template UI (save as new template / done).
- If summary has all zeros, either:
  - hide the update section (simplest), OR
  - show it but disable “Şablonu Güncelle” (optional); prefer hide for minimal UI.

#### 3.4 Tests (update/add)
1. `app/models/WorkoutStore.test.ts`:
   - Add assertion that `startSessionFromTemplate(templateId)` sets `currentSession.templateId === templateId`.
   - Add a new test for `updateTemplateFromCurrentSession`:
     - Start from template with `exerciseIds=[A]`, add exercise `B` to session, call update, assert template.exerciseIds becomes `[A,B]`.
2. `app/screens/__tests__/workoutFlow.test.tsx`:
   - Add a new test: “template completion offers update prompt”
     - Create template, start session from template, add another exercise, navigate to complete screen.
     - Assert texts: `Şablonu güncelle?`, `Egzersiz: +1 / -0`.
     - Press `Şablonu Güncelle` and assert template updated in store.

---

### Phase 4 — “Yeni Rutin” UI improvements (WorkoutTab)
**Files:**
- `app/screens/WorkoutTabScreen.tsx`
- (Likely unchanged) `app/screens/__tests__/CreateRoutineScreen.test.tsx`

**Steps / Code changes:**
1. Remove “Yeni Rutin” pill row from the filter pills section (currently lines ~113–121).
2. Add a new, more prominent `Pressable` above the routines list (inside the “Rutinler” section, above the empty state / list):
   - Include an emoji/icon + keep the exact text node `Yeni Rutin`.
   - Example layout:
     - Left: `✨` (or existing `<Icon icon="plus" ...>` if available)
     - Text: `Yeni Rutin`
     - Right caret icon optional.
   - Styling:
     - full width
     - background `colors.card` (or `colors.cardSecondary`)
     - padding `spacing.md`
     - borderRadius `12`
3. Keep navigation target unchanged: `navigation.navigate("CreateRoutine")`.

**Tests impact:**
- `CreateRoutineScreen.test.tsx` uses `fireEvent.press(getByText("Yeni Rutin"))` and should continue to pass as long as the exact text remains visible.

---

## Risk Assessment & Mitigation
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Orange row background reduces contrast for some text | Medium | Medium | Also update done-state text/border to black for contrast (Phase 1). |
| Full-width layout breaks snapshot/scroll tests | Low | Medium | Avoid adding `flex:1` to ScrollView content container; run existing tests (Phase 2). |
| Template update summary is misleading due to templates not storing sets | Medium | Medium | Document baseline assumption (1 set per template exercise) and keep summary coarse (Phase 3). |
| UI regression for non-template workout completion | Low | High | Keep existing save-template flow unchanged when `session.templateId` is absent (Phase 3). |

## Rollback Plan
- All changes are isolated to a few components + store; rollback by reverting commits.
- If template-update prompt causes issues, keep `templateId` field but disable prompt by gating UI behind a feature flag-like constant (last resort); prefer revert UI block first.

## Success Criteria & Validation
- **Functional:**
  - Completed set rows are orange-ish; done checkbox remains visually distinct.
  - ActiveWorkout exercise sections and set rows are full width (no horizontal gaps).
  - Template-started workouts show update prompt with summary and allow updating template exercise list.
  - “Yeni Rutin” is above list with improved styling; text “Yeni Rutin” remains.
- **Testing:**
  - `npm test` passes.
  - New tests for template update path pass.

## Design Principles Validation Checklist
- **YAGNI:** No new template features (e.g., storing set structures) added; only what’s required for prompt + summary.
- **KISS:** No new screens or navigation; reuse existing components and MST store.
- **DRY:** Diff logic centralized in store helper; UI just renders returned summary.
- **Leverage Existing Systems:** Reuse existing theme `warning` color and existing MST store patterns.

---

## Line Count Requirement
- **Maximum Length:** 1000 lines
- **Current:** 238 lines
