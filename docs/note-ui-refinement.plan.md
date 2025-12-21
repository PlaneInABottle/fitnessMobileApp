# Note UI Refinement (Active Workout) — Implementation Plan

## Executive Summary
- **Objective:** Make the per-exercise note input visually blend with the Active Workout UI in dark mode (true-black surfaces) and remove the separator line that visually “caps” the note area.
- **Approach (KISS/YAGNI):** Style-only changes in `NoteInput` plus a tiny, optional prop to suppress the `ExerciseCard` bottom separator in this specific composition; optionally add a single `TextField` prop to support a borderless variant without breaking focus affordances.
- **Success Metrics:**
  - Note input background matches `colors.background` (true black) and does not look like a raised card.
  - No separator line between `ExerciseCard` and the note input.
  - No changes to note behavior: value binding, placeholder copy, placement in the workout flow.
  - `npm test` passes.

## Scope / Non-Goals
- **In scope:** Visual styling only for the note input region on `ActiveWorkoutScreen`.
- **Out of scope (explicit):**
  - Any changes to note persistence, store behavior, placeholder text, navigation, or workout flow.
  - Any layout/position changes beyond removing borders/separators and matching background.

## Current State (Repo Evidence)
- **Note input usage:** `app/components/workout/NoteInput.tsx` renders `TextField` with `containerStyle` and `inputWrapperStyle` overrides (lines **16–24**).
- **NoteInput styles today:** only `marginHorizontal` on container and `minHeight`/`paddingVertical` on wrapper (lines **28–35**), so the wrapper inherits `TextField` defaults.
- **TextField default wrapper styling:** `app/components/TextField.tsx` sets `borderWidth: 1`, `borderRadius: 8`, `backgroundColor: colors.cardSecondary`, `borderColor: colors.border` (lines **265–272**), and applies focus styling `{ borderColor: colors.tint, borderWidth: 2 }` (line **156**).
- **Active workout composition:** `app/screens/ActiveWorkoutScreen.tsx` renders `<ExerciseCard />` then `<NoteInput />` per exercise (lines **188–195**).
- **ExerciseCard separator:** `app/components/workout/ExerciseCard.tsx` container includes `borderBottomWidth: 1` and `borderBottomColor: colors.separator` (lines **99–106**).
- **Dark theme true-black background:** `app/theme/colorsDark.ts` defines `colors.background = palette.neutral100 = "#000000"` (lines **8**, **74–78**).

## Design Principles Analysis (mandatory)
- **YAGNI:** Only change what is needed for the requested UI refinement (no new UX behaviors).
- **KISS:** Prefer local style overrides and a single boolean prop over new wrapper components or theme rewrites.
- **DRY:** Reuse existing theming (`useAppTheme`, `colors.background`) and existing components (`TextField`, `ExerciseCard`).
- **Existing Systems Leverage:** Keep all changes within the current styling/theming system and component composition used by `ActiveWorkoutScreen`.

## Proposed Changes (Minimal)

### Change 1 — Make note input background true-black and remove “card” feel
**File:** `app/components/workout/NoteInput.tsx`

**Goal:** Ensure the note input wrapper surface uses `colors.background` (true black) instead of `colors.cardSecondary`, and remove visible borders/radius that make it appear like a separate card.

**Exact style changes (minimal):**
- Update `$inputWrapper` (currently lines **32–35**) to also set:
  - `backgroundColor: colors.background`
  - `borderRadius: 0` (to match other workout surfaces that are square/flush)

**Border handling (see Change 3):**
- To truly remove the border without killing focus affordance, prefer a `TextField`-level prop (Change 3). If Change 3 is not accepted, fallback is to leave the default border (but this may not meet the “indistinguishable” requirement).

### Change 2 — Remove the separator line between ExerciseCard and NoteInput
**File(s):**
- `app/components/workout/ExerciseCard.tsx`
- `app/screens/ActiveWorkoutScreen.tsx`

**Why:** The separator currently belongs to `ExerciseCard` (lines **104–106**) and appears as a line directly above the note input, visually dividing the note area.

**Minimal API addition (recommended):**
- In `ExerciseCardProps` add:
  - `showBottomSeparator?: boolean` (default: `true`)

**Default behavior:**
- If omitted, existing screens keep the separator exactly as today.

**Implementation guidance:**
- In `$container` style (around lines **99–106**), conditionally apply `borderBottomWidth`/`borderBottomColor` based on `showBottomSeparator`.
  - When `showBottomSeparator` is `false`: remove the border entirely.

**Usage change:**
- In `ActiveWorkoutScreen.tsx` where `<ExerciseCard exercise={exercise} />` is rendered (line **189**), pass `showBottomSeparator={false}`.

### Change 3 (Optional but recommended) — Support a borderless TextField variant without breaking focus
**File:** `app/components/TextField.tsx`

**Problem:** `TextField`’s style stack applies user `inputWrapperStyle` override last (line **160**), so any attempt to hide the border via `inputWrapperStyle` would also override the focus styling (line **156**). We need a way to remove the border in the idle state while preserving focus indication (accessibility).

**Minimal API shape:**
- Add to `TextFieldProps`:
  - `borderless?: boolean` (default: `false`)

**Default behavior:**
- When `borderless` is not provided, `TextField` behaves exactly the same as today.

**Behavior when `borderless` is true:**
- Idle state: no border (e.g., `borderWidth: 0`).
- Focus state: keep the existing focus ring behavior `{ borderColor: colors.tint, borderWidth: 2 }`.

**How to apply (style stack guidance):**
- In `$inputWrapperStyles` array (lines **152–161**): insert a conditional style *before* the focus style:
  - `borderless && { borderWidth: 0 }`
- Keep the existing focus style as-is so it can still apply.

**Usage:**
- In `NoteInput.tsx` pass `borderless` to the `TextField` instance (no other call sites affected).

## Step-by-Step Execution Plan

### Phase 0 — Baseline safety
1. Create a working branch.
2. Run `npm test` to confirm baseline.

**Success criteria:** Baseline test suite passes.

### Phase 1 — Remove ExerciseCard separator only in ActiveWorkoutScreen
1. **`app/components/workout/ExerciseCard.tsx`**
   - Add `showBottomSeparator?: boolean` to props with default `true`.
   - Apply conditional border styles in `$container`.
2. **`app/screens/ActiveWorkoutScreen.tsx`**
   - Change `<ExerciseCard exercise={exercise} />` (line **189**) to `<ExerciseCard exercise={exercise} showBottomSeparator={false} />`.

**Validation:**
- Visual: no line between the exercise header and the note input.
- Regression: other screens using `ExerciseCard` remain unchanged.

### Phase 2 — Make NoteInput surface match true-black
1. **`app/components/workout/NoteInput.tsx`**
   - Extend `$inputWrapper` to set `backgroundColor: colors.background` and `borderRadius: 0` while keeping existing `minHeight` and `paddingVertical`.

**Validation:**
- Visual: note area background is indistinguishable from `colors.background` (true black per `colorsDark.ts` lines **74–78**).
- Functional: placeholder, typing, and value binding unchanged.

### Phase 3 (Optional) — Borderless TextField support
1. **`app/components/TextField.tsx`**
   - Add `borderless?: boolean` to `TextFieldProps` (default false).
   - In `$inputWrapperStyles`, add `borderless && { borderWidth: 0 }` before the focus style.
2. **`app/components/workout/NoteInput.tsx`**
   - Pass `borderless` to the `TextField` instance.

**Validation:**
- Visual: note input has no idle border.
- Accessibility: focus state still shows a clear focus ring (tint border).

## Testing Strategy
- **Unit/Integration:**
  - Run `npm test`.
- **Manual UI checks (targeted):**
  - Dark mode: confirm note input background blends with workout screen background.
  - Focus/typing: confirm focus ring appears (if Change 3 implemented) and text caret/selection is visible.
  - Scroll + keyboard: confirm no regressions in `ScrollView` behavior.

## Risk Assessment & Mitigation
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Border removal via `inputWrapperStyle` accidentally removes focus ring | Medium | Medium | Prefer Change 3 so focus styling remains intact. |
| `ExerciseCard` prop change breaks other call sites | Low | Medium | Provide default `true`; TypeScript catches missing prop usage issues. |
| Visual mismatch across themes | Low | Medium | Use `colors.background` (themed), not hard-coded hex. |

## Rollback Plan
- Revert the commit(s) that:
  - Add `showBottomSeparator` to `ExerciseCard` and its usage.
  - Adjust `NoteInput` styles.
  - (Optional) add `borderless` to `TextField`.

## Dependencies & Prerequisites
- No new libraries.
- Uses existing theme context (`useAppTheme`) and existing components.

## Design Principles Validation Checklist
- [x] **YAGNI:** Only styles + minimal props required for current UI goal.
- [x] **KISS:** One optional boolean per impacted component; no new architectural layers.
- [x] **DRY:** Reuse existing theming and TextField/ExerciseCard components.
- [x] **Existing Systems:** No custom theme hacks; use `colors.background`.

## Line Count
- **Maximum Length:** 1000 lines
- **Current:** 163 lines (`wc -l docs/note-ui-refinement.plan.md`)
