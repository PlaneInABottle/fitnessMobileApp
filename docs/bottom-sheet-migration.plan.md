# BottomSheet Migration Plan (Modal → `@gorhom/bottom-sheet`)

## Executive Summary
- **Objective:** Replace the legacy “`visible` boolean + RN `Modal`” bottom sheet behavior with `@gorhom/bottom-sheet` while keeping the existing call sites unchanged.
- **Approach:** Keep `app/components/BottomSheet.tsx` as a *backward-compatible facade* (same props: `visible`, `onClose`, `title`, `children`, `style`), but render a `BottomSheetModal` underneath.
- **Success Metrics:**
  - Existing call sites (e.g. `ExerciseLibraryScreen`, `SetOptionsBottomSheet`) require **0** changes.
  - Bottom sheet closes via backdrop press + swipe-down; `onClose` is called.
  - Jest tests remain deterministic (no animation/timing flakiness).

---

## Phase 1 — Current State Analysis (Repo)

### 1) Component API & behavior
- `app/components/BottomSheet.tsx` exposes a **Modal-like API** (`visible`, `onClose`) and an optional `title`.
- It currently already uses `@gorhom/bottom-sheet` primitives:
  - `BottomSheetModal` w/ an imperative ref (`present()` / `dismiss()`) driven by `visible` (see `useEffect`, around lines 41–45).
  - Backdrop configured to close on press (`pressBehavior="close"`, around lines 47–57).
  - `onDismiss={onClose}` to feed dismissal back into state (around line 82).
- There is an explicit test-only rendering path guarded by `global.__TEST__` (around lines 59–76) to make “`visible=false` renders nothing” deterministic.

### 2) Root/provider setup
- `app/app.tsx` wraps navigation with `BottomSheetModalProvider` (around lines 26 and 104–110).
  - This matches the standard Gorhom + Ignite setup: provider is at app root so all modals can portal correctly.

### 3) Usage patterns
- `app/screens/ExerciseLibraryScreen.tsx`:
  - Uses `BottomSheet` as “controlled modal” via local boolean state (e.g. `showMuscleFilter`) and closes by `setShowMuscleFilter(false)` (around lines 153–205).
- `app/components/workout/SetOptionsBottomSheet.tsx`:
  - Same controlled usage (`visible` / `onClose`) and relies on close-before-action semantics (around lines 57–101).
- `app/screens/ActiveWorkoutScreen.tsx`:
  - Manages selection state and passes `visible={!!selectedSetInfo}` to `SetOptionsBottomSheet` (around lines 222–228).

### 4) Testing state
- Jest setup mocks `@gorhom/bottom-sheet` in `test/setup.ts` (around lines 54–67), replacing `BottomSheetModal` with a simple `View`.
- **Important implication:** if tests *don’t* run the `global.__TEST__` path, `visible=false` may still render children because the mocked `BottomSheetModal` will render regardless of `present/dismiss`.

---

## Requirements

### Functional
1. **Controlled visibility**: callers toggle `visible` and expect content to appear/disappear.
2. **Dismissal**: backdrop press and swipe-down dismiss must trigger `onClose`.
3. **Title + content**: optional header title + arbitrary children.
4. **Styling**: allow a container style override (`style`).
5. **Snap points**: allow per-call-site snap points (default acceptable).

### Non-functional
- **Backward compatible**: no call site changes required for Phase 1 migration.
- **Deterministic tests**: no reliance on animations/timers/portals.
- **KISS**: avoid introducing new abstractions (no global sheet manager, no custom portal layer).

---

## Target Design (Aligned with Ignite “SelectFieldWithBottomSheet” Recipe)

### Root setup (one-time)
- Ensure these are present and correct:
  1. `BottomSheetModalProvider` at the root (`app/app.tsx`).
  2. Reanimated Babel plugin (`react-native-reanimated/plugin`) in `babel.config.js`.
  3. Gesture handler initialized early (already done via `app/utils/gestureHandler.ts` import in `app/app.tsx`).

### Component-level approach (facade)
Keep `app/components/BottomSheet.tsx` as the single reusable wrapper:
- **Inputs:** `visible`, `onClose`, `title`, `children`, `style`, `snapPoints?`.
- **Internal mechanics:**
  - `ref.present()` when `visible` becomes true.
  - `ref.dismiss()` when `visible` becomes false.
  - `onDismiss={onClose}`.
  - `backdropComponent` uses `BottomSheetBackdrop` with `pressBehavior="close"`.

This matches the Ignite recipe shape (snapPoints memoized, backdrop callback memoized, modal controlled by ref), while keeping existing app usage unchanged.

### Web + test fallback (minimal)
- For **tests**, keep (or introduce) a deterministic branch (like `global.__TEST__`) that:
  - returns `null` when `visible === false`
  - renders a simple overlay + `Pressable` backdrop that calls `onClose`
- For **web** (if supported by the project), prefer the same simple fallback to avoid runtime incompatibilities with native gesture/portal behavior.

---

## Implementation Roadmap

### Phase 0 — Preconditions (Dependencies/Config)
**Deliverables**
- Confirm `@gorhom/bottom-sheet` is installed.
- Confirm `react-native-reanimated/plugin` is configured.
- Confirm `BottomSheetModalProvider` wraps the app.

**Success Criteria**
- App boots on iOS/Android without runtime errors.

**Risks / Mitigation**
- Misconfigured Reanimated plugin → verify Metro cache reset + rebuild.

---

### Phase 1 — Migrate `BottomSheet` internals (no call site changes)
**Deliverables**
- Update `app/components/BottomSheet.tsx` to use:
  - `BottomSheetModal` + `BottomSheetView`
  - imperative ref (`present/dismiss`) bound to `visible`
  - backdrop press-to-close
  - optional `snapPoints` prop (default: `["50%"]`)
- Keep existing visual structure (title header + content container) to avoid UI regressions.

**Success Criteria**
- `ExerciseLibraryScreen` and `SetOptionsBottomSheet` continue to behave as before.

---

### Phase 2 — Root/provider confirmation & navigation integration
**Deliverables**
- Ensure `BottomSheetModalProvider` remains high enough in the tree to cover all screens (`app/app.tsx`).
- Verify no nested providers are needed (KISS).

**Success Criteria**
- Bottom sheets open correctly from any screen.

---

### Phase 3 — Testing strategy (Jest + RTL)

#### Unit tests for `BottomSheet`
Update/extend `app/components/__tests__/BottomSheet.test.tsx` to validate:
- `visible=true` renders content.
- `visible=false` renders nothing.
- `title` is optional.
- Backdrop press triggers `onClose` (use a `testID` like `bottom-sheet-backdrop` in the test fallback branch).

#### Test harness
- In `test/setup.ts`:
  - **Set** `global.__TEST__ = true` to force deterministic rendering for this component, OR
  - Keep mocking `@gorhom/bottom-sheet` but ensure `BottomSheet` hides children when `visible=false`.

**Success Criteria**
- `npm test` passes reliably (no timing-related flakes).

---

### Phase 4 — Optional follow-ups (only if needed)
(YAGNI gate: do not do these unless there’s a concrete bug/need.)
- Add accessibility improvements: `accessibilityViewIsModal`, focus trapping, etc.
- Add “sheet height variants” via standardized snap point presets.

---

## Backward-Compatible API Guidance

### Keep (for now)
- **Controlled prop API**:
  ```ts
  <BottomSheet visible={state} onClose={() => setState(false)} title="...">...
  ```
- This matches current usage in `ExerciseLibraryScreen` and `SetOptionsBottomSheet`.

### Avoid introducing (for Phase 1)
- A new imperative API exposed to callers.
- A global “sheet manager”.
- Switching call sites to Gorhom’s `index`-controlled sheets.

### If we ever need a breaking change
- Provide a compatibility wrapper for 1 release cycle:
  - Keep `BottomSheet` facade API
  - Introduce a new component name (e.g. `BottomSheetModalSheet`) for advanced usage
  - Deprecate with clear migration notes

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Jest renders children even when `visible=false` (because `BottomSheetModal` is mocked to a `View`) | High | High | Force deterministic branch via `global.__TEST__ = true` and assert close behavior via `testID` backdrop |
| Missing Reanimated plugin/config causes runtime crash | Medium | High | Ensure `react-native-reanimated/plugin` is last Babel plugin; rebuild dev client |
| Web runtime incompatibility | Medium | Medium | Add simple web fallback (reuse the test fallback UI) |

---

## Rollback Plan
- Roll back by reverting the `BottomSheet` implementation back to RN `Modal` (single-file change) while keeping the same public props.
- Trigger rollback if:
  - Crash on app startup related to Reanimated/Gesture Handler
  - Bottom sheets cannot open/dismiss on a primary platform

---

## Design Principles Validation (Required)

### YAGNI
- [x] Plan only covers replacing the underlying sheet implementation; no new global abstractions.

### KISS
- [x] Keep one reusable `BottomSheet` wrapper; root provider only.

### DRY
- [x] Centralize sheet behavior in `app/components/BottomSheet.tsx` rather than per-screen implementations.

### Leverage existing systems
- [x] Use existing theme system (`useAppTheme`) and existing provider wiring in `app/app.tsx`.

---

## Line Count
- Current file line count: **207 lines** (max 1000).
