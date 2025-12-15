# Screen Safe-Area & Header Patterns Review Report

## Executive Summary
- Review Type: Code Review (layout/safe-area)
- Overall Assessment: NEEDS_CHANGES
- Critical Issues: 2
- High Priority Issues: 3
- Review File: docs/screen-safe-area-headers.review.md

## CRITICAL Issues (Must Fix)

- app/components/Screen.tsx:39-40, 280-288 - Default safe-area edges are effectively `[]` (no top inset), causing content to render under the status bar/notch.
  Why: `useSafeAreaInsetsStyle` defaults `safeAreaEdges` to `[]` when not provided, so `<Screen />` provides no `paddingTop` unless each screen opts in.
  Fix (minimal): default `safeAreaEdges` inside `Screen` to include top inset (at least `['top']`).

- app/screens/ActiveWorkoutScreen.tsx:82-88; app/screens/ExerciseLibraryScreen.tsx:53-55; app/screens/WorkoutCompleteScreen.tsx:79-81 - Custom headers are rendered inside the scroll container, so they scroll away instead of being fixed.
  Why: Header components (`WorkoutHeader`) are the first child of the scrollable preset.
  Fix (minimal): make the first scroll child sticky (via `stickyHeaderIndices: [0]`) OR move headers into React Navigation’s `header` option.

## HIGH Priority Issues (Must Fix before merge)

- app/components/workout/WorkoutHeader.tsx:48-53 - Sticky header will visually “bleed” because container has no explicit backgroundColor.
  Why: Sticky headers need an opaque background to cover scrolled content underneath.
  Fix: set `backgroundColor: colors.background` (or an explicit token) on the header container.

- app/components/Screen.tsx:208-256 - Web path uses `<ScrollView>` but native path uses `<KeyboardAwareScrollView>`; sticky headers must behave consistently across both.
  Why: `stickyHeaderIndices` needs to be passed through to both implementations via `ScrollViewProps`.
  Fix: prefer the existing `ScrollViewProps` plumbing (already supported) over new abstractions.

- app/screens/WelcomeScreen.tsx:18-21, 39-41 - Screen-level bottom safe area is currently applied to only the bottom panel (not the whole screen).
  Why: If you change `Screen` default to include `bottom`, this screen may get “double” bottom padding.
  Fix: default `Screen` to `['top']` (not `['top','bottom']`) unless a screen opts into bottom.

## MEDIUM Priority Issues (Recommended; avoid overengineering)

- app/utils/useSafeAreaInsetsStyle.ts:42-45 - The reducer spreads `{...acc}` on every edge, creating intermediate objects.
  Why: Minor perf/memory overhead; usually negligible given small edge arrays.
  Note: Optional; only worth changing if profiling shows this is hot.

## Suspected Root Causes (Requested)

### 1) `Screen` defaults to no safe-area padding
- app/components/Screen.tsx:271-281 uses `useSafeAreaInsetsStyle(safeAreaEdges)` but does not provide a default when `safeAreaEdges` is omitted.
- app/utils/useSafeAreaInsetsStyle.ts:36-38 defaults `safeAreaEdges` to `[]`, so the returned style is `{}`.

### 2) “Headers” are implemented as scroll content
- The workout flow uses `WorkoutHeader` as the first child of `<Screen preset="scroll">`, so it naturally scrolls with content.

## Affected Screens / Components (Requested)

### Definitely affected (current patterns)
- app/screens/ActiveWorkoutScreen.tsx - `WorkoutHeader` is inside scroll content; also at risk of top overlap without safe area.
- app/screens/ExerciseLibraryScreen.tsx - `WorkoutHeader` (“Add Exercise”) is inside scroll content.
- app/screens/WorkoutCompleteScreen.tsx - `WorkoutHeader` is inside scroll content.

### Likely affected (top safe area overlap)
- app/screens/WorkoutTabScreen.tsx - Starts with heading text inside `<Screen preset="scroll">` with no safe area edges.
- app/screens/WelcomeScreen.tsx - Uses `<Screen preset="fixed">` without top safe area; may place content under status bar depending on device.

### Already mitigated / intentionally handled
- app/screens/ErrorScreen/ErrorDetails.tsx - Explicit `safeAreaEdges={['top','bottom']}`.
- app/components/Header.tsx - Defaults `safeAreaEdges=['top']` internally (good pattern), but is currently unused by screens.

## Minimal Set of Code Changes to Fix (Requested)

### Option A (KISS, smallest diff): use sticky headers + top safe area default
1) app/components/Screen.tsx
   - Default safe area edges:
     - If `props.safeAreaEdges` is undefined, use `['top']`.
   - Example patch sketch:
     ```ts
     const defaultEdges: ExtendedEdge[] = ["top"]
     const $containerInsets = useSafeAreaInsetsStyle(safeAreaEdges ?? defaultEdges)
     ```

2) app/screens/ActiveWorkoutScreen.tsx
3) app/screens/ExerciseLibraryScreen.tsx
4) app/screens/WorkoutCompleteScreen.tsx
   - Add:
     ```tsx
     <Screen preset="scroll" ScrollViewProps={{ stickyHeaderIndices: [0] }}>
     ```
   - Keep header as first child.

5) app/components/workout/WorkoutHeader.tsx
   - Add opaque background:
     ```ts
     backgroundColor: colors.background
     ```

Why this is preferred:
- YAGNI/KISS: no new layout systems; uses built-in RN `stickyHeaderIndices`.
- Leverages existing `Screen` API (`ScrollViewProps` is already supported).

### Option B (Leverage existing systems): move headers into React Navigation
- Use `navigation.setOptions({ headerShown: true, header: () => <WorkoutHeader .../> })` or revive `useHeader`.
- Notes:
  - Per React Navigation docs, default header handles safe area; custom headers must ensure safe area compliance if needed.
  - More behavioral risk (changes transition/gesture/header height), so not the minimal-first approach.

## Risks / Edge Cases (Requested)

- Web vs native: `stickyHeaderIndices` behavior on React Native Web can differ; verify the header stays pinned and doesn’t jitter.
- Keyboard: Sticky headers + `KeyboardAwareScrollView` can behave differently around focus/scroll-to-input; regression test adding sets/search field.
- Background bleeding: Without an explicit header background, sticky headers can show content underneath while pinned (fix noted above).
- Default safe-area edges: Setting `['top','bottom']` globally may introduce double bottom padding on screens already manually applying bottom insets (e.g., WelcomeScreen).

## Design Principles Assessment
- YAGNI: ✓ (recommended Option A is minimal and addresses current issues only)
- KISS: ✓ (use default top inset + `stickyHeaderIndices`)
- DRY: ✓ (centralizes default safe area behavior in `Screen`)
- Existing Systems: ✓ (uses existing `Screen` plumbing; optionally React Navigation header)

## Approval Status
- Overall Decision: BLOCKED
- Blocking Issues:
  - Missing default top safe-area padding in `Screen`.
  - Workout headers implemented as scroll content (not fixed/sticky).

## Review Metadata
- Reviewer: AI Code Reviewer Agent
- Review Date: 2025-12-15
- Files Reviewed:
  - app/components/Screen.tsx
  - app/utils/useSafeAreaInsetsStyle.ts
  - app/components/workout/WorkoutHeader.tsx
  - app/screens/ActiveWorkoutScreen.tsx
  - app/screens/ExerciseLibraryScreen.tsx
  - app/screens/WorkoutCompleteScreen.tsx
  - app/screens/WorkoutTabScreen.tsx
  - app/screens/WelcomeScreen.tsx
  - app/screens/ErrorScreen/ErrorDetails.tsx
