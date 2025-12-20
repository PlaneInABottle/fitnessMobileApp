# Workout Logging UI Fixes — Implementation Plan

## Executive Summary
- **Objective:** Fix 3 UI/UX issues in workout logging with minimal, low-risk changes:
  1) `SetOptionsBottomSheet` (via shared `BottomSheet`) overlaps OS bottom navigation area; respect safe-area insets so OS bottom buttons remain pressable.
  2) Replace the working/normal set indicator label `N` with sequential numbers (1,2,3,...) **only** for working sets; other set types remain W/D/F.
  3) Kg/Reps numeric inputs should render **white + bold only when the user entered a value**; when empty they should look like placeholders.
- **Approach:** Make small, targeted edits in existing shared components:
  - Safe area handling in `app/components/BottomSheet.tsx` (DRY: fixes all sheets).
  - Numbered display logic in `app/components/SetTypeIndicator.tsx` (used across set rows).
  - Input display/styling logic in `app/components/workout/SetRow.tsx`.
- **Success Metrics:**
  - Bottom sheet content no longer overlaps bottom safe area; OS nav buttons remain usable while sheet is open.
  - Working sets display `1..n` on the badge in Active Workout; other set types still show W/D/F.
  - Kg/Reps inputs show placeholder style when empty; show white/bold only after user edits.

## Current State Analysis (Relevant Code)

### Issue (1) — Bottom sheet safe area
- `app/components/workout/SetOptionsBottomSheet.tsx` uses `BottomSheet` (line ~58).
- `app/components/BottomSheet.tsx` wraps `@gorhom/bottom-sheet` and currently sets a fixed `paddingBottom: spacing.lg` for content container (line ~112–114).
- There is **no** safe-area-aware bottom inset/padding, so on devices with:
  - iOS home indicator, or
  - Android 3-button navigation with translucent nav bar,
  the sheet may extend into the system navigation region.

### Issue (2) — Working set label is always `N`
- `app/components/SetTypeIndicator.tsx` defines `SET_TYPE_LETTERS` with `working: "N"` (line ~20–25) and always renders that mapping (line ~35–43).
- `SetRow` already passes `index` only for working sets (line ~233–236):
  - `index={setTypeId === "working" ? index : undefined}`.
- Tests currently assert `N` even when index is provided:
  - `app/components/__tests__/SetTypeIndicator.test.tsx` (line ~45–60).

### Issue (3) — Kg/Reps inputs styling doesn’t match “only when user entered a value”
- In `app/components/workout/SetRow.tsx`, edit-mode numeric inputs are rendered via RN `TextInput` (line ~151–168).
- Styling is currently driven by `touched?.[key]` and whether there is a pre-filled value (line ~147–165).
- In `ActiveWorkoutScreen`, `SetRow` is used with `allowEmptyNumbers={false}` (line ~176–199), so values can be coerced to `0`; additionally, the parent does not maintain/propagate `touched`, so “user entered” isn’t reliably detectable from props.

## Requirements & Acceptance Criteria

### Functional
1. **Safe area bottom inset:** When `SetOptionsBottomSheet` is open, the sheet’s background/content must not cover the OS navigation area.
2. **Numbered working sets:** For working sets only, display the 1-based set index (1,2,3...). All other set types still display their letter (W/D/F).
3. **Input appearance rule:** For Kg/Reps fields:
   - When empty (no user entry), show placeholder appearance.
   - When user entered a value (including `0` if explicitly typed), show white + bold text.

### Non-functional
- **KISS/YAGNI:** No new abstractions (no global sheet manager, no new form framework).
- **DRY:** Implement safe area fix in shared `BottomSheet` (not per-sheet).
- **Minimal behavior changes:** Keep data model semantics the same; changes should be presentation-level unless strictly necessary.

## Proposed Technical Design (Minimal Changes)

### (1) Make `BottomSheet` safe-area aware
**Primary change location:** `app/components/BottomSheet.tsx`

**Plan:**
- Import `useSafeAreaInsets` from `react-native-safe-area-context`.
- Compute `const { bottom } = useSafeAreaInsets()`.
- Apply safe area in two places:
  1) **Gorhom modal inset:** pass `bottomInset={bottom}` to `<BottomSheetModal ...>`.
  2) **Content padding:** change `$container` paddingBottom from `spacing.lg` to `spacing.lg + bottom`.

**Why this is minimal:**
- Fix is centralized in `BottomSheet` wrapper and benefits `SetOptionsBottomSheet` and any other sheet using this component.
- No call site changes (keeps existing API unchanged).

**Edge cases:**
- In tests, the `globalThis.__TEST__` fallback branch should match the runtime branch as closely as needed. Ensure the test container padding also includes `bottom` (use a default of 0 if safe area context is not mounted in tests).

### (2) Working sets show sequential numbers
**Primary change location:** `app/components/SetTypeIndicator.tsx`

**Plan:**
- Update display logic:
  - If `type === "working"` and `typeof index === "number"`, render `String(index)`.
  - Otherwise, render existing `SET_TYPE_LETTERS[type]`.
- Keep colors unchanged (still driven by `getSetTypeColor(type)`), so only the label changes.

**Test updates:**
- Update `app/components/__tests__/SetTypeIndicator.test.tsx`:
  - Change the working set test to expect `"1"` when `index: 1`.
  - Keep “without index” expectation as `"N"` **only if** we choose to preserve a fallback for non-indexed call sites.

**YAGNI/KISS note:**
- The app already passes `index` for working sets in `SetRow`, so the primary UX will become numeric immediately.
- Keeping `N` as a fallback when `index` is missing avoids unintended UI changes in any other call site that renders a working set without index.

### (3) Kg/Reps inputs: placeholder when empty; bold/white only when user entered
**Primary change location:** `app/components/workout/SetRow.tsx`

**Plan (UI-only, minimal risk):**
- Add **local touched tracking** inside `SetRow` for edit-mode inputs to detect user interaction even if parent doesn’t provide `touched`.
  - `const [localTouched, setLocalTouched] = useState<Partial<Record<EditableFieldKey, boolean>>>({})`.
  - When `onChangeText` fires for a field, set `localTouched[key] = true`.
- For fields `key === "weight"` and `key === "reps"` only:
  - Define `const isTouched = !!touched?.[key] || !!localTouched[key]`.
  - Define `const shouldShowPlaceholder = !isTouched && (current === 0 || current === undefined)`.
  - Render `value={shouldShowPlaceholder ? "" : toText(current)}` so the placeholder is visible when the user has not entered a value.
  - Style rules:
    - Placeholder state: use dim text + medium weight (keep existing placeholderTextColor).
    - Entered state: use `colors.text` and `typography.primary.bold`.

**Why this satisfies the requirement without changing data semantics:**
- The underlying value can remain `0` (needed when `allowEmptyNumbers=false`), but visually it’s treated as “empty until user touches/edits.”

**Out of scope (explicitly not doing):**
- Changing `buildDefaultSetData` to use `undefined` instead of `0`.
- Changing `allowEmptyNumbers` behavior in `ActiveWorkoutScreen`.

## Implementation Roadmap

### Phase 1 — Bottom sheet safe area (SRP: sheet container only)
**Files:**
- `app/components/BottomSheet.tsx`

**Steps:**
1. Import `useSafeAreaInsets`.
2. Add `const insets = useSafeAreaInsets()`.
3. Pass `bottomInset={insets.bottom}` to `BottomSheetModal`.
4. Update `$container` so `paddingBottom` includes `insets.bottom`.
5. Mirror the padding behavior in the `globalThis.__TEST__` fallback branch.

**Success Criteria:**
- With sheet open, the bottom of content sits above the system navigation area.

### Phase 2 — Working set badge numbering
**Files:**
- `app/components/SetTypeIndicator.tsx`
- `app/components/__tests__/SetTypeIndicator.test.tsx`

**Steps:**
1. Modify `SetTypeIndicator` to use `index` only when `type === "working"`.
2. Update tests to match new behavior (expect numeric for working sets with index).

**Success Criteria:**
- Active workout rows display `1,2,3,...` for working sets.
- Warmup/dropset/failure remain W/D/F even if index is present.

### Phase 3 — Kg/Reps placeholder vs entered styling
**Files:**
- `app/components/workout/SetRow.tsx`

**Steps:**
1. Add local touched state.
2. Restrict changes to keys `weight` and `reps`.
3. Adjust `TextInput` `value` to `""` when should show placeholder.
4. Apply style rule: bold/white only when entered.

**Success Criteria:**
- Fresh rows show placeholder appearance for Kg/Reps.
- After typing, the typed text becomes white/bold.

## Testing Strategy

### Automated (existing Jest tests)
Run:
- `npm test` (or the repo’s existing test command).

Update/validate:
- `app/components/__tests__/SetTypeIndicator.test.tsx` passes with the new working set expectations.
- `app/screens/__tests__/activeWorkoutSetInteractions.test.tsx` should remain valid (it queries by accessibility labels, not badge text).

### Manual QA (device/simulator)
1. **Bottom sheet safe area:**
   - Open Active Workout → tap set type badge → open “Set Türünü Seç”.
   - On iOS with home indicator: verify sheet content is not flush to the bottom and the home indicator area is not covered.
   - On Android with 3-button navigation (and translucent nav bar if applicable): verify OS back/home/recents remain pressable while sheet is open.
2. **Working set numbering:**
   - Ensure first working set shows “1”, second “2”, etc.
   - Change a set to warmup/dropset/failure and verify it shows W/D/F (not a number).
3. **Kg/Reps placeholder/entered styling:**
   - For a newly added set: Kg/Reps should show placeholder (dim) until user types.
   - After typing `100` or `0`, the value should render white/bold.

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Safe area insets not available in some test contexts | Low | Medium | Default bottom inset to 0 if hook returns undefined; keep `__TEST__` branch robust |
| Numbering change breaks existing test expectations | High | Low | Update `SetTypeIndicator` tests; ensure non-working types unchanged |
| Local touched state adds rerenders in large set lists | Low | Low | Keep state minimal and per-row; restrict logic to `weight`/`reps` only |

## Rollback Plan
- Revert each change independently by file:
  1) `BottomSheet.tsx`: remove `bottomInset` and revert padding to `spacing.lg`.
  2) `SetTypeIndicator.tsx`: revert to `SET_TYPE_LETTERS` only; revert test.
  3) `SetRow.tsx`: remove local touched logic and value/stylesheet adjustments.

## Dependencies & Prerequisites
- `react-native-safe-area-context` is already in use (e.g., `app/navigators/AppNavigator.tsx`, `app/utils/useSafeAreaInsetsStyle.ts`).
- No new libraries required.

## Design Principles Validation
- **YAGNI:** No new features; only required UI fixes are planned.
- **KISS:** Single-file safe area fix in shared `BottomSheet`; small conditional logic additions elsewhere.
- **DRY:** Safe-area handling is centralized in `BottomSheet`.
- **Leverage Existing Systems:** Uses existing safe-area tooling and existing set index plumbing.

## Line Count
- Current file line count: ≤ 1000 (target: ~250).
