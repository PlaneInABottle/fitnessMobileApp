# Workout UI Styling + Persistence Analysis — Implementation Plan

## Executive Summary
- **Objective:** Make small, styling-only adjustments in the active workout UI (note input, set rows, buttons) and add a short persistence analysis document.
- **Approach (KISS/YAGNI):** Reuse existing props and theme tokens; avoid new abstractions unless required to scope a change to a single component.
- **Success Metrics:**
  - Note input no longer shows the blue focus ring.
  - Note input + set row “content” is horizontally indented while row backgrounds remain full-width.
  - Add Set button has a gray-ish background.
  - SetRow done toggle: **always white checkmark**; **not-done** state has gray-ish filled box.
  - `npm test` passes.

## Scope & Non-Goals
### In Scope
- Styling-only changes in:
  - `app/components/TextField.tsx`
  - `app/components/workout/NoteInput.tsx`
  - `app/components/workout/SetRow.tsx`
  - `app/screens/ActiveWorkoutScreen.tsx`
- A documentation-only persistence analysis file (new file under `docs/`).

### Non-Goals (YAGNI)
- No behavioral changes to workout logic, set calculations, template creation, or persistence.
- No redesign of the button component API.

## Current-State Notes (from repo)
- **Note input** uses `<TextField borderless />` in `app/components/workout/NoteInput.tsx` (line ~16–25).
- **TextField focus ring** is applied unconditionally on focus via `isFocused && { borderColor: colors.tint, borderWidth: 2 }` in `app/components/TextField.tsx` (line ~157–167).
- **SetRow done toggle** is a local `Pressable` with `$doneButton/$doneText` styles in `app/components/workout/SetRow.tsx` (line ~442+).
- **Add Set button** styling is in `app/screens/ActiveWorkoutScreen.tsx` `$addSetButton` (line ~289+).
- **Persistence**:
  - Workout + performance memory are saved into encrypted MMKV in `app/models/setupRootStore.ts` (line ~65–94).
  - `WorkoutStore.completeSession` strips notes before pushing history (in `app/models/WorkoutStore.ts` line ~420–427).

## Design Principles Checklist (pre-commit gate)
- **YAGNI:** only add new props/styles that are required for the described UI adjustments.
- **KISS:** prefer small conditional styling over new theme systems.
- **DRY:** reuse `borderless` and existing theme palette values where possible.
- **Leverage existing systems:** use existing theme colors (`colors.cardSecondary`, `colors.palette.neutral600`, etc.) and existing store persistence setup.

---

## Implementation Roadmap

### Phase 0 — Baseline & Safety (no code changes)
1. Ensure working tree is clean and tests run:
   - `git status --porcelain`
   - `npm test`
2. Capture screenshots (optional but recommended) of:
   - Note input focused/unfocused
   - A set row focused/unfocused
   - Done toggle checked/unchecked

**Success criteria:** Baseline tests are green; screenshots show current behavior for comparison.

---

### Phase 1 — Remove blue focus border on *note input only*
**Goal:** Remove the blue focus ring for `NoteInput` without affecting other text fields.

#### Change 1A — Treat `borderless` as “no focus ring”
- **File:** `app/components/TextField.tsx`
- **Where:** `$inputWrapperStyles` array (around line ~157–167)
- **Edit:** Change focus styling from:
  - Current: `isFocused && { borderColor: colors.tint, borderWidth: 2 }`
  - Planned: `isFocused && !borderless && { borderColor: colors.tint, borderWidth: 2 }`

**Why (KISS/Existing systems):** `NoteInput` already passes `borderless` (NoteInput.tsx line ~21), so this scopes the change without introducing a new prop.

**Risks:** If any other component later uses `borderless` expecting a focus ring, they won’t get it.
- **Mitigation:** `grep` indicates `borderless` is currently only used by `NoteInput`.

**Success criteria:** Focusing the note input no longer changes the wrapper border color/width.

---

### Phase 2 — Input spacing: indent content, keep row backgrounds full width

#### Requirement interpretation
- “Row background full width” means: don’t use outer horizontal margins that shrink the background container.
- “Only the input content should be indented” means: apply inner margins/padding to the `TextInput` text, not the wrapper background.

#### Change 2A — Note input: remove horizontal shrinking + add inner indent
- **File:** `app/components/workout/NoteInput.tsx`
- **Where:** `$container` and TextField props (around line ~15–38)
- **Edits:**
  1. Remove/zero `marginHorizontal` on `$container` so the input wrapper can be full width.
     - Current: `$container` uses `marginHorizontal: spacing.md` (line ~29–31)
     - Planned: `$container` returns `{}` (or only vertical spacing if needed)
  2. Add an input style override that increases **only** the text/content indent.
     - Add `style={themed($noteTextIndent)}` to the `<TextField />` in NoteInput.
     - New style: `$noteTextIndent: ThemedStyle<TextStyle> = ({ spacing }) => ({ marginHorizontal: spacing.md })`
       - This overrides `TextField`’s default `$inputStyle` marginHorizontal (TextField.tsx line ~291–292) without affecting wrapper background.

**Success criteria:** Note input background spans full width; the typed text is inset from edges.

#### Change 2B — Set rows: add horizontal “breathing room” inside cells
- **File:** `app/components/workout/SetRow.tsx`
- **Where:** cell styles (around line ~396–410)
- **Edits (minimal):** Increase padding inside cells so the numeric inputs feel less cramped while row bg stays full width.
  - `$previousCell.paddingHorizontal`: change `4` → `8`
  - `$cell.paddingHorizontal`: change `4` → `8`

**Why (KISS):** Adjusting inner padding doesn’t alter row background width and avoids layout rewrites.

**Success criteria:** Set row input areas are visually indented with more spacing, without changing row background coverage.

---

### Phase 3 — Button styling adjustments

#### Change 3A — “Add Set” button gray-ish background
- **File:** `app/screens/ActiveWorkoutScreen.tsx`
- **Where:** `$addSetButton` (around line ~289–297)
- **Edit:**
  - Current: `backgroundColor: "transparent"`
  - Planned: `backgroundColor: colors.cardSecondary` (or `colors.separator` if a lighter gray is preferred)

**Notes:** Keep `preset="default"` to avoid behavioral changes; adjust only styling.

**Success criteria:** Add Set button reads as a filled, gray-ish action.

#### Change 3B — SetRow done toggle visuals
- **File:** `app/components/workout/SetRow.tsx`
- **Where:** `$doneButton`, `$doneButtonDone`, `$doneText`, `$doneTextDone` (around line ~442–467)
- **Edits:**
  1. **Not done state**: gray-ish filled box with white check.
     - `$doneButton.backgroundColor`: `"transparent"` → `colors.palette.neutral600`
     - `$doneButton.borderColor`: keep `colors.border` or set to `colors.palette.neutral600` for a solid pill.
     - `$doneText.color`: set to `"#FFFFFF"`.
  2. **Done state**: keep success fill, but enforce white check.
     - `$doneButtonDone.backgroundColor`: keep `colors.success`.
     - `$doneTextDone.color`: change from `colors.palette.neutral100` (theme-dependent) to `"#FFFFFF"`.

**Why:** Current `colors.palette.neutral100` is black in dark theme (see `colorsDark.ts` palette), which conflicts with the requirement.

**Success criteria:**
- Unchecked: gray filled square + white ✓
- Checked: green filled square + white ✓

#### Change 3C — Blue buttons must have white text (verify-only)
- **Primary file:** `app/components/Button.tsx`
- **Reference:** `filled` preset already sets text to `colors.palette.neutral100` (Button.tsx line ~264).
- **Action:** Verify any component that sets `backgroundColor: colors.tint` either:
  - Uses `preset="filled"`, **or**
  - Provides `textStyle={{ color: "#FFFFFF" }}`.

**Known good examples:**
- `app/components/workout/WorkoutHeader.tsx` sets `preset="filled"` and `textStyle` to `#FFFFFF` (line ~74–82, ~148–152).

---

### Phase 4 — Persistence analysis document
**Goal:** Add a short, concrete explanation of what persists across sessions and why users may/ may not see “previous” notes/sets.

#### Suggested doc path
- **New file:** `docs/workout-persistence.md`

#### Required sections (keep it short, implementation-ready)
1. **What is persisted (and where)**
   - Plain storage (`ROOT_STORE`) vs encrypted storage (`ROOT_STORE_SECURE`) from `app/models/setupRootStore.ts` (line ~65–94).
2. **Workout session lifecycle**
   - `currentSession`: what it contains (notes, sets) and that it is persisted while active.
   - `discardSession()` vs `completeSession()` behaviors.
3. **Notes persistence behavior**
   - Notes stored on `WorkoutExerciseModel.notes` during active session.
   - Notes intentionally stripped before pushing into `sessionHistory` in `WorkoutStore.completeSession` (WorkoutStore.ts line ~420–427).
   - User-facing scenario: “previous note” will only appear if resuming an in-progress session; completed workouts won’t show notes in history.
4. **Sets persistence behavior**
   - Sets exist in `currentSession`, move into `sessionHistory` on completion.
   - Template sets persist via `WorkoutStore.templates`.
5. **Template persistence behavior**
   - How templates are created/updated from sessions (WorkoutStore.ts: `createTemplateFromSession`, `updateTemplateFromCurrentSession`).
   - What fields are stored (exercise ids + sets; no notes).
6. **Performance memory (“suggested” placeholders) behavior**
   - `PerformanceMemoryStore.recordCompletedWorkout` populates `patternMemories` on completion.
   - How placeholders are queried via `getPlaceholdersForSet`.
7. **FAQ / Scenarios**
   - “Why did my note disappear after finishing?”
   - “Why do my set placeholders show last time’s numbers?”
   - “What happens if I kill the app mid-workout?”

**Success criteria:** Document matches current code behavior and includes direct references to the key source files.

---

### Phase 5 — Tests & Validation
1. Run fast tests:
   - `npm test`
2. Optional: `npm run compile` (typecheck) if CI expects it.

**Success criteria:** Jest suite passes.

---

## Risk Assessment
| Risk | Probability | Impact | Mitigation |
|---|---:|---:|---|
| `borderless` change affects other fields | Low | Medium | Confirm `borderless` only used in NoteInput via `grep`. |
| Done checkmark color differs across themes | Medium | Medium | Use explicit `#FFFFFF` for checkmark color. |
| Spacing tweaks cause layout regressions | Low | Medium | Keep changes limited to padding/margins; verify on both light/dark themes. |

## Rollback Plan
- Revert commits that touch:
  - `TextField.tsx`, `NoteInput.tsx`, `SetRow.tsx`, `ActiveWorkoutScreen.tsx`
- Re-run `npm test`.
- No data migrations required.

## Validation Checklist
- [ ] YAGNI: no new persistence features added
- [ ] KISS: only simple conditionals/padding adjustments
- [ ] DRY: reused `borderless` + theme colors
- [ ] Existing systems: no custom theming system introduced
- [ ] Tests: `npm test` passes
- [ ] **Line count ≤ 1000 (current: 215)**
