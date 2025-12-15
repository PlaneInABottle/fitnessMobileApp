# Navigation Flow Fixes and State Synchronization Plan

## Executive Summary

- **Objective:** Fix session persistence, navigation inconsistencies, and state synchronization issues identified in bug report
- **Approach:** Minimal surgical fixes following KISS/YAGNI principles - no architectural changes
- **Timeline:** 4 implementation phases, estimated 2-3 hours total
- **Success Metrics:** Sessions persist across app reloads, resume UI works, navigation is consistent

---

## Requirements Analysis

### Functional Requirements
1. Active workout sessions must persist across app restarts
2. WorkoutTabScreen must show "Resume Workout" when session exists
3. Navigation on session loss must return to WorkoutTab cleanly
4. No race conditions in store initialization

### Non-Functional Requirements
- Maintain encrypted storage for workout data (security)
- No breaking changes to existing API
- Follow existing code patterns and conventions

### Acceptance Criteria
- [ ] Start session → close app → reopen → session is available
- [ ] With active session, WorkoutTab shows "Resume Workout" button
- [ ] ExerciseLibrary with no session uses popToTop() navigation
- [ ] Store setup is singleton to prevent race conditions

---

## Technical Design

### Root Cause Summary

| Issue | Root Cause | Fix Location |
|-------|------------|--------------|
| Session not persisting | `setupRootStore.ts:83-88` clears workoutStore before plain MMKV save, but secure storage data should restore it - issue is Date deserialization | `setupRootStore.ts` |
| No resume UI | WorkoutTabScreen doesn't check `currentSession` | `WorkoutTabScreen.tsx` |
| Poor navigation | Uses `goBack()` instead of `popToTop()` | `ExerciseLibraryScreen.tsx` |
| Race condition | No singleton pattern for async store setup | `setupRootStore.ts` |

### Key Insight: Date Serialization Problem

MST's `types.Date` serializes to ISO strings in JSON. When loading from secure storage, these strings must be converted back to Date objects. The current `JSON.parse` doesn't handle this.

---

## Implementation Phases

### Phase 1: Fix Session Persistence (CRITICAL)

**Objective:** Ensure workoutStore correctly rehydrates from secure storage with proper Date handling

**File:** `/app/models/setupRootStore.ts`

**Changes:**

1. Add Date reviver function for JSON.parse (lines 1-15 area):

```typescript
// Add after imports, before ROOT_STORE_PERSISTENCE_KEY
function dateReviver(_key: string, value: unknown): unknown {
  if (typeof value === "string") {
    // ISO 8601 date pattern
    const iso8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/
    if (iso8601.test(value)) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) return date
    }
  }
  return value
}
```

2. Update `/app/utils/storage/secure.ts` to use Date reviver (lines 73-81):

```typescript
// Replace the load function
export function load<T>(key: string): T | null {
  const str = loadString(key)
  if (str == null) return null

  try {
    return JSON.parse(str, dateReviver) as T
  } catch {
    return null
  }
}

// Add dateReviver at top of file
function dateReviver(_key: string, value: unknown): unknown {
  if (typeof value === "string") {
    const iso8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/
    if (iso8601.test(value)) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) return date
    }
  }
  return value
}
```

**Verification:**
- Start workout session
- Close app completely
- Reopen app
- Session should persist and be resumable

---

### Phase 2: Add Resume Workout UI

**Objective:** Show "Resume Workout" button when active session exists

**File:** `/app/screens/WorkoutTabScreen.tsx`

**Changes:**

1. Add active session check after line 22:

```typescript
const hasActiveSession = !!workoutStore.currentSession
```

2. Replace the "Start Empty Workout" Button (line 44) with conditional:

```typescript
{hasActiveSession ? (
  <Button
    text="Resume Workout"
    preset="filled"
    onPress={() => navigation.navigate("ActiveWorkout")}
  />
) : (
  <Button text="Start Empty Workout" preset="filled" onPress={handleStartEmptyWorkout} />
)}
```

**Verification:**
- Start a workout
- Navigate to WorkoutTab
- "Resume Workout" button should appear instead of "Start Empty Workout"

---

### Phase 3: Fix Navigation on Session Loss

**Objective:** Use popToTop() for cleaner navigation when session is lost

**File:** `/app/screens/ExerciseLibraryScreen.tsx`

**Changes:**

1. Replace line 64-66 (no session error handler):

```typescript
{!session ? (
  <ErrorMessage
    message="No active workout session."
    actionLabel="Start New"
    onActionPress={() => navigation.popToTop()}
  />
```

**File:** `/app/screens/ActiveWorkoutScreen.tsx`

2. Update line 92-94 (no session error handler):

```typescript
{!session ? (
  <ErrorMessage
    message="No active workout session."
    actionLabel="Start Workout"
    onActionPress={() => navigation.popToTop()}
  />
```

**Verification:**
- Navigate to ExerciseLibrary without session (simulate session loss)
- Press action button
- Should navigate directly to WorkoutTab

---

### Phase 4: Singleton Store Setup (Race Condition Fix)

**Objective:** Prevent multiple concurrent store setups

**File:** `/app/models/setupRootStore.ts`

**Changes:**

1. Add singleton promise at module level (after line 11):

```typescript
let setupPromise: Promise<{ rootStore: RootStore; dispose: IDisposer }> | null = null
```

2. Wrap setupRootStore in singleton pattern (modify lines 13-95):

```typescript
async function setupRootStoreImpl(): Promise<{ rootStore: RootStore; dispose: IDisposer }> {
  // ... existing setupRootStore implementation ...
}

export async function setupRootStore(): Promise<{ rootStore: RootStore; dispose: IDisposer }> {
  if (!setupPromise) {
    setupPromise = setupRootStoreImpl()
  }
  return setupPromise
}
```

**Verification:**
- Rapid hot reloads should not cause store inconsistencies
- App should handle quick mount/unmount cycles gracefully

---

## Testing Strategy

### Unit Tests

1. **Date reviver function:**
   - Test valid ISO dates are converted
   - Test invalid strings are passed through
   - Test non-string values are passed through

2. **Store persistence:**
   - Test workoutStore serializes correctly
   - Test workoutStore deserializes with Date objects

### Integration Tests

1. **Session persistence flow:**
   - Start session → mock app restart → verify session exists

2. **WorkoutTabScreen:**
   - With session: verify Resume button renders
   - Without session: verify Start button renders

### Manual Testing

1. Start workout → add exercises → close app → reopen → verify session intact
2. Navigate WorkoutTab → ActiveWorkout → ExerciseLibrary → simulate session loss → verify navigation to WorkoutTab
3. Hot reload multiple times during active session → verify no crashes

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Date parsing breaks valid non-date strings | Low | Medium | Use strict ISO 8601 regex |
| Singleton causes stale state on logout | Low | Low | Clear setupPromise on logout if needed |
| Existing tests break | Medium | Low | Run `npm test` after each phase |
| UI layout shift with conditional button | Low | Low | Same button size/styling |

---

## Success Criteria & Validation

### Functional Validation
- [ ] Session persists across app restart (Issue #1)
- [ ] Resume Workout button appears with active session (Issue #2)
- [ ] Navigation uses popToTop when session lost (Issue #3)
- [ ] No race condition on rapid mount/unmount (Issue #4)

### Testing Validation
- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] Manual testing covers all scenarios

---

## Rollback Plan

### Trigger Conditions
- Tests fail after changes
- App crashes on startup
- Session data becomes corrupted

### Rollback Procedure
1. Revert changes via git: `git checkout -- app/`
2. Clear app data if storage is corrupted
3. Investigate root cause before re-attempting

---

## Dependencies & Prerequisites

- No external dependencies required
- No package installations needed
- Existing test infrastructure sufficient

---

## Implementation Order

1. **Phase 1** (Critical): Fix date serialization in secure.ts
2. **Phase 2**: Add resume UI to WorkoutTabScreen
3. **Phase 3**: Fix navigation in ExerciseLibraryScreen and ActiveWorkoutScreen
4. **Phase 4**: Add singleton pattern to setupRootStore

Each phase can be tested independently before proceeding.

---

## Files Changed Summary

| File | Change Type | Lines Affected |
|------|-------------|----------------|
| `app/utils/storage/secure.ts` | Add dateReviver | +12 lines |
| `app/screens/WorkoutTabScreen.tsx` | Add conditional resume button | +10 lines |
| `app/screens/ExerciseLibraryScreen.tsx` | Change goBack to popToTop | 2 lines |
| `app/screens/ActiveWorkoutScreen.tsx` | Change navigate to popToTop | 2 lines |
| `app/models/setupRootStore.ts` | Add singleton pattern | +8 lines |

**Total estimated changes:** ~34 lines added/modified

---

## Design Principles Validation

### YAGNI ✅
- Only fixing identified bugs
- No speculative features added
- No "future-proofing"

### KISS ✅
- Simple date reviver function (8 lines)
- Conditional render for resume button (6 lines)
- Singleton is standard pattern (4 lines)

### DRY ✅
- dateReviver is reusable if needed elsewhere
- Using existing ErrorMessage component
- Following existing button patterns

### Existing Systems ✅
- Using existing MMKV storage utilities
- Using existing navigation patterns
- Using existing MobX-State-Tree setup
