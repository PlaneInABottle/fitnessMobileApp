# Bug Audit Methodology for Workout and Exercise Flows

## Executive Summary
- **Objective:** Identify remaining bugs in workout/exercise flows after session persistence fixes
- **Approach:** Systematic review of state management, UI flows, navigation, and edge cases
- **Scope:** 72 tests passing; focus on untested paths and integration points
- **Deliverable:** Prioritized bug list with severity classifications

---

## Issue Severity Classification

| Severity | Definition | Response Time |
|----------|------------|---------------|
| **Critical** | Data loss, crashes, security vulnerabilities | Immediate fix |
| **High** | Feature broken, poor UX blocking workflow | Fix before release |
| **Medium** | Degraded experience, workaround exists | Schedule for next sprint |
| **Low** | Minor cosmetic, edge case, polish | Backlog |

---

## Audit Categories

### 1. State Management Bugs

#### 1.1 MobX Store Integrity
**Files:** `WorkoutStore.ts`, `ExerciseStore.ts`, `SetStore.ts`, `PerformanceMemoryStore.ts`

**Check for:**
- [ ] Missing `cast()` calls on array/object mutations
- [ ] Uncaught exceptions in actions leaking to UI
- [ ] Stale references after session discard/complete
- [ ] Cross-store dependency validation (exerciseStore ↔ workoutStore)
- [ ] Map/array modification during iteration

**Specific Areas:**
| File | Line Range | Check |
|------|------------|-------|
| WorkoutStore.ts | 163-178 | `addExerciseToSessionUnsafe` - race condition on rapid adds |
| WorkoutStore.ts | 216-250 | `completeSessionUnsafe` - snapshot integrity |
| PerformanceMemoryStore.ts | 208-244 | `recordCompletedWorkout` - null exercise handling |
| ExerciseStore.ts | 156-165 | ID collision loop - infinite loop risk |

#### 1.2 Persistence & Rehydration
**Files:** `secure.ts`, `RootStoreSetup.ts` (if exists)

**Check for:**
- [ ] Date serialization/deserialization roundtrip
- [ ] Corrupt JSON handling
- [ ] Schema version migration edge cases
- [ ] Storage quota exceeded scenarios
- [ ] Encryption key loss recovery

**Specific Areas:**
| File | Line Range | Check |
|------|------------|-------|
| secure.ts | 5-14 | `dateReviver` regex - timezone edge cases |
| secure.ts | 52-64 | Encryption fallback - silent data loss |
| PerformanceMemoryStore.ts | 249-374 | Migration v1→v2 completeness |

---

### 2. Workout Flow Bugs

#### 2.1 Session Lifecycle
**Files:** `WorkoutTabScreen.tsx`, `ActiveWorkoutScreen.tsx`, `WorkoutCompleteScreen.tsx`

**Test Scenarios:**
- [ ] Start workout → immediately discard
- [ ] Start workout → add exercise → complete with 0 sets
- [ ] Resume workout after app kill
- [ ] Multiple rapid "Start Workout" taps
- [ ] Template with deleted exercises

**Specific Areas:**
| File | Line Range | Check |
|------|------------|-------|
| WorkoutTabScreen.tsx | 27-28 | `startNewSession` - no double-navigation guard |
| WorkoutTabScreen.tsx | 31-32 | `startSessionFromTemplate` - invalid template handling |
| ActiveWorkoutScreen.tsx | 55-78 | `handleDoneAddSet` - error recovery incomplete |
| WorkoutCompleteScreen.tsx | 64-70 | `handleConfirmSaveTemplate` - partial failure handling |

#### 2.2 Exercise Management
**Files:** `ExerciseLibraryScreen.tsx`, `ExerciseCard.tsx`

**Test Scenarios:**
- [ ] Add same exercise twice to workout
- [ ] Search with special characters (regex injection)
- [ ] Filter + search combination
- [ ] Exercise with missing optional fields

**Specific Areas:**
| File | Line Range | Check |
|------|------------|-------|
| ExerciseLibraryScreen.tsx | 46-49 | `handleAddExercise` - success but no navigation |
| ExerciseStore.ts | 124-132 | `searchExercises` - XSS in name field |

#### 2.3 Set Entry
**Files:** `SetRow.tsx`, `ActiveWorkoutScreen.tsx`

**Test Scenarios:**
- [ ] Enter non-numeric characters in weight/reps
- [ ] Enter negative numbers
- [ ] Enter extremely large numbers (999999)
- [ ] Rapid set type cycling
- [ ] Add set with placeholder values (no user input)

**Specific Areas:**
| File | Line Range | Check |
|------|------------|-------|
| SetRow.tsx | 52-57 | `toNumberOrUndefined` - handles "-", "." correctly? |
| SetStore.ts | 26-32 | `FIELD_RANGES` - boundary validation (0 valid?) |
| WorkoutStore.ts | 138-147 | `buildSetSnapshot` - strips invalid values correctly? |

---

### 3. Navigation Bugs

#### 3.1 Screen Transitions
**Files:** `AppNavigator.tsx`, all screen files

**Test Scenarios:**
- [ ] Deep link to ActiveWorkout with no session
- [ ] Back button on ExerciseLibrary with added exercise
- [ ] Hardware back on WorkoutComplete
- [ ] Tab switch during active workout
- [ ] Navigate away and return during set editing

**Specific Areas:**
| File | Line Range | Check |
|------|------------|-------|
| SessionOverlay.tsx | 26-35 | `handleContinue` - nested navigator targeting |
| WorkoutCompleteScreen.tsx | 28-29 | Gesture disabled but can swipe on iOS? |
| ActiveWorkoutScreen.tsx | 94 | `popToTop` navigation - stack state unclear |

#### 3.2 Session Overlay
**Files:** `SessionOverlay.tsx`, `SessionOverlayBar.tsx`, `SessionDiscardModal.tsx`

**Test Scenarios:**
- [ ] Overlay visibility on different tabs (when tabs added)
- [ ] Discard during network operation
- [ ] Continue while already on ActiveWorkout
- [ ] Modal dismiss by tapping outside

---

### 4. Performance Bugs

#### 4.1 Re-render Optimization
**Files:** All screen/component files with `observer`

**Check for:**
- [ ] Missing `useMemo` on derived data
- [ ] Inline object/function creation in render
- [ ] Observer on non-reactive components
- [ ] Large list without virtualization

**Specific Areas:**
| File | Line Range | Check |
|------|------------|-------|
| ActiveWorkoutScreen.tsx | 112-176 | `session.exercises.map` - no keyExtractor issues |
| SetRow.tsx | 74-79 | `useMemo` for setTypeName - dependency array |
| ExerciseLibraryScreen.tsx | 29-35 | `exercises` memo - sorts on every query change |

#### 4.2 Memory & Timers
**Files:** `useSessionTimer.ts`, `SessionOverlay.tsx`

**Check for:**
- [ ] Interval cleanup on unmount
- [ ] Memory leak on rapid mount/unmount
- [ ] Timer drift over long sessions

**Specific Areas:**
| File | Line Range | Check |
|------|------------|-------|
| useSessionTimer.ts | 27-33 | Interval cleanup - handles `startedAt` change? |
| useSessionTimer.ts | 4-14 | `formatDuration` - negative ms handling |

---

### 5. Security Concerns

#### 5.1 Data Handling
**Files:** `secure.ts`, all store files

**Check for:**
- [ ] Encryption key stored in secure location (Keychain/Keystore)
- [ ] Sensitive data in logs/console
- [ ] Input sanitization (XSS, injection)
- [ ] PII exposure in error messages

**Specific Areas:**
| File | Line Range | Check |
|------|------------|-------|
| secure.ts | 38-46 | Encryption key in plain MMKV - **HIGH RISK** |
| ExerciseStore.ts | 28-33 | `sanitizeImageUrl` - allows javascript: URLs? |
| WorkoutStore.ts | 149-151 | `setError` - could expose stack traces |

#### 5.2 Authentication
**Files:** `AuthenticationStore.ts` (if used)

**Check for:**
- [ ] Token storage security
- [ ] Session timeout handling
- [ ] Logout clears all sensitive data

---

### 6. Error Handling Bugs

#### 6.1 User Feedback
**Files:** `ErrorMessage.tsx`, all screen files

**Test Scenarios:**
- [ ] Network error during operation
- [ ] Invalid exercise ID in navigation params
- [ ] Corrupted persisted state on load
- [ ] Out of memory during large workout

**Specific Areas:**
| File | Line Range | Check |
|------|------------|-------|
| WorkoutStore.ts | 283-379 | All try/catch - error messages user-friendly? |
| ExerciseLibraryScreen.tsx | 61-65 | No session error - auto-recovery or manual only? |

#### 6.2 Edge Cases
**Check for:**
- [ ] Empty arrays in all list renders
- [ ] Null/undefined defensive checks
- [ ] Boundary conditions (0 exercises, 0 sets, max limits)
- [ ] Date edge cases (midnight, DST, timezone)

---

## Testing Approach

### Unit Test Coverage Gaps
**Current:** 72 tests passing

**Identify missing tests:**
```
Files to verify coverage:
- [ ] WorkoutStore.test.ts - template operations, session history
- [ ] ExerciseStore.test.ts - search edge cases, image URL validation
- [ ] PerformanceMemoryStore.test.ts - migration paths, PR updates
- [ ] SetStore.test.ts - boundary values, all categories
```

### Manual Test Matrix

| Flow | Happy Path | Error Path | Edge Case |
|------|------------|------------|-----------|
| Start empty workout | ✓ | Session exists | Double tap |
| Start from template | ✓ | Invalid template | Deleted exercises |
| Add exercise | ✓ | No session | Duplicate exercise |
| Add set | ✓ | Invalid data | Max values |
| Complete workout | ✓ | No exercises | 0 sets |
| Save template | ✓ | Empty name | Duplicate name |
| Discard workout | ✓ | - | During add set |
| Resume workout | ✓ | Stale session | After restart |

### Integration Test Priorities

1. **Session persistence roundtrip** - Start → kill app → resume
2. **Complete workout flow** - Start → exercises → sets → complete → template
3. **Memory pattern recall** - Complete workout → start new → verify placeholders
4. **Navigation state** - Various entry points maintain correct stack

---

## Audit Execution Checklist

### Phase 1: Static Analysis
- [ ] Run TypeScript strict mode (`tsc --noEmit`)
- [ ] Run ESLint with all rules enabled
- [ ] Review all `any` type usages
- [ ] Check for TODO/FIXME comments

### Phase 2: Store Review
- [ ] Trace all store actions for error paths
- [ ] Verify all views are memoized appropriately
- [ ] Check snapshot types match model types
- [ ] Validate all cross-store references

### Phase 3: UI/UX Review
- [ ] Test all screens on small/large devices
- [ ] Verify accessibility labels
- [ ] Check keyboard handling on inputs
- [ ] Test with system font scaling

### Phase 4: Integration Testing
- [ ] Run full test suite
- [ ] Manual walkthrough of all flows
- [ ] Test persistence across app restarts
- [ ] Test navigation edge cases

---

## Known Issues Template

When bugs are found, document using this format:

```markdown
### BUG-XXX: [Short Description]
- **Severity:** Critical/High/Medium/Low
- **Category:** State/Navigation/Performance/Security/UX
- **File:** path/to/file.ts:line
- **Steps to Reproduce:**
  1. Step one
  2. Step two
- **Expected:** What should happen
- **Actual:** What happens
- **Root Cause:** Analysis
- **Fix:** Proposed solution
```

---

## Success Criteria

Audit complete when:
- [ ] All checklist items reviewed
- [ ] All Critical/High issues documented
- [ ] Test coverage gaps identified
- [ ] Remediation plan created for High+ issues
- [ ] Performance baseline established

---

## Dependencies & Prerequisites

- Access to physical iOS/Android devices
- React Native debugger setup
- MobX devtools configured
- Test database with sample data
- Ability to clear app storage
