# Set Undo System Implementation Plan

## Executive Summary

- **Objective:** Enable users to quickly undo the last added set during an active workout, reducing friction when mistakes are made
- **Approach:** Track the last added set per exercise and show an inline "Undo" button that appears briefly after adding a set (Option C - simplest approach)
- **Timeline:** 2-3 hours implementation
- **Success Metrics:** Users can undo last set within timeout window, no data loss, minimal UI changes

---

## Requirements Analysis

### Functional Requirements
1. **Last Set Tracking:** Track the most recently added set per workout exercise
2. **Undo Button Display:** Show "Undo" button inline after adding a set
3. **Auto-Hide:** Undo button disappears after timeout (5 seconds) or when another action occurs
4. **Undo Action:** Remove the last added set using existing `deleteSetFromWorkoutExercise`

### Non-Functional Requirements
1. **Performance:** No additional re-renders beyond necessary state changes
2. **Simplicity:** Minimal new components, leverages existing store actions
3. **Consistency:** Follows existing UI patterns in ActiveWorkoutScreen

### Business Rules
- Only the most recent set can be undone (not a full history)
- Undo expires after 5 seconds or when user adds another set
- Undo uses existing delete functionality (DRY principle)

### Acceptance Criteria
- [ ] After adding a set, "Undo" button appears below the completed sets
- [ ] Pressing "Undo" removes the last added set
- [ ] "Undo" button auto-hides after 5 seconds
- [ ] "Undo" button hides when another set is added or editing starts
- [ ] No undo button appears for sets added via other means (e.g., historical sets)

---

## Technical Design

### Approach Decision: Option C (Inline Undo Button)

**Why Option C (Inline Undo Button):**
- **KISS:** No new UI patterns (toast/snackbar), uses existing Button component
- **YAGNI:** No need for undo history or complex state management
- **DRY:** Reuses existing `deleteSetFromWorkoutExercise` action
- **Existing Systems:** Fits within current ActiveWorkoutScreen layout

**Rejected Options:**
- **Option A (Toast/Snackbar):** Too complex, requires new UI component system
- **Option B (Tap on set):** Conflicts with long-press for SetOptionsBottomSheet

### State Tracking Strategy

Track undo state in ActiveWorkoutScreen local state (not in store):

```typescript
// State shape
const [undoableSet, setUndoableSet] = useState<{
  workoutExerciseId: string
  setId: string
  timestamp: number
} | null>(null)
```

**Rationale:**
- Undo is a transient UI feature, not persistent data
- Local state keeps WorkoutStore simple and focused
- Auto-expiry handled via useEffect timer

### Component Changes

**Files to Modify:**
- `/app/screens/ActiveWorkoutScreen.tsx` - Add undo state and UI

**No New Files Needed** - follows KISS principle

### Data Flow

```
User taps "Done" on SetRow
    ↓
handleDoneAddSet() called
    ↓
workoutStore.addSetToWorkoutExercise() succeeds
    ↓
Get newly added set ID (last set in exercise.sets)
    ↓
setUndoableSet({ workoutExerciseId, setId, timestamp: Date.now() })
    ↓
Start 5-second timer to clear undoableSet
    ↓
Undo button renders below sets for that exercise
    ↓
[If Undo pressed] → workoutStore.deleteSetFromWorkoutExercise() → clear undoableSet
[If timer expires] → clear undoableSet
[If user starts new set] → clear undoableSet
```

---

## Implementation Phases

### Phase 1: Add Undo State Management

**Objective:** Add local state for tracking undoable sets

**File to Modify:** `/app/screens/ActiveWorkoutScreen.tsx`

**Implementation Details:**

Add state after existing state declarations (around line 38):
```typescript
// Add after selectedSetInfo state
const [undoableSet, setUndoableSet] = useState<{
  workoutExerciseId: string
  setId: string
  timestamp: number
} | null>(null)
```

Add useEffect for auto-expiry:
```typescript
// Add auto-expiry effect for undo
useEffect(() => {
  if (!undoableSet) return

  const elapsed = Date.now() - undoableSet.timestamp
  const remaining = Math.max(0, 5000 - elapsed)

  const timeout = setTimeout(() => {
    setUndoableSet(null)
  }, remaining)

  return () => clearTimeout(timeout)
}, [undoableSet])
```

**Dependencies:** None
**Risks:** Low - standard React state pattern
**Success Criteria:** State updates correctly, timer clears state after 5 seconds

---

### Phase 2: Track Set on Add

**Objective:** Capture the newly added set for undo

**File to Modify:** `/app/screens/ActiveWorkoutScreen.tsx`

**Implementation Details:**

Modify `handleDoneAddSet` function (around line 61-84):
```typescript
function handleDoneAddSet(workoutExerciseId: string) {
  const exerciseId = session?.exercises.find((e) => e.id === workoutExerciseId)?.exerciseId
  if (!exerciseId) {
    setInlineError("Invalid workout exercise")
    return
  }

  const validation = setStore.validateSetData(exerciseId, draftSetData)
  if (!validation.ok) {
    setInlineError(validation.error)
    return
  }

  const ok = workoutStore.addSetToWorkoutExercise(workoutExerciseId, draftSetData)
  if (!ok) {
    setInlineError(workoutStore.lastError ?? "Could not add set")
    return
  }

  // Get the newly added set ID (last set in the array)
  const workoutExercise = session?.exercises.find((e) => e.id === workoutExerciseId)
  const newSetId = workoutExercise?.sets[workoutExercise.sets.length - 1]?.id

  if (newSetId) {
    setUndoableSet({
      workoutExerciseId,
      setId: newSetId,
      timestamp: Date.now(),
    })
  }

  setEditingWorkoutExerciseId(null)
  setDraftSetData({ setType: "working" })
  setDraftTouched({})
  setInlineError(undefined)
}
```

**Dependencies:** Phase 1
**Risks:** Low - simple addition to existing function
**Success Criteria:** undoableSet is populated after successful set addition

---

### Phase 3: Clear Undo on Other Actions

**Objective:** Clear undo state when user performs other actions

**File to Modify:** `/app/screens/ActiveWorkoutScreen.tsx`

**Implementation Details:**

Modify `handleStartAddSet` to clear undo:
```typescript
function handleStartAddSet(workoutExerciseId: string, setType?: SetData["setType"]) {
  setUndoableSet(null) // Clear any pending undo
  setEditingWorkoutExerciseId(workoutExerciseId)
  setDraftSetData({ setType: (setType as any) ?? "working" })
  setDraftTouched({})
  setInlineError(undefined)
  workoutStore.clearError()
}
```

Modify `handleDeleteSet` to clear undo if deleting the undoable set:
```typescript
function handleDeleteSet() {
  if (!selectedSetInfo) return
  workoutStore.deleteSetFromWorkoutExercise(
    selectedSetInfo.workoutExerciseId,
    selectedSetInfo.setId,
  )
  // Clear undo if this was the undoable set
  if (
    undoableSet &&
    undoableSet.workoutExerciseId === selectedSetInfo.workoutExerciseId &&
    undoableSet.setId === selectedSetInfo.setId
  ) {
    setUndoableSet(null)
  }
  setSelectedSetInfo(null)
}
```

**Dependencies:** Phase 1
**Risks:** Low - simple state clearing
**Success Criteria:** Undo state clears when starting new set or deleting

---

### Phase 4: Add Undo Handler

**Objective:** Implement the undo action

**File to Modify:** `/app/screens/ActiveWorkoutScreen.tsx`

**Implementation Details:**

Add handler function after handleChangeSetType:
```typescript
function handleUndoLastSet() {
  if (!undoableSet) return
  workoutStore.deleteSetFromWorkoutExercise(
    undoableSet.workoutExerciseId,
    undoableSet.setId,
  )
  setUndoableSet(null)
}
```

**Dependencies:** Phase 1
**Risks:** Low - reuses existing delete action (DRY)
**Success Criteria:** Pressing undo removes the correct set

---

### Phase 5: Render Undo Button

**Objective:** Display the undo button in the UI

**File to Modify:** `/app/screens/ActiveWorkoutScreen.tsx`

**Implementation Details:**

Add the undo button inside the exercise map, after the completed sets but before the edit row/Add Set button (around line 181):

```tsx
{/* Completed sets */}
{we.sets.map((s, idx) => (
  <SetRow
    key={s.id}
    category={exercise.category}
    mode="completed"
    availableSetTypes={availableSetTypes}
    index={idx}
    onLongPress={() => handleSetLongPress(we.id, idx, s.id, s.setType)}
    value={{
      setType: s.setType,
      weight: s.weight,
      reps: s.reps,
      time: s.time,
      distance: s.distance,
    }}
  />
))}

{/* Undo button - shows briefly after adding a set */}
{undoableSet?.workoutExerciseId === we.id && (
  <Button
    text="Undo Last Set"
    preset="default"
    onPress={handleUndoLastSet}
    style={themed($undoButton)}
  />
)}

{/* Edit row or Add Set button */}
{editingWorkoutExerciseId === we.id ? (
  // ... existing edit UI
```

Add style at bottom of file:
```typescript
const $undoButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral200,
  borderColor: colors.palette.accent300,
  borderWidth: 1,
  paddingVertical: spacing.xs,
})
```

**Dependencies:** Phases 1-4
**Risks:** Low - uses existing Button component
**Success Criteria:** Undo button appears after adding set, in correct position

---

## Testing Strategy

### Unit Testing

**handleUndoLastSet function:**
- Should call deleteSetFromWorkoutExercise with correct IDs
- Should clear undoableSet state
- Should do nothing if undoableSet is null

**Auto-expiry effect:**
- Should clear undoableSet after 5 seconds
- Should cleanup timeout on unmount
- Should reset timer if undoableSet changes

### Integration Testing

```typescript
describe("ActiveWorkoutScreen - Undo", () => {
  it("shows Undo button after adding a set", () => {})
  it("hides Undo button after 5 seconds", () => {})
  it("removes set when Undo is pressed", () => {})
  it("hides Undo button when starting to add another set", () => {})
  it("hides Undo button when set is deleted via bottom sheet", () => {})
  it("only shows Undo for the exercise that had set added", () => {})
})
```

### Manual Testing Steps

1. Start a workout with an exercise
2. Add a set → Verify "Undo Last Set" button appears
3. Wait 5 seconds → Verify button disappears
4. Add another set → Verify new Undo button appears
5. Press "Undo Last Set" → Verify set is removed and button disappears
6. Add a set, then tap "Add Set" to start another → Verify Undo disappears
7. Add sets to multiple exercises → Verify Undo only shows for correct exercise

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Timer race condition with React state | Low | Low | Use useEffect cleanup pattern |
| Set ID mismatch on undo | Low | Medium | Verify set exists before delete |
| UI flicker on button show/hide | Low | Low | Use standard React rendering |

---

## Success Criteria & Validation

### Functional Validation
- [ ] Undo button appears immediately after adding a set
- [ ] Undo button removes the correct set
- [ ] Undo button auto-hides after 5 seconds
- [ ] Undo button hides when starting new set entry
- [ ] Undo button only appears for the affected exercise
- [ ] No undo button for existing historical sets

### Design Validation
- [ ] Uses existing Button component
- [ ] Follows existing styling patterns
- [ ] No new dependencies added
- [ ] Minimal code changes

---

## Rollback Plan

- **Trigger Conditions:** Bugs in undo logic causing data loss or UI issues
- **Rollback Procedure:**
  1. Revert changes to ActiveWorkoutScreen.tsx
  2. No store changes to revert (using existing delete action)
- **Data Recovery:** No data migration needed - purely UI feature
- **Communication Plan:** N/A - internal feature

---

## Dependencies & Prerequisites

### Technical Dependencies
- Existing `deleteSetFromWorkoutExercise` action in WorkoutStore ✓
- Existing Button component ✓
- React useState and useEffect hooks ✓

### Team Dependencies
- None

### External Dependencies
- None

### Timeline Dependencies
- Phases must be completed in order (1 → 2 → 3 → 4 → 5)
- All phases are in single file, can be implemented together

---

## Design Principles Validation

### YAGNI ✅
- [x] Only single-set undo, no history
- [x] No persistent undo state
- [x] No speculative features

### KISS ✅
- [x] Simple local state approach
- [x] Standard React patterns
- [x] Single file modification
- [x] No new components

### DRY ✅
- [x] Reuses existing deleteSetFromWorkoutExercise
- [x] Reuses existing Button component
- [x] Reuses existing ThemedStyle patterns

### Existing Systems ✅
- [x] Uses existing WorkoutStore actions
- [x] Follows existing screen patterns
- [x] Uses existing theme system

---

## Implementation Summary

| Phase | Description | Estimated Time |
|-------|-------------|----------------|
| 1 | Add undo state and auto-expiry | 15 min |
| 2 | Track set on add | 15 min |
| 3 | Clear undo on other actions | 10 min |
| 4 | Add undo handler | 5 min |
| 5 | Render undo button | 15 min |
| Testing | Manual + unit tests | 1 hour |

**Total Estimated Time:** 2-3 hours

---

## Line Count: ~300 lines
