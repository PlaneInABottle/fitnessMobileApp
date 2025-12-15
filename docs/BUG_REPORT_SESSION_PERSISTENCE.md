# Bug Report: Session State Persistence and Visibility Issues

**Date:** 2025-12-15  
**Analyzed by:** Debugging Specialist  
**Status:** Investigation Complete

---

## Executive Summary

Critical issues have been identified in the workout session state persistence and navigation flow. The primary root cause is an **intentional design decision in `setupRootStore.ts`** that explicitly clears `workoutStore` data from persisted state, causing all active sessions to be lost on app reload.

---

## Issue #1: Session State Not Persisting Across App Reloads

### Priority: 🔴 CRITICAL

### Location
- **File:** `/app/models/setupRootStore.ts`
- **Lines:** 81-86

### Root Cause Analysis

The `onSnapshot` handler that persists state to storage **intentionally clears the workoutStore data** before saving to plain MMKV storage:

```typescript
// Lines 81-86 in setupRootStore.ts
workoutStore: {
  currentSession: undefined,  // ⚠️ CRITICAL: Always clears session
  templates: {},              // ⚠️ CRITICAL: Always clears templates
  sessionHistory: [],         // ⚠️ CRITICAL: Always clears history
  lastError: undefined,
},
```

### Why This Happens

The code comment on line 75 states: `"Never persist workout/memory to plain MMKV; keep it encrypted"`. While the intent is to store workout data only in secure storage (line 63-66), the **rehydration logic (lines 19-26) does not properly merge the secure storage data back**.

### Evidence

**Secure Storage Save (Line 63-66):**
```typescript
secureStorage.save(ROOT_STORE_SECURE_PERSISTENCE_KEY, {
  performanceMemoryStore: snapshot.performanceMemoryStore,
  workoutStore: snapshot.workoutStore,  // ✅ Saved to secure storage
})
```

**Rehydration Merge (Lines 19-26):**
```typescript
const merged = {
  ...(persistedState ?? {}),           // From plain MMKV (has empty workoutStore)
  ...(persistedSecureState ?? {}),     // From secure MMKV (has real workoutStore)
  authenticationStore: {...},
} as RootStoreSnapshotIn
```

The spread operator `...persistedSecureState` should work, **BUT** the issue is that `persistedSecureState` is typed as `Partial<RootStoreSnapshotIn>` and loaded via `secureStorage.load()`. If secure storage fails to load (line 44 in secure.ts returns `null` on errors), the workoutStore won't be restored.

### Additional Problem: Date Serialization

The `WorkoutSessionModel` uses `types.Date` for `startedAt` and `completedAt` (lines 78-80 in WorkoutStore.ts). When serialized to JSON and deserialized, dates become strings. MST may fail to rehydrate these properly without a custom serialization/deserialization handler.

### Recommended Fix

**Option A (Minimal Fix):** Remove the explicit clearing and let secure storage data merge properly:

```typescript
// In setupRootStore.ts, replace lines 81-86 with:
workoutStore: undefined,  // Let secure storage data take precedence
```

**Option B (Better Fix):** Ensure proper merge with explicit fallback:

```typescript
// In setupRootStore.ts, update the merged object construction:
const merged = {
  ...(persistedState ?? {}),
  // Explicitly merge workoutStore from secure storage
  workoutStore: persistedSecureState?.workoutStore ?? persistedState?.workoutStore ?? {},
  performanceMemoryStore: persistedSecureState?.performanceMemoryStore ?? {},
  authenticationStore: {
    ...(persistedState?.authenticationStore ?? {}),
    accessToken: undefined,
  },
} as RootStoreSnapshotIn
```

---

## Issue #2: WorkoutTabScreen Doesn't Handle Existing Active Session

### Priority: 🟠 HIGH

### Location
- **File:** `/app/screens/WorkoutTabScreen.tsx`
- **Lines:** 25-30

### Root Cause Analysis

When a user has an active session and navigates to `WorkoutTabScreen`, clicking "Start Empty Workout" fails silently because `startNewSession()` throws an error when a session already exists:

```typescript
// WorkoutStore.ts, line 141
if (self.currentSession) throw new Error("Session already active")
```

The `WorkoutTabScreen` does not:
1. Check if there's an existing active session
2. Provide a way to resume an active session
3. Provide clear feedback when session creation fails

### Evidence

```typescript
// WorkoutTabScreen.tsx, line 25-26
function handleStartEmptyWorkout() {
  if (workoutStore.startNewSession()) navigation.navigate("ActiveWorkout")
  // Silent failure if session already exists - user sees nothing
}
```

### Recommended Fix

Add active session awareness to the screen:

```typescript
// In WorkoutTabScreen.tsx
// Add after line 23:
const hasActiveSession = !!workoutStore.currentSession

// Modify the render (replace lines 44 or add conditional):
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

---

## Issue #3: ExerciseLibraryScreen Navigation After Session Loss

### Priority: 🟡 MEDIUM

### Location
- **File:** `/app/screens/ExerciseLibraryScreen.tsx`
- **Lines:** 46-49

### Root Cause Analysis

The `handleAddExercise` function navigates back after adding an exercise, but if the session was lost (due to Issue #1), the error message is shown correctly. However, the "Back" action (line 58) just calls `navigation.goBack()` which may leave the user in an inconsistent navigation state.

### Evidence

```typescript
// Line 57-58: Error handling when no session
{!session ? (
  <ErrorMessage message="No active workout session." actionLabel="Back" onActionPress={navigation.goBack} />
```

If the user navigated: `WorkoutTab → ActiveWorkout → ExerciseLibrary` and the session is lost, pressing "Back" goes to `ActiveWorkout` which also shows an error and offers to go to `WorkoutTab`.

### Navigation Flow Issue

The navigation doesn't use `popToTop()` when there's no session, creating a confusing multi-step back experience.

### Recommended Fix

```typescript
// Replace line 58 with:
<ErrorMessage 
  message="No active workout session." 
  actionLabel="Start New" 
  onActionPress={() => navigation.popToTop()} 
/>
```

---

## Issue #4: Race Condition in Session Initialization

### Priority: 🟡 MEDIUM

### Location
- **File:** `/app/models/setupRootStore.ts`
- **Lines:** 95-123

### Root Cause Analysis

The `useInitialRootStore` hook uses an async setup function with a cleanup pattern. If the component remounts quickly (e.g., during hot reload or rapid navigation), there's a potential race condition where:

1. First mount starts `setupRootStore()`
2. Component unmounts (sets `canceled = true`)
3. Second mount starts a new `setupRootStore()`
4. First setup completes and is discarded
5. Second setup may have stale data if storage wasn't fully written

### Evidence

```typescript
// Lines 99-114
;(async () => {
  const { rootStore, dispose } = await setupRootStore()

  if (canceled) {
    dispose()
    return  // Discard the setup, but storage state may be inconsistent
  }
  // ...
})()
```

### Recommended Fix

This is a rare edge case but could be addressed with a singleton pattern:

```typescript
// Add at module level:
let setupPromise: Promise<{ rootStore: RootStore; dispose: IDisposer }> | null = null

export async function setupRootStore(): Promise<{ rootStore: RootStore; dispose: IDisposer }> {
  if (!setupPromise) {
    setupPromise = _setupRootStoreImpl()
  }
  return setupPromise
}
```

---

## Issue #5: Missing Abort Session Action

### Priority: 🟢 LOW

### Location
- **File:** `/app/models/WorkoutStore.ts`

### Root Cause Analysis

There's no action to abort/cancel an active session without completing it. If a session becomes corrupted or the user wants to discard it, they have no way to do so.

### Evidence

The `WorkoutStoreModel` has:
- `startNewSession()` - Creates session
- `completeSession()` - Finishes and archives session
- ❌ No `cancelSession()` or `discardSession()`

### Recommended Fix

Add a discard action:

```typescript
// In WorkoutStore.ts, add to the actions:
discardSession(): boolean {
  try {
    if (!self.currentSession) throw new Error("No active session")
    self.currentSession = undefined
    self.lastError = undefined
    return true
  } catch (e) {
    setError(e)
    return false
  }
},
```

---

## Summary Table

| Issue | Priority | Location | Root Cause |
|-------|----------|----------|------------|
| #1 Session not persisting | 🔴 CRITICAL | setupRootStore.ts:81-86 | Explicit clearing of workoutStore in persistence |
| #2 No resume session UI | 🟠 HIGH | WorkoutTabScreen.tsx:25-30 | Missing active session check |
| #3 Poor navigation on session loss | 🟡 MEDIUM | ExerciseLibraryScreen.tsx:57-58 | Uses goBack instead of popToTop |
| #4 Potential race condition | 🟡 MEDIUM | setupRootStore.ts:95-123 | Async setup without singleton |
| #5 No abort session action | 🟢 LOW | WorkoutStore.ts | Missing discardSession action |

---

## Verification Steps

1. **For Issue #1:** Apply the fix, start a session, close app, reopen - session should persist
2. **For Issue #2:** Start a session, navigate to WorkoutTab, verify "Resume" button appears
3. **For Issue #3:** With no session, go to ExerciseLibrary, press Back, verify lands on WorkoutTab
4. **For Issue #4:** Monitor app behavior during rapid hot reloads
5. **For Issue #5:** Add discardSession action and verify it properly clears state

---

## Design Principle Observations

### KISS Violation in Persistence Layer
The split between plain/secure storage adds complexity. Consider:
- Using only secure storage for all persisted state, OR
- Simplifying the merge logic to be more explicit

### DRY Violation in Error Handling
Multiple screens have similar error display patterns. Consider a shared hook:
```typescript
function useSessionGuard(navigation: Navigation) {
  const { workoutStore } = useStores()
  const session = workoutStore.currentSession
  
  if (!session) {
    return { session: null, error: "No active workout session.", handleBack: () => navigation.popToTop() }
  }
  return { session, error: null, handleBack: null }
}
```

---

## Next Steps

1. **Immediate:** Fix Issue #1 (Critical persistence bug)
2. **Short-term:** Fix Issue #2 (Improve UX for active sessions)
3. **Medium-term:** Address Issues #3, #4, #5
4. **Long-term:** Consider design principle improvements
