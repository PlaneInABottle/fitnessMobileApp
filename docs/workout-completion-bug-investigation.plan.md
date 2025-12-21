# Workout Completion Bug Investigation Plan

## Executive Summary

**Problem:** Wrong values are displayed in the workout summary screen when completing a workout. The summary shows incorrect totals for sets and volume.

**Root Causes Identified:**
1. **UI-only "done" state tracking**: ActiveWorkoutScreen tracks "done" status in local React state (`doneSetIds`), not in the data model
2. **Data model has all sets**: WorkoutCompleteScreen calculates summary from ALL sets in the session, regardless of which were marked "done"
3. **Placeholder-to-value conversion on "done"**: Recent changes convert placeholder values to actual values when marking sets done, but this logic is in UI state, not persisted
4. **Template update timing**: Templates update with workout structure (exercises/sets) on completion instead of only when structure changes

**Solution Approach:** 
- Add `isDone` boolean field to ExerciseSetModel
- Track completion status in data model, not UI state
- Update summary calculations to only count completed sets
- Separate template structure updates from template value updates

**Timeline:** 2-3 days implementation + testing

## Investigation Findings

### 1. Data Flow Analysis

#### Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ ActiveWorkoutScreen (User marks sets "done")                    │
│                                                                   │
│  State:                                                           │
│    - doneSetIds: Record<string, boolean>  (UI-only state)       │
│    - doneSetVolumes: Record<string, number> (UI-only state)     │
│                                                                   │
│  Data Model:                                                      │
│    - workoutStore.currentSession                                 │
│      ├── exercises[]                                              │
│      │   ├── exerciseId: string                                  │
│      │   ├── notes: string                                       │
│      │   └── sets: ExerciseSet[]                                 │
│      │       ├── id: string                                      │
│      │       ├── setType: SetTypeId                              │
│      │       ├── weight?: number                                 │
│      │       ├── reps?: number                                   │
│      │       ├── time?: number                                   │
│      │       ├── distance?: number                               │
│      │       └── restTime?: number                               │
│      │       ❌ NO isDone field!                                 │
│      └── startedAt: Date                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ User clicks "Bitir" (Finish)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ WorkoutCompleteScreen (Shows summary)                           │
│                                                                   │
│  Calculates from workoutStore.currentSession:                   │
│    - totalSets: session.exercises.reduce((sum, we) =>           │
│                   sum + we.sets.length, 0)  ⚠️ ALL sets!        │
│    - totalVolume: sum of (weight * reps) for ALL sets           │
│    - exerciseCount: session.exercises.length                    │
│    - durationMinutes: calculated from startedAt                 │
│                                                                   │
│  ❌ Problem: No access to which sets were marked "done"         │
│  ❌ Problem: Counts ALL sets in session, not just completed     │
└─────────────────────────────────────────────────────────────────┘
```

#### Bug #1: Summary Shows Wrong Values

**Location:** `WorkoutCompleteScreen.tsx` lines 39-61

```typescript
const { durationMinutes, exerciseCount, totalSets, totalVolume } = (() => {
  if (!session) return { durationMinutes: 0, exerciseCount: 0, totalSets: 0, totalVolume: 0 }

  const ms = Date.now() - session.startedAt.getTime()
  const minutes = Math.max(0, Math.round(ms / 60000))

  // Calculate total volume
  let volume = 0
  for (const exercise of session.exercises) {
    for (const set of exercise.sets) {
      const weight = set.weight ?? 0
      const reps = set.reps ?? 0
      volume += weight * reps  // ⚠️ Includes ALL sets, even not done
    }
  }

  return {
    durationMinutes: minutes,
    exerciseCount: session.exercises.length,
    totalSets: session.exercises.reduce((sum, we) => sum + we.sets.length, 0), // ⚠️ ALL sets
    totalVolume: volume,
  }
})()
```

**Root Cause:**
1. ActiveWorkoutScreen tracks "done" status in local React state (`doneSetIds: Record<string, boolean>`)
2. This UI state is NOT persisted to the data model (ExerciseSetModel has no `isDone` field)
3. When navigating to WorkoutCompleteScreen, the UI state is lost
4. WorkoutCompleteScreen has NO WAY to know which sets were marked "done"
5. Summary calculation includes ALL sets in the session, not just completed ones

**Example Scenario:**
```
User creates workout with 3 exercises:
  - Exercise A: 3 sets (marks 2 as done)
  - Exercise B: 4 sets (marks 3 as done)
  - Exercise C: 2 sets (marks 1 as done)

Expected summary:
  - Total sets: 6 (2 + 3 + 1 completed)
  - Total volume: sum of (weight × reps) for 6 completed sets

Actual summary:
  - Total sets: 9 (ALL sets: 3 + 4 + 2)
  - Total volume: sum of (weight × reps) for ALL 9 sets
```

#### Bug #2: Template Updates on Completion Instead of Structure Changes

**Location:** `WorkoutCompleteScreen.tsx` lines 89-131

```typescript
function handleDontSave() {
  workoutStore.clearError()

  const templateId = session?.templateId
  const summary = templateId ? workoutStore.getTemplateUpdateSummary(templateId) : undefined
  const hasChanges =
    !!summary &&
    (summary.addedExerciseIds.length > 0 ||
     summary.removedExerciseIds.length > 0 ||
     summary.addedSets > 0 ||
     summary.removedSets > 0)

  if (templateId && hasChanges) {
    Alert.alert(
      "Şablonu güncelle?",
      `Egzersiz: +${summary!.addedExerciseIds.length} / -${summary!.removedExerciseIds.length}\nSet: +${summary!.addedSets} / -${summary!.removedSets}`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Atla",
          style: "default",
          onPress: () => {
            const ok = workoutStore.completeSession()
            if (ok) navigation.popToTop()
          },
        },
        {
          text: "Güncelle",
          style: "default",
          onPress: () => {
            workoutStore.updateTemplateFromCurrentSession(templateId) // ⚠️ Updates template
            const ok = workoutStore.completeSession()
            if (ok) navigation.popToTop()
          },
        },
      ],
    )
    return
  }

  const ok = workoutStore.completeSession()
  if (ok) navigation.popToTop()
}
```

**Root Cause:**
1. Template update logic runs on workout completion
2. `updateTemplateFromCurrentSession` copies ALL session data to template (lines 663-679 in WorkoutStore.ts)
3. This includes set VALUES (weight, reps, time, distance) not just structure
4. Template should only update structure (which exercises, how many sets) when structure changes
5. Set values should come from PerformanceMemoryStore placeholders, not template

**Location:** `WorkoutStore.ts` lines 663-679

```typescript
updateTemplateFromCurrentSession(templateId: string): boolean {
  try {
    const session = requireCurrentSession()
    const template = self.templates.get(templateId)
    if (!template) throw new Error("Invalid templateId")

    template.exerciseIds = cast(session.exercises.map((we) => we.exerciseId))
    template.exercises = cast(buildTemplateExercisesFromSession(session)) // ⚠️ Copies values
    template.lastUsedAt = new Date()

    self.lastError = undefined
    return true
  } catch (e) {
    setError(e)
    return false
  }
}
```

**Location:** `WorkoutStore.ts` lines 223-237

```typescript
function buildTemplateExercisesFromSession(
  session: WorkoutSession,
): TemplateExerciseSnapshotIn[] {
  return session.exercises.map((we) => ({
    exerciseId: we.exerciseId,
    sets: (we.sets ?? []).map((s) => ({
      setType: s.setType as SetTypeId,
      weight: toFiniteNumber(s.weight),        // ⚠️ Copies weight value
      reps: toFiniteNumber(s.reps),            // ⚠️ Copies reps value
      time: toFiniteNumber(s.time),            // ⚠️ Copies time value
      distance: toFiniteNumber(s.distance),    // ⚠️ Copies distance value
      restTime: toFiniteNumber(s.restTime),    // ⚠️ Copies restTime value
    })),
  }))
}
```

**Expected Behavior:**
- Templates should store structure only: which exercises, how many sets of each type
- Set values should NOT be stored in templates
- Values should come from PerformanceMemoryStore (last completed workout data)
- Template updates should only happen when structure changes (add/remove exercises or sets)

**Actual Behavior:**
- Templates store both structure AND values
- Every time you complete a workout, if you choose "Update template", it overwrites template values
- This defeats the purpose of PerformanceMemoryStore placeholders

### 2. Data Model Structure

#### ExerciseSetModel (Current)

```typescript
export const ExerciseSetModel = types.model("ExerciseSet", {
  id: types.identifier,
  setType: types.enumeration("SetType", [...SET_TYPE_IDS]),
  weight: types.maybe(types.number),
  reps: types.maybe(types.number),
  time: types.maybe(types.number),
  distance: types.maybe(types.number),
  restTime: types.maybe(types.number),
  // ❌ Missing: isDone field
})
```

#### Required Change

```typescript
export const ExerciseSetModel = types.model("ExerciseSet", {
  id: types.identifier,
  setType: types.enumeration("SetType", [...SET_TYPE_IDS]),
  weight: types.maybe(types.number),
  reps: types.maybe(types.number),
  time: types.maybe(types.number),
  distance: types.maybe(types.number),
  restTime: types.maybe(types.number),
  isDone: types.optional(types.boolean, false), // ✅ Add completion tracking
})
```

### 3. Performance Memory and History Persistence

#### Current Flow (Correct)

```typescript
// WorkoutStore.ts - completeSessionUnsafe() lines 384-427

function completeSessionUnsafe() {
  const root = getAttachedRoot()
  const session = requireCurrentSession()

  const now = new Date()
  session.completedAt = now

  const snapshot = getSnapshot(session)

  // ✅ Correctly persists ALL sets to PerformanceMemoryStore
  root.performanceMemoryStore.recordCompletedWorkout({
    completedAt: now,
    exercises: (snapshot.exercises ?? [])
      .map((we) => {
        const category = root.exerciseStore.getExerciseCategory(we.exerciseId)
        if (!category) return undefined

        return {
          exerciseId: we.exerciseId,
          category,
          sets: (we.sets ?? []).map((s) => ({  // ⚠️ All sets, not just done
            setType: s.setType,
            weight: s.weight,
            reps: s.reps,
            time: s.time,
            distance: s.distance,
            restTime: s.restTime,
          })),
        }
      })
      .filter((x): x is NonNullable<typeof x> => !!x),
  })

  // Notes are for the active session UX only; don't persist them into history.
  const snapshotForHistory = {
    ...snapshot,
    exercises: (snapshot.exercises ?? []).map((we: any) => {
      const { notes: _notes, ...rest } = we
      return rest
    }),
  }

  self.currentSession = undefined
  self.sessionHistory.push(cast(snapshotForHistory)) // ✅ Persists all sets to history
}
```

**Issue:** Performance memory and history should only record COMPLETED sets, not all sets.

### 4. Template Placeholder Logic

#### Current Implementation (ActiveWorkoutScreen.tsx lines 188-243)

```typescript
const templateExercise = template?.exercises.find((x) => x.exerciseId === we.exerciseId)

// ...

{we.sets.map((s, i) => {
  const setType = (s.setType as SetTypeId | undefined) ?? "working"
  const isWorking = setType === "working"
  const displayIndex = isWorking ? ++workingIndex : undefined

  const orderWithinType =
    (templateTypeCounters[setType] = (templateTypeCounters[setType] ?? 0) + 1)
  const templateSet = templateExercise
    ? templateExercise.sets.filter((ts) => (ts.setType as SetTypeId) === setType)[
        orderWithinType - 1
      ]
    : undefined

  return (
    <SetRow
      key={s.id}
      category={exercise.category}
      mode="edit"
      availableSetTypes={availableSetTypes}
      allowEmptyNumbers={false}
      index={displayIndex}
      rowIndex={i}
      isDone={!!doneSetIds[s.id]}
      placeholders={
        templateSet
          ? {
              weight:
                templateSet.weight !== undefined
                  ? String(templateSet.weight)
                  : undefined,
              reps: templateSet.reps !== undefined ? String(templateSet.reps) : undefined,
              time: templateSet.time !== undefined ? String(templateSet.time) : undefined,
              distance:
                templateSet.distance !== undefined
                  ? String(templateSet.distance)
                  : undefined,
            }
          : undefined
      }
      onPressSetType={() => handleOpenSetOptions(we.id, s.id, setType)}
      onChange={(next) => handleUpdateSet(we.id, s.id, next)}
      onDone={() => handleToggleDone(we.id, s.id)}
      doneButtonLabel="Toggle done"
      value={{
        setType: s.setType,
        weight: s.weight,
        reps: s.reps,
        time: s.time,
        distance: s.distance,
      }}
    />
  )
})}
```

**Problem:** Placeholders come from template values, which shouldn't exist. They should come from PerformanceMemoryStore.

## Technical Design

### Phase 1: Add `isDone` Field to Data Model

**File:** `app/models/WorkoutStore.ts`

**Changes:**

1. Add `isDone` to ExerciseSetModel:

```typescript
export const ExerciseSetModel = types.model("ExerciseSet", {
  id: types.identifier,
  setType: types.enumeration("SetType", [...SET_TYPE_IDS]),
  weight: types.maybe(types.number),
  reps: types.maybe(types.number),
  time: types.maybe(types.number),
  distance: types.maybe(types.number),
  restTime: types.maybe(types.number),
  isDone: types.optional(types.boolean, false), // NEW
})
```

2. Update SetData type in `app/models/SetStore.ts`:

```typescript
export type SetData = {
  setType: SetTypeId | string
  weight?: number
  reps?: number
  time?: number
  distance?: number
  restTime?: number
  isDone?: boolean // NEW
}
```

3. Update buildSetSnapshot to handle isDone:

```typescript
function buildSetSnapshot(setData: Partial<SetData>): Omit<ExerciseSetSnapshotIn, "id"> {
  return {
    setType: setData.setType as SetTypeId,
    weight: toFiniteNumber(setData.weight),
    reps: toFiniteNumber(setData.reps),
    time: toFiniteNumber(setData.time),
    distance: toFiniteNumber(setData.distance),
    restTime: toFiniteNumber(setData.restTime),
    isDone: setData.isDone ?? false, // NEW
  }
}
```

### Phase 2: Update ActiveWorkoutScreen to Use Data Model

**File:** `app/screens/ActiveWorkoutScreen.tsx`

**Changes:**

1. Remove UI-only state:

```typescript
// REMOVE:
const [doneSetIds, setDoneSetIds] = useState<Record<string, boolean>>({})
const [doneSetVolumes, setDoneSetVolumes] = useState<Record<string, number>>({})
```

2. Update completedSetsCount calculation:

```typescript
const completedSetsCount = useMemo(() => {
  if (!session) return 0
  return session.exercises.reduce((count, exercise) => {
    return count + exercise.sets.filter(set => set.isDone).length
  }, 0)
}, [session?.exercises])
```

3. Update completedVolumeKg calculation:

```typescript
const completedVolumeKg = useMemo(() => {
  if (!session) return 0
  return session.exercises.reduce((volume, exercise) => {
    return volume + exercise.sets.reduce((setVolume, set) => {
      if (!set.isDone) return setVolume
      const weight = set.weight ?? 0
      const reps = set.reps ?? 0
      return setVolume + (weight * reps)
    }, 0)
  }, 0)
}, [session?.exercises])
```

4. Update handleToggleDone to update data model:

```typescript
function handleToggleDone(workoutExerciseId: string, setId: string) {
  const exercise = session?.exercises.find((e) => e.id === workoutExerciseId)
  const set = exercise?.sets.find((s) => s.id === setId)
  if (!set) return

  workoutStore.updateSetInWorkoutExercise(workoutExerciseId, setId, {
    isDone: !set.isDone
  })
}
```

5. Update SetRow isDone prop:

```typescript
<SetRow
  // ...
  isDone={s.isDone} // Change from !!doneSetIds[s.id]
  // ...
/>
```

### Phase 3: Update WorkoutCompleteScreen Calculations

**File:** `app/screens/WorkoutCompleteScreen.tsx`

**Changes:**

Update summary calculation to only count completed sets:

```typescript
const { durationMinutes, exerciseCount, totalSets, totalVolume } = (() => {
  if (!session) return { durationMinutes: 0, exerciseCount: 0, totalSets: 0, totalVolume: 0 }

  const ms = Date.now() - session.startedAt.getTime()
  const minutes = Math.max(0, Math.round(ms / 60000))

  let completedSets = 0
  let volume = 0
  
  for (const exercise of session.exercises) {
    for (const set of exercise.sets) {
      if (!set.isDone) continue // ONLY count done sets
      
      completedSets++
      const weight = set.weight ?? 0
      const reps = set.reps ?? 0
      volume += weight * reps
    }
  }

  return {
    durationMinutes: minutes,
    exerciseCount: session.exercises.length,
    totalSets: completedSets, // Only completed sets
    totalVolume: volume, // Only completed sets volume
  }
})()
```

### Phase 4: Update Performance Memory to Only Record Completed Sets

**File:** `app/models/WorkoutStore.ts`

**Changes:**

Update completeSessionUnsafe to filter completed sets:

```typescript
function completeSessionUnsafe() {
  const root = getAttachedRoot()
  const session = requireCurrentSession()

  const now = new Date()
  session.completedAt = now

  const snapshot = getSnapshot(session)

  root.performanceMemoryStore.recordCompletedWorkout({
    completedAt: now,
    exercises: (snapshot.exercises ?? [])
      .map((we) => {
        const category = root.exerciseStore.getExerciseCategory(we.exerciseId)
        if (!category) return undefined

        // FILTER to only completed sets
        const completedSets = (we.sets ?? [])
          .filter((s) => s.isDone) // NEW
          .map((s) => ({
            setType: s.setType,
            weight: s.weight,
            reps: s.reps,
            time: s.time,
            distance: s.distance,
            restTime: s.restTime,
          }))

        // Skip exercises with no completed sets
        if (completedSets.length === 0) return undefined

        return {
          exerciseId: we.exerciseId,
          category,
          sets: completedSets,
        }
      })
      .filter((x): x is NonNullable<typeof x> => !!x),
  })

  // Session history: keep all sets but include isDone status
  const snapshotForHistory = {
    ...snapshot,
    exercises: (snapshot.exercises ?? []).map((we: any) => {
      const { notes: _notes, ...rest } = we
      return rest
    }),
  }

  self.currentSession = undefined
  self.sessionHistory.push(cast(snapshotForHistory))
}
```

### Phase 5: Fix Template Update Logic

**File:** `app/models/WorkoutStore.ts`

**Changes:**

1. Remove values from template sets (keep only structure):

```typescript
function buildTemplateExercisesFromSession(
  session: WorkoutSession,
): TemplateExerciseSnapshotIn[] {
  return session.exercises.map((we) => ({
    exerciseId: we.exerciseId,
    sets: (we.sets ?? []).map((s) => ({
      setType: s.setType as SetTypeId,
      // REMOVE all values - template should only store structure
      // weight, reps, time, distance, restTime should come from PerformanceMemoryStore
    })),
  }))
}
```

2. Update TemplateSetModel to remove value fields:

```typescript
export const TemplateSetModel = types.model("TemplateSet", {
  setType: types.enumeration("TemplateSetType", [...SET_TYPE_IDS]),
  // REMOVE: weight, reps, time, distance, restTime
  // Templates should only store setType
})
```

3. Update template comparison logic to only compare structure:

```typescript
getTemplateUpdateSummary(templateId: string): {
  addedExerciseIds: string[]
  removedExerciseIds: string[]
  addedSets: number
  removedSets: number
} | undefined {
  // Keep existing logic - it already only compares structure
  // No changes needed here
}
```

### Phase 6: Update Placeholder Logic to Use PerformanceMemoryStore

**File:** `app/screens/ActiveWorkoutScreen.tsx`

**Changes:**

Replace template placeholder logic with PerformanceMemoryStore:

```typescript
const { performanceMemoryStore } = useStores()

// ...

{we.sets.map((s, i) => {
  const setType = (s.setType as SetTypeId | undefined) ?? "working"
  const isWorking = setType === "working"
  const displayIndex = isWorking ? ++workingIndex : undefined

  const orderWithinType =
    (templateTypeCounters[setType] = (templateTypeCounters[setType] ?? 0) + 1)
  
  // Get placeholders from PerformanceMemoryStore, not template
  const placeholders = performanceMemoryStore.getPlaceholdersForSet({
    exerciseId: we.exerciseId,
    category: exercise.category,
    setType: setType,
    order: orderWithinType,
  })

  return (
    <SetRow
      key={s.id}
      category={exercise.category}
      mode="edit"
      availableSetTypes={availableSetTypes}
      allowEmptyNumbers={false}
      index={displayIndex}
      rowIndex={i}
      isDone={s.isDone} // From data model now
      placeholders={{
        weight: placeholders.weight,
        reps: placeholders.reps,
        time: placeholders.time,
        distance: placeholders.distance,
      }}
      onPressSetType={() => handleOpenSetOptions(we.id, s.id, setType)}
      onChange={(next) => handleUpdateSet(we.id, s.id, next)}
      onDone={() => handleToggleDone(we.id, s.id)}
      doneButtonLabel="Toggle done"
      value={{
        setType: s.setType,
        weight: s.weight,
        reps: s.reps,
        time: s.time,
        distance: s.distance,
      }}
    />
  )
})}
```

## Implementation Phases

### Phase 1: Data Model Changes
**Duration:** 4 hours
**Risk:** Low (additive changes with defaults)

**Tasks:**
1. Add `isDone` field to ExerciseSetModel with default `false`
2. Add `isDone` to SetData type
3. Update buildSetSnapshot function
4. Update SetStore validation to allow isDone field
5. Run existing tests to ensure backward compatibility

**Success Criteria:**
- All existing tests pass
- New field persists correctly
- Migration from old data format works (default isDone = false)

### Phase 2: ActiveWorkoutScreen Updates
**Duration:** 6 hours
**Risk:** Medium (changes user interaction logic)

**Tasks:**
1. Remove UI-only done state (doneSetIds, doneSetVolumes)
2. Update completedSetsCount calculation
3. Update completedVolumeKg calculation
4. Update handleToggleDone to use data model
5. Update handleDeleteSet to work without UI state
6. Update SetRow isDone prop binding
7. Update tests

**Success Criteria:**
- Sets marked "done" persist across screen navigation
- Done status visible in UI immediately
- Volume and count calculations correct
- Tests pass

### Phase 3: WorkoutCompleteScreen Updates
**Duration:** 2 hours
**Risk:** Low (pure calculation changes)

**Tasks:**
1. Update summary calculation to filter by isDone
2. Update volume calculation to filter by isDone
3. Update tests

**Success Criteria:**
- Summary shows only completed sets
- Volume includes only completed sets
- Tests pass

### Phase 4: Performance Memory Updates
**Duration:** 3 hours
**Risk:** Low (filtering logic)

**Tasks:**
1. Update completeSessionUnsafe to filter completed sets
2. Ensure exercises with no completed sets are skipped
3. Update tests

**Success Criteria:**
- Only completed sets recorded in performance memory
- Placeholders based on actual completed data
- Tests pass

### Phase 5: Template System Refactor
**Duration:** 8 hours
**Risk:** High (major architectural change)

**Tasks:**
1. Remove value fields from TemplateSetModel
2. Update buildTemplateExercisesFromSession
3. Update template creation logic
4. Update template loading logic in ActiveWorkoutScreen
5. Replace template placeholders with PerformanceMemoryStore
6. Update all template-related tests
7. Add migration logic for existing templates

**Success Criteria:**
- Templates store only structure (setType, not values)
- Placeholders come from PerformanceMemoryStore
- Template updates only on structure changes
- All tests pass
- Existing templates migrate correctly

### Phase 6: Testing & Validation
**Duration:** 4 hours
**Risk:** Low

**Tasks:**
1. Add integration tests for complete workflow
2. Test edge cases (no sets done, all sets done, partial)
3. Test template creation and updating
4. Test placeholder display
5. Manual testing on device

**Success Criteria:**
- All unit tests pass
- All integration tests pass
- Manual testing confirms correct behavior
- No regressions

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking existing workouts | Low | High | isDone defaults to false; backward compatible |
| Data migration issues | Medium | High | Test with existing data snapshots; add migration logic |
| Performance issues with filtering | Low | Low | Filtering is O(n); negligible for workout sizes |
| UI state synchronization | Medium | Medium | Use MobX reactions; thorough testing |
| Template migration complexity | High | High | Phased rollout; keep template values initially, migrate later |

## Testing Strategy

### Unit Tests

1. **ExerciseSetModel**
   - isDone defaults to false
   - isDone persists correctly
   - isDone in snapshots

2. **WorkoutStore**
   - updateSetInWorkoutExercise handles isDone
   - completeSession filters completed sets
   - buildTemplateExercisesFromSession structure

3. **ActiveWorkoutScreen**
   - handleToggleDone updates model
   - completedSetsCount calculation
   - completedVolumeKg calculation

4. **WorkoutCompleteScreen**
   - Summary calculations with mixed done/not done sets
   - Edge cases (no sets done, all sets done)

### Integration Tests

1. **Full Workout Flow**
   - Create workout
   - Add exercises and sets
   - Mark some sets done
   - Navigate to complete screen
   - Verify summary correctness

2. **Template Flow**
   - Create template
   - Use template
   - Modify structure
   - Update template
   - Verify only structure updated

3. **Performance Memory Flow**
   - Complete workout with mixed done status
   - Start new workout
   - Verify placeholders from only completed sets

## Success Criteria & Validation

### Functional Validation

- [ ] Summary shows correct count of completed sets only
- [ ] Summary shows correct volume for completed sets only
- [ ] Done status persists when navigating between screens
- [ ] Done status persists when app is restarted
- [ ] Templates store only structure, not values
- [ ] Placeholders come from PerformanceMemoryStore
- [ ] Template updates only when structure changes

### Performance Validation

- [ ] No performance degradation in ActiveWorkoutScreen
- [ ] No performance degradation in WorkoutCompleteScreen
- [ ] Filtering completed sets is O(n) and fast

### Data Integrity Validation

- [ ] Existing workouts load correctly (isDone defaults to false)
- [ ] Completed workouts in history display correctly
- [ ] Performance memory only includes completed sets
- [ ] Templates migrate correctly

## Affected Files

### Core Models
- `app/models/WorkoutStore.ts` - Add isDone field, update persistence logic
- `app/models/SetStore.ts` - Add isDone to SetData type
- `app/models/PerformanceMemoryStore.ts` - No changes (already correct)

### Screens
- `app/screens/ActiveWorkoutScreen.tsx` - Remove UI state, use data model
- `app/screens/WorkoutCompleteScreen.tsx` - Update summary calculations

### Components
- `app/components/workout/SetRow.tsx` - No changes needed (already uses isDone prop)

### Tests
- `app/models/WorkoutStore.test.ts` - Add isDone field tests
- `app/screens/__tests__/activeWorkoutSetInteractions.test.tsx` - Update done tracking tests
- `app/screens/__tests__/WorkoutCompleteScreen.test.tsx` - Add summary tests

## Rollback Plan

### Trigger Conditions
- Data corruption detected
- Performance degradation > 20%
- Critical bugs affecting workout completion

### Rollback Procedure
1. Revert commits in reverse order
2. Clear app cache/data to reset state
3. Restore from backup if needed
4. Communicate issue to users

## Monitoring & Success Metrics

### Key Performance Indicators
- Workout completion success rate: > 99%
- Summary calculation accuracy: 100%
- Template creation success rate: > 99%
- Performance memory accuracy: 100%

### Monitoring Setup
- Error tracking for completion failures
- Analytics for summary accuracy
- Performance monitoring for calculation time

## Line Count: 783
