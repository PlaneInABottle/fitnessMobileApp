# Lightweight Integration Tests - Phase 4.1 Implementation Plan

## Executive Summary

**Objective:** Design and implement lightweight integration tests that validate cross-store interactions and critical user workflows without heavy UI rendering overhead.

**Current State:**
- 215 unit tests, ~11-33 seconds execution time
- Strong coverage of individual stores (WorkoutStore, ExerciseStore, PerformanceMemoryStore, SetStore)
- Component tests validate UI behavior in isolation
- **Gap:** No tests validating multi-store coordination and state synchronization

**Target:** Add 30-40 integration tests with <20 seconds execution time (total: <50 seconds)

**Success Metrics:**
- Complete workflow coverage for 4 critical user flows
- <20 seconds additional execution time
- Zero flakiness (deterministic tests)
- Catches real integration bugs between stores

## Design Principles Validation

**YAGNI Compliance:**
- ✅ Tests only current workflows (no speculative features)
- ✅ Focuses on proven integration pain points
- ✅ No framework over-engineering

**KISS Compliance:**
- ✅ Uses existing MST RootStore pattern (no new test infrastructure)
- ✅ Mocks only external dependencies (AsyncStorage/MMKV)
- ✅ Direct store method calls (no UI layer complexity)

**DRY Compliance:**
- ✅ Shared test fixtures for common workout scenarios
- ✅ Reusable helper functions for workflow steps
- ✅ Consistent test structure across all integration suites

**Existing Systems Leverage:**
- ✅ Uses RootStoreModel.create() pattern from unit tests
- ✅ Leverages jest.useFakeTimers() for deterministic time control
- ✅ Follows established test/setup.ts conventions

## Requirements Analysis

### Functional Requirements

**Critical Workflows to Test:**
1. **Workout Creation Flow** - Start → Add exercises → Complete sets → Save → Verify history/memory
2. **Template Management Flow** - Create template → Start from template → Update → Delete
3. **Performance Memory Flow** - Complete workout → Record PRs → Retrieve placeholders → Use in next session
4. **Exercise Management Flow** - Add custom exercise → Use in workout → Search/filter → Delete

### Non-Functional Requirements
- **Performance:** Individual test suites <5 seconds each
- **Determinism:** 100% reproducible results (fake timers, stable IDs)
- **Maintainability:** Clear test names, minimal mocking, easy to extend
- **Isolation:** Each test starts with clean RootStore state

### Technical Constraints
- No full React component tree rendering
- No actual AsyncStorage/MMKV I/O
- No navigation stack testing
- Fake timers for time-dependent logic

## Integration Testing Approach

### Testing Philosophy

**What We Test:**
- Store-to-store method calls and state propagation
- Data flow across WorkoutStore → PerformanceMemoryStore
- Template updates triggering cascading state changes
- Exercise validation across ExerciseStore ↔ WorkoutStore ↔ SetStore
- Error propagation across store boundaries

**What We Don't Test:**
- UI rendering (covered by component tests)
- Navigation flows (mock or skip)
- Actual persistence layer (mock storage)
- Visual layout and styling

### Integration Test Structure

```typescript
// Test file structure
describe("Integration: [Workflow Name]", () => {
  let root: RootStore

  beforeEach(() => {
    jest.useFakeTimers()
    root = RootStoreModel.create({})
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe("[Workflow Phase]", () => {
    it("[specific integration scenario]", () => {
      // Arrange: Set up initial state
      // Act: Execute workflow steps across stores
      // Assert: Verify cross-store state consistency
    })
  })
})
```

## Implementation Phases

### Phase 1: Test Infrastructure Setup (1 hour)

**Objective:** Create shared test utilities and fixtures

**Deliverables:**
- `test/integration/helpers.ts` - Shared fixture builders and assertions
- `test/integration/fixtures.ts` - Common workout/template/exercise data
- Integration test folder structure

**Test Helpers:**
```typescript
// test/integration/helpers.ts
export function createWorkoutWithExercises(
  root: RootStore,
  exerciseIds: string[],
  setsPerExercise: number = 3
): { sessionId: string; workoutExerciseIds: string[] }

export function completeAllSetsInSession(root: RootStore): void

export function assertPerformanceMemoryRecorded(
  root: RootStore,
  exerciseId: string,
  expectedValues: { weight?: string; reps?: string }
): void

export function advanceTimeBy(seconds: number): void
```

**Fixtures:**
```typescript
// test/integration/fixtures.ts
export const FIXTURE_EXERCISES = {
  BENCH_PRESS: "bench-press",
  SQUAT: "squat",
  DEADLIFT: "deadlift",
}

export const STANDARD_WORKOUT_DATA = {
  benchPress: { weight: 135, reps: 8 },
  squat: { weight: 185, reps: 10 },
}
```

**Success Criteria:**
- Helpers reduce test boilerplate by 50%
- Fixtures provide consistent test data
- Setup completes in <30 minutes

**Risks & Mitigation:**
- Risk: Over-engineering helpers → Mitigation: Start minimal, add only when needed
- Risk: Brittle fixtures → Mitigation: Use factory functions, not hardcoded objects

---

### Phase 2: Workout Creation Flow Tests (2 hours)

**Objective:** Validate complete workout lifecycle from creation to memory persistence

**File:** `app/models/__integration__/workout-creation.integration.test.ts`

**Test Cases:**

#### 2.1: Basic Workout Flow
```typescript
describe("Basic workout creation and completion", () => {
  it("creates workout → adds exercises → completes sets → saves to history and memory", () => {
    // 1. Start session
    expect(root.workoutStore.startNewSession()).toBe(true)
    
    // 2. Add exercises
    const benchId = root.workoutStore.addExerciseToSession("bench-press")!
    const squatId = root.workoutStore.addExerciseToSession("squat")!
    
    // 3. Add and complete sets
    root.workoutStore.addSetToWorkoutExercise(benchId, { setType: "working", weight: 135, reps: 8 })
    markAllSetsComplete(root, benchId)
    
    root.workoutStore.addSetToWorkoutExercise(squatId, { setType: "working", weight: 185, reps: 10 })
    markAllSetsComplete(root, squatId)
    
    // 4. Complete workout
    jest.advanceTimersByTime(600000) // 10 minutes
    expect(root.workoutStore.completeSession()).toBe(true)
    
    // 5. Verify cross-store state
    expect(root.workoutStore.currentSession).toBeUndefined()
    expect(root.workoutStore.sessionHistory).toHaveLength(1)
    
    // 6. Verify PerformanceMemoryStore recorded data
    const benchMemory = root.performanceMemoryStore.getPlaceholdersForSet({
      exerciseId: "bench-press",
      category: "STRENGTH",
      setType: "working",
      order: 2,
    })
    expect(benchMemory.weight).toBe("135")
    expect(benchMemory.reps).toBe("8")
    
    // 7. Verify PRs updated
    const benchPR = root.performanceMemoryStore.getPersonalRecord("bench-press")
    expect(benchPR?.maxWeight).toBe(135)
  })
})
```

#### 2.2: Multi-Set Type Workflow
```typescript
it("handles warmup → working → dropset flow with correct memory storage", () => {
  // Test that different set types are recorded separately in memory
  // Validates SetStore → PerformanceMemoryStore integration
})
```

#### 2.3: Incomplete Workout Handling
```typescript
it("discards incomplete workout without polluting history/memory", () => {
  // Start workout, add exercises, DON'T complete sets
  // Call discardSession()
  // Verify no history entry, no memory pollution
})
```

#### 2.4: Partial Set Completion
```typescript
it("records only completed sets in memory, ignores incomplete", () => {
  // Add 5 sets, mark only 3 as done
  // Complete workout
  // Verify only 3 sets recorded in memory
})
```

#### 2.5: Exercise with Invalid Data
```typescript
it("prevents completing workout with invalid set data", () => {
  // Add exercise, leave required fields empty/invalid
  // Attempt to complete workout
  // Verify error handling across WorkoutStore ↔ SetStore
})
```

**Estimated Execution Time:** 3-4 seconds

**Success Criteria:**
- All workflow steps validate cross-store state
- Memory persistence verified after workout completion
- Error cases handled gracefully
- Tests run deterministically with fake timers

**Risks & Mitigation:**
- Risk: Timing-dependent flakiness → Mitigation: jest.useFakeTimers() with explicit time advances
- Risk: State pollution between tests → Mitigation: Fresh RootStore in beforeEach

---

### Phase 3: Template Management Flow Tests (2 hours)

**Objective:** Validate template CRUD operations and workout-template synchronization

**File:** `app/models/__integration__/template-management.integration.test.ts`

**Test Cases:**

#### 3.1: Empty Template Creation (Create Routine Path)
```typescript
it("creates empty template → starts workout → auto-populates with default sets", () => {
  // 1. Create template with exercise IDs only
  const templateId = root.workoutStore.createTemplate("Upper A", ["bench-press", "squat"])!
  
  // 2. Verify template structure
  const template = root.workoutStore.templates.get(templateId)
  expect(template?.exercises).toHaveLength(0)
  expect(template?.exerciseIds).toEqual(["bench-press", "squat"])
  
  // 3. Start workout from template
  expect(root.workoutStore.startSessionFromTemplate(templateId)).toBe(true)
  
  // 4. Verify workout exercises have default sets
  const session = root.workoutStore.currentSession!
  expect(session.exercises).toHaveLength(2)
  
  const bench = session.exercises.find(e => e.exerciseId === "bench-press")
  expect(bench?.sets).toHaveLength(1)
  expect(bench?.sets[0].weight).toBe(0)
  expect(bench?.sets[0].reps).toBe(0)
})
```

#### 3.2: Template from Session (Save as Template Path)
```typescript
it("creates template from active session → preserves sets and structure", () => {
  // Start workout, add exercises with custom sets
  // Call createTemplateFromSession()
  // Verify template has populated exercises array with set data
})
```

#### 3.3: Template Auto-Update on Workout Completion
```typescript
it("completes workout from template → auto-updates template with new values", () => {
  // 1. Create template from session with specific weights
  // 2. Start new session from template
  // 3. Modify weights and complete workout
  // 4. Verify template exercises array updated with new values
  // 5. Verify exerciseIds remain unchanged
  // 6. Verify lastUsedAt timestamp updated
})
```

#### 3.4: Template with Invalid Exercises
```typescript
it("prevents template creation with non-existent exercise IDs", () => {
  // Attempt to create template with invalid exerciseId
  // Verify error from ExerciseStore validation
  // Verify template not created
})
```

#### 3.5: Template Start with Deleted Exercise
```typescript
it("handles template exercise removal gracefully", () => {
  // 1. Create template with exercise
  // 2. Delete exercise from ExerciseStore
  // 3. Attempt to start workout from template
  // 4. Verify error handling across WorkoutStore ↔ ExerciseStore
})
```

#### 3.6: Multiple Template Workflow
```typescript
it("creates multiple templates → starts from different templates → maintains independence", () => {
  // Test template isolation and concurrent template usage
})
```

**Estimated Execution Time:** 4-5 seconds

**Success Criteria:**
- Template creation paths (empty vs from session) both validated
- Auto-update behavior on workout completion verified
- Template-workout state synchronization tested
- Edge cases (invalid exercises, deletions) handled

---

### Phase 4: Performance Memory Flow Tests (2 hours)

**Objective:** Validate memory recording, retrieval, and placeholder generation across workouts

**File:** `app/models/__integration__/performance-memory.integration.test.ts`

**Test Cases:**

#### 4.1: Memory Recording and Retrieval
```typescript
it("completes workout → records memory → retrieves placeholders in next session", () => {
  // Session 1: Complete workout with specific values
  // Session 2: Start new workout
  // Add same exercise
  // Verify placeholders match Session 1 values for each set order
})
```

#### 4.2: Multi-Session Memory Progression
```typescript
it("tracks progressive overload across 3 sessions", () => {
  // Session 1: bench 135x8
  // Verify memory recorded
  // Session 2: bench 140x8 (using placeholder from S1)
  // Verify memory updated
  // Session 3: bench 145x8 (using placeholder from S2)
  // Verify memory progression tracked correctly
})
```

#### 4.3: Set Type Independence
```typescript
it("maintains separate memory for warmup/working/drop sets", () => {
  // Complete workout with warmup (95x10), working (135x8), drop (115x10)
  // Start new workout
  // Verify placeholders differ by set type and order
})
```

#### 4.4: Personal Record Tracking
```typescript
it("updates PRs only when exceeded, persists across sessions", () => {
  // Session 1: bench 135x8 → PR set
  // Session 2: bench 130x10 → PR not updated
  // Session 3: bench 140x8 → PR updated
  // Verify PR state after each session
})
```

#### 4.5: Mixed Exercise Categories
```typescript
it("handles STRENGTH, BODYWEIGHT, TIMED, CARDIO memory correctly", () => {
  // Complete workout with all 4 categories
  // Verify memory stores appropriate fields per category
  // Retrieve placeholders for each category
  // Verify correct fields populated (weight for STRENGTH, time for CARDIO, etc.)
})
```

#### 4.6: Memory with Incomplete Sets
```typescript
it("ignores incomplete sets, only records isDone=true", () => {
  // Add 5 sets, mark 3 as done
  // Complete workout
  // Verify memory only contains 3 entries
  // Verify placeholder order matches completed sets only
})
```

**Estimated Execution Time:** 4-5 seconds

**Success Criteria:**
- Memory recording validated across workout completion
- Placeholder retrieval tested in subsequent sessions
- PR tracking logic verified with edge cases
- Set type and exercise category handling tested

---

### Phase 5: Exercise Management Flow Tests (1.5 hours)

**Objective:** Validate exercise CRUD operations and cross-store validation

**File:** `app/models/__integration__/exercise-management.integration.test.ts`

**Test Cases:**

#### 5.1: Custom Exercise Lifecycle
```typescript
it("adds custom exercise → uses in workout → validates set fields", () => {
  // 1. Add custom STRENGTH exercise
  const exerciseId = root.exerciseStore.addExercise({
    name: "Bulgarian Split Squat",
    category: "STRENGTH",
    muscleGroups: ["Quads", "Glutes"],
  })!
  
  // 2. Start workout and add custom exercise
  root.workoutStore.startNewSession()
  const weId = root.workoutStore.addExerciseToSession(exerciseId)!
  
  // 3. Verify default set has required fields for STRENGTH
  const exercise = root.workoutStore.currentSession?.exercises.find(e => e.id === weId)
  expect(exercise?.sets[0].weight).toBeDefined()
  expect(exercise?.sets[0].reps).toBeDefined()
  
  // 4. Complete workout and verify memory records custom exercise
  markAllSetsComplete(root, weId)
  root.workoutStore.completeSession()
  
  const memory = root.performanceMemoryStore.getPersonalRecord(exerciseId)
  expect(memory).toBeDefined()
})
```

#### 5.2: Exercise Category Validation
```typescript
it("enforces required fields based on exercise category", () => {
  // Add CARDIO exercise
  // Attempt to add set with weight/reps (invalid for CARDIO)
  // Verify SetStore validation prevents invalid data
  // Verify WorkoutStore respects validation
})
```

#### 5.3: Exercise Deletion with Active References
```typescript
it("handles exercise deletion while in active workout", () => {
  // Start workout with exercise
  // Delete exercise from ExerciseStore
  // Attempt to add sets (should fail)
  // Verify graceful error handling
})
```

#### 5.4: Exercise Search and Filtering
```typescript
it("searches exercises by name and filters by muscle group", () => {
  // Add multiple custom exercises
  // Test searchExercises() integration
  // Test filterByMuscleGroup() integration
  // Verify results consistent across stores
})
```

**Estimated Execution Time:** 3-4 seconds

**Success Criteria:**
- Custom exercise creation and usage validated
- Category-based field validation tested
- Exercise deletion edge cases handled
- Search/filter integration verified

---

### Phase 6: Error Handling and Edge Cases (1.5 hours)

**Objective:** Validate error propagation and recovery across store boundaries

**File:** `app/models/__integration__/error-handling.integration.test.ts`

**Test Cases:**

#### 6.1: Concurrent Session Prevention
```typescript
it("prevents starting new session while one is active", () => {
  expect(root.workoutStore.startNewSession()).toBe(true)
  expect(root.workoutStore.startNewSession()).toBe(false)
  expect(root.workoutStore.lastError).toContain("already active")
})
```

#### 6.2: Invalid Exercise ID Cascade
```typescript
it("handles invalid exerciseId across all store operations", () => {
  // Attempt to add invalid exercise to workout
  // Attempt to create template with invalid exercise
  // Attempt to retrieve memory for invalid exercise
  // Verify all stores handle error gracefully
})
```

#### 6.3: Set Validation Error Propagation
```typescript
it("propagates set validation errors from SetStore to WorkoutStore", () => {
  // Add exercise
  // Attempt to add set with invalid data (negative weight, etc.)
  // Verify error originates in SetStore
  // Verify WorkoutStore prevents operation
})
```

#### 6.4: State Recovery After Error
```typescript
it("maintains consistent state after failed operations", () => {
  // Start workout
  // Attempt invalid operation (should fail)
  // Verify workout state unchanged
  // Continue with valid operations
  // Verify workflow completes successfully
})
```

#### 6.5: Memory Retrieval with Missing Data
```typescript
it("returns placeholder '-' when no memory exists", () => {
  // Request placeholders for exercise never performed
  // Verify all placeholders return "-"
  // Verify no errors thrown
})
```

**Estimated Execution Time:** 2-3 seconds

**Success Criteria:**
- Error propagation tested across store boundaries
- State consistency maintained after errors
- Graceful degradation for missing data

---

## Test Suite Organization

```
app/models/__integration__/
├── helpers.ts                              # Shared utilities
├── fixtures.ts                             # Test data
├── workout-creation.integration.test.ts    # 5 tests, ~4s
├── template-management.integration.test.ts # 6 tests, ~5s
├── performance-memory.integration.test.ts  # 6 tests, ~5s
├── exercise-management.integration.test.ts # 4 tests, ~4s
└── error-handling.integration.test.ts      # 5 tests, ~3s

Total: 26 integration tests, ~21 seconds
```

## Mocking Strategy

### What We Mock
```typescript
// test/setup.ts already mocks:
- react-native-mmkv (no real storage I/O)
- @gorhom/bottom-sheet (no UI rendering)
- react-native-keyboard-controller
- expo-localization

// Additional mocks for integration tests:
// NONE - we use real store logic
```

### What We Don't Mock
- RootStoreModel (real MST store)
- All store actions and views (real business logic)
- Date objects (controlled via jest.useFakeTimers)
- ID generation (real generateId() for predictable IDs)

### Time Control
```typescript
beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date("2025-01-01T00:00:00Z"))
})

// In tests:
jest.advanceTimersByTime(600000) // Advance 10 minutes
```

## Execution Time Budget

| Test Suite | Test Count | Target Time | Buffer |
|------------|-----------|-------------|--------|
| Workout Creation | 5 | 3-4s | 4.5s |
| Template Management | 6 | 4-5s | 5.5s |
| Performance Memory | 6 | 4-5s | 5.5s |
| Exercise Management | 4 | 3-4s | 4.5s |
| Error Handling | 5 | 2-3s | 3.5s |
| **Total** | **26** | **16-21s** | **23.5s** |

**Current Suite:** 215 tests, ~33 seconds
**Target Total:** 241 tests, <50 seconds ✅

## Coverage Analysis

### What's Tested

**Store Interactions:**
- ✅ WorkoutStore → PerformanceMemoryStore (memory recording)
- ✅ WorkoutStore → ExerciseStore (validation)
- ✅ WorkoutStore → SetStore (set data validation)
- ✅ Template ↔ Workout bidirectional sync
- ✅ Exercise CRUD → Workout reference handling

**Critical Workflows:**
- ✅ Complete workout lifecycle (start → populate → complete → persist)
- ✅ Template creation and usage (both empty and from session)
- ✅ Memory recording and placeholder retrieval
- ✅ Progressive overload tracking across sessions
- ✅ Custom exercise management

**Edge Cases:**
- ✅ Error propagation across stores
- ✅ Invalid data handling
- ✅ State consistency after failures
- ✅ Missing data graceful degradation

### What's Not Tested (By Design)

**Out of Scope:**
- ❌ UI rendering and layout (component tests handle this)
- ❌ Navigation flows (not critical for business logic)
- ❌ Actual AsyncStorage/MMKV persistence (mocked)
- ❌ Network requests (no API in current scope)
- ❌ Animation timing and gestures

**Rationale:** These are either covered by existing component tests or not critical for integration testing goals.

## Success Criteria

### Functional Success
- [ ] All 4 critical workflows have end-to-end integration tests
- [ ] Store-to-store interactions validated for all major operations
- [ ] Error cases tested with proper propagation verification
- [ ] Edge cases (deletions, invalid data) covered

### Performance Success
- [ ] Integration test suite completes in <25 seconds
- [ ] Total test suite (unit + integration) completes in <50 seconds
- [ ] No performance regression in existing tests

### Quality Success
- [ ] Zero flaky tests (100% deterministic with fake timers)
- [ ] All tests follow consistent structure and naming
- [ ] Test code reuses helpers (minimal duplication)
- [ ] Clear failure messages for debugging

### Maintainability Success
- [ ] New developers can understand test scenarios
- [ ] Adding new integration tests requires <30 minutes
- [ ] Test helpers reduce boilerplate by 50%+
- [ ] Documentation explains testing strategy

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Tests exceed time budget | Medium | Medium | Profile slow tests, optimize fixtures, parallelize where possible |
| Flaky timing-dependent tests | Low | High | Strict use of jest.useFakeTimers(), explicit time advances |
| State pollution between tests | Low | High | Fresh RootStore in beforeEach, verify isolation |
| Brittle tests on refactoring | Medium | Medium | Test behaviors not implementation, avoid over-mocking |
| Helper function complexity | Low | Low | Keep helpers simple, document clearly |

## Rollback Plan

**Trigger Conditions:**
- Integration tests consistently exceed 30 second budget
- Flakiness rate >5%
- Test maintenance overhead >2 hours/week

**Rollback Procedure:**
1. Disable integration test suites via `skip`
2. Review and fix root cause (timing, state pollution, etc.)
3. Re-enable tests one suite at a time
4. Monitor execution time and flakiness

**Prevention:**
- Set hard time limits in CI (fail if >25 seconds)
- Track flakiness metrics per test
- Regular test suite health reviews

## Validation Checklist

**Before marking Phase 4.1 complete:**
- [ ] All 26 integration tests written and passing
- [ ] Test execution time <25 seconds (with buffer <30s)
- [ ] Zero flaky tests (run 10 times, all pass)
- [ ] Test helpers reduce boilerplate by 50%+
- [ ] Code coverage increases for store interactions
- [ ] Documentation updated with testing strategy
- [ ] PR review by team confirms test quality

## Next Steps (Post-Phase 4.1)

**Phase 4.2: UI Integration Tests (if needed)**
- Test screen-level workflows with minimal rendering
- Focus on screen-to-store interactions
- Target: 10-15 tests, <10 seconds

**Phase 4.3: E2E Tests (Maestro)**
- Critical user journeys in actual app
- Smoke tests for major features
- Target: 5-10 flows, <5 minutes

**Continuous Improvement:**
- Monitor test suite health weekly
- Add integration tests for new features
- Refactor slow tests as needed
- Maintain <50 second total execution time

## Monitoring & Success Metrics

**Test Suite Health Dashboard:**
```
Integration Test Metrics (tracked in CI):
├── Execution Time: Target <25s, Alert >30s
├── Flakiness Rate: Target 0%, Alert >2%
├── Coverage Delta: Target +5% store interaction coverage
├── Failure Rate: Target 0% false positives
└── Maintenance Time: Target <30min per new test
```

**Key Performance Indicators:**
- **Integration Test Count:** 26 tests
- **Total Test Count:** 241 tests (215 existing + 26 new)
- **Total Execution Time:** <50 seconds (33s + <20s)
- **Coverage Increase:** +5-10% for store interaction paths
- **Bug Detection Rate:** Track integration bugs caught pre-production

---

**Line Count:** 618 lines ✅ (within 1000 line limit)

## Implementation Timeline

**Total Effort:** 10-12 hours

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Infrastructure Setup | 1 hour | None |
| Phase 2: Workout Creation Tests | 2 hours | Phase 1 |
| Phase 3: Template Management Tests | 2 hours | Phase 1 |
| Phase 4: Performance Memory Tests | 2 hours | Phase 1 |
| Phase 5: Exercise Management Tests | 1.5 hours | Phase 1 |
| Phase 6: Error Handling Tests | 1.5 hours | Phase 1 |
| Code Review & Refinement | 1 hour | All phases |

**Recommended Approach:** Sequential implementation (Phase 1 → 2 → 3 → 4 → 5 → 6) to build on learnings.

---

**Plan Status:** READY FOR IMPLEMENTATION
**Approved By:** @planner (Senior Software Architect)
**Date:** 2025-01-01
