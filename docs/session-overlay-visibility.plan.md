# Session Overlay Conditional Visibility Implementation Plan

## Executive Summary

- **Objective:** Hide SessionOverlay on workout-related screens (ActiveWorkout, ExerciseLibrary, WorkoutComplete) where it's redundant or distracting
- **Approach:** Leverage existing `getActiveRouteName` utility with `navigationRef` to detect current route and conditionally render overlay
- **Timeline:** ~1-2 hours implementation
- **Success Metrics:** Overlay hidden on specified screens, no flicker during transitions, smooth navigation experience

---

## Requirements Analysis

### Functional Requirements
1. **Hide on Workout Screens:** Overlay must not appear on ActiveWorkout, ExerciseLibrary, WorkoutComplete
2. **Show on Other Screens:** Overlay must appear on WorkoutTab and all future tab screens
3. **Smooth Transitions:** No visual flicker when navigating between show/hide screens
4. **Reactive Updates:** Visibility must update when navigation state changes

### Non-Functional Requirements
1. **Performance:** Avoid unnecessary re-renders when navigation changes
2. **Maintainability:** Easy to add/remove screens from hide list
3. **Testability:** Logic must be unit testable

### Business Rules
- Overlay visibility is determined by current route name
- Screens where user is actively managing workout should not show overlay (redundant)
- Overlay purpose is to allow resumption from non-workout screens

### Acceptance Criteria
- [ ] Overlay hidden on ActiveWorkoutScreen
- [ ] Overlay hidden on ExerciseLibraryScreen
- [ ] Overlay hidden on WorkoutCompleteScreen
- [ ] Overlay visible on WorkoutTabScreen
- [ ] No flicker during screen transitions
- [ ] Navigation performance unaffected

---

## Technical Design

### Route Detection Strategy

**Chosen Approach:** Use existing `getActiveRouteName` + `navigationRef` with event listener

**Why This Approach:**
1. **Existing Pattern:** `getActiveRouteName` already exists in `navigationUtilities.ts` (lines 35-43)
2. **Proven:** Used by `useBackButtonHandler` and navigation persistence
3. **Handles Nesting:** Recursively traverses nested navigators to get deepest route
4. **KISS Compliant:** No new utilities or complex state management needed

**Alternative Approaches Considered:**
- `useNavigationState` hook - Would require prop drilling or context
- `useFocusEffect` per screen - Distributed logic, harder to maintain
- Context provider - Over-engineered for simple visibility toggle

### Component Modifications

**File: `/app/components/session/SessionOverlay.tsx`**

Add navigation state listener to track current route:

```typescript
// Current structure (simplified):
export const SessionOverlay = observer(function SessionOverlay() {
  const session = workoutStore.currentSession
  if (!session) return null
  // ... render overlay
})

// New structure:
export const SessionOverlay = observer(function SessionOverlay() {
  const session = workoutStore.currentSession
  const [currentRoute, setCurrentRoute] = useState<string>("")
  
  // Listen to navigation changes
  useEffect(() => {
    // Initial route
    if (navigationRef.isReady()) {
      setCurrentRoute(getActiveRouteName(navigationRef.getRootState()))
    }
    
    // Subscribe to changes
    const unsubscribe = navigationRef.addListener("state", () => {
      if (navigationRef.isReady()) {
        setCurrentRoute(getActiveRouteName(navigationRef.getRootState()))
      }
    })
    
    return unsubscribe
  }, [])
  
  if (!session) return null
  
  // Hide on workout-related screens
  const HIDDEN_ROUTES = ["ActiveWorkout", "ExerciseLibrary", "WorkoutComplete"]
  if (HIDDEN_ROUTES.includes(currentRoute)) return null
  
  // ... render overlay
})
```

### Navigation State Access Pattern

```
NavigationContainer (ref={navigationRef})
├── Tab.Navigator ("Workout")
│   └── Stack.Navigator
│       ├── "WorkoutTab" ← show overlay
│       ├── "ActiveWorkout" ← hide overlay
│       ├── "ExerciseLibrary" ← hide overlay
│       └── "WorkoutComplete" ← hide overlay
└── (Future tabs) ← show overlay
```

**Key Insight:** `getActiveRouteName` traverses the full state tree to return the deepest route (e.g., "ActiveWorkout"), not the tab name ("Workout"). This is exactly what we need.

---

## Implementation Phases

### Phase 1: Add Navigation Listener to SessionOverlay

**Objective:** Track current route name and conditionally hide overlay

**Files to Modify:**
- `/app/components/session/SessionOverlay.tsx`

**Implementation:**

```typescript
import { useState, useEffect } from "react"
import { View, ViewStyle } from "react-native"
import { useNavigation, CommonActions } from "@react-navigation/native"
import { observer } from "mobx-react-lite"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useSessionTimer } from "@/hooks/useSessionTimer"
import { useStores } from "@/models/RootStoreContext"
import { navigationRef, getActiveRouteName } from "@/navigators/navigationUtilities"

import { SessionDiscardModal } from "./SessionDiscardModal"
import { SessionOverlayBar } from "./SessionOverlayBar"

/** Routes where the overlay should be hidden (user is actively in workout flow) */
const OVERLAY_HIDDEN_ROUTES = ["ActiveWorkout", "ExerciseLibrary", "WorkoutComplete"]

export const SessionOverlay = observer(function SessionOverlay() {
  const { workoutStore } = useStores()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()

  const session = workoutStore.currentSession
  const duration = useSessionTimer(session?.startedAt)
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [currentRoute, setCurrentRoute] = useState<string>("")

  // Track navigation state changes
  useEffect(() => {
    function updateCurrentRoute() {
      if (navigationRef.isReady()) {
        const route = getActiveRouteName(navigationRef.getRootState())
        setCurrentRoute(route)
      }
    }

    // Get initial route
    updateCurrentRoute()

    // Subscribe to navigation state changes
    const unsubscribe = navigationRef.addListener("state", updateCurrentRoute)

    return unsubscribe
  }, [])

  // Early returns
  if (!session) return null
  if (OVERLAY_HIDDEN_ROUTES.includes(currentRoute)) return null

  const exerciseCount = session.exercises.length

  function handleContinue() {
    navigation.dispatch(
      CommonActions.navigate({
        name: "Workout",
        params: {
          screen: "ActiveWorkout",
        },
      }),
    )
  }

  function handleDiscard() {
    setShowDiscardModal(true)
  }

  function handleConfirmDiscard() {
    workoutStore.discardSession()
    setShowDiscardModal(false)
  }

  function handleCancelDiscard() {
    setShowDiscardModal(false)
  }

  const bottomOffset = 49 + insets.bottom

  return (
    <>
      <View style={[$overlay, { bottom: bottomOffset }]}>
        <SessionOverlayBar
          duration={duration}
          exerciseCount={exerciseCount}
          onContinue={handleContinue}
          onDiscard={handleDiscard}
        />
      </View>
      <SessionDiscardModal
        visible={showDiscardModal}
        onConfirm={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
      />
    </>
  )
})

const $overlay: ViewStyle = {
  position: "absolute",
  left: 0,
  right: 0,
  zIndex: 100,
}
```

**Changes Summary:**
1. Import `navigationRef` and `getActiveRouteName` from navigationUtilities
2. Add `currentRoute` state
3. Add `useEffect` with navigation state listener
4. Add `OVERLAY_HIDDEN_ROUTES` constant
5. Add early return when current route is in hidden list

**Dependencies:** None (uses existing utilities)
**Risks:** Low - uses proven pattern from existing codebase
**Success Criteria:** Overlay hides on specified screens

---

## Testing Strategy

### Unit Tests

**File: `/app/components/session/__tests__/SessionOverlay.test.tsx`**

```typescript
describe("SessionOverlay visibility", () => {
  it("hides overlay on ActiveWorkout screen", () => {
    // Mock navigationRef.getRootState to return ActiveWorkout
    // Verify component returns null
  })

  it("hides overlay on ExerciseLibrary screen", () => {
    // Mock navigationRef.getRootState to return ExerciseLibrary
    // Verify component returns null
  })

  it("hides overlay on WorkoutComplete screen", () => {
    // Mock navigationRef.getRootState to return WorkoutComplete
    // Verify component returns null
  })

  it("shows overlay on WorkoutTab screen", () => {
    // Mock navigationRef.getRootState to return WorkoutTab
    // Verify overlay is rendered
  })

  it("shows overlay on other tab screens", () => {
    // Mock navigationRef.getRootState to return future tab name
    // Verify overlay is rendered
  })

  it("updates visibility when navigation state changes", () => {
    // Start on WorkoutTab (overlay visible)
    // Simulate navigation state change to ActiveWorkout
    // Verify overlay becomes hidden
  })
})
```

### Manual Testing Scenarios

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Start workout session on WorkoutTab | Overlay appears |
| 2 | Navigate to ActiveWorkout | Overlay disappears (no flicker) |
| 3 | Navigate to ExerciseLibrary | Overlay stays hidden |
| 4 | Go back to ActiveWorkout | Overlay stays hidden |
| 5 | Go back to WorkoutTab | Overlay reappears |
| 6 | Navigate to WorkoutComplete (finish workout) | Overlay hidden |
| 7 | After workout complete, return to WorkoutTab | Overlay hidden (session cleared) |

### Edge Cases

1. **Deep Link to ActiveWorkout:** Overlay should not flash before hiding
2. **Back Navigation:** Overlay should smoothly reappear on WorkoutTab
3. **Tab Switch (future):** Overlay should show on other tabs
4. **Session Started Mid-Navigation:** Overlay should appear immediately on allowed screens
5. **Navigation Before Ref Ready:** No crash if navigationRef not ready

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Flicker during navigation | Low | Medium | Navigation listener fires before render |
| Performance with frequent updates | Low | Low | Event-based, not polling |
| Race condition on initial load | Low | Low | Check `isReady()` before accessing state |
| New routes not in hidden list | Medium | Low | Document and use clear naming convention |

---

## Success Criteria & Validation

### Functional Validation
- [ ] Overlay hidden on ActiveWorkoutScreen
- [ ] Overlay hidden on ExerciseLibraryScreen  
- [ ] Overlay hidden on WorkoutCompleteScreen
- [ ] Overlay visible on WorkoutTabScreen
- [ ] No visual flicker during transitions
- [ ] Overlay appears/disappears smoothly

### Performance Validation
- [ ] No measurable performance impact on navigation
- [ ] No unnecessary re-renders (check React DevTools)
- [ ] Listener properly cleaned up on unmount

### Code Quality Validation
- [ ] Uses existing `getActiveRouteName` utility
- [ ] Hidden routes list is maintainable (single constant)
- [ ] Follows existing component patterns

---

## Rollback Plan

- **Trigger Conditions:** Unexpected navigation issues or performance problems
- **Rollback Procedure:** Remove the navigation listener and route check (3 deletions)
- **Impact:** Overlay will show on all screens again (original behavior)

---

## Dependencies & Prerequisites

### Technical Dependencies
- `navigationRef` (existing in navigationUtilities.ts)
- `getActiveRouteName` (existing in navigationUtilities.ts)
- React Navigation event system (built-in)

### No New Dependencies Required
This implementation uses existing utilities and patterns.

---

## Design Principles Validation

### YAGNI ✅
- [x] Only implements current requirement (hide on 3 specific screens)
- [x] No future screen speculation or complex configuration
- [x] Simple array-based route check

### KISS ✅
- [x] Uses existing `getActiveRouteName` utility
- [x] Simple state variable + effect pattern
- [x] Single responsibility: just determine visibility

### DRY ✅
- [x] Reuses `getActiveRouteName` from navigationUtilities
- [x] Single source of truth for hidden routes list

### Existing Systems ✅
- [x] Leverages `navigationRef` already in codebase
- [x] Uses same pattern as `useBackButtonHandler`
- [x] No new utilities or abstractions created

---

## Implementation Summary

**Single File Change:** `/app/components/session/SessionOverlay.tsx`

**Key Changes:**
1. Import `navigationRef`, `getActiveRouteName` from navigationUtilities
2. Add `OVERLAY_HIDDEN_ROUTES` constant with 3 route names
3. Add `currentRoute` state with navigation listener
4. Add conditional return when route is in hidden list

**Estimated Time:** 30 minutes implementation + 30 minutes testing

---

## Line Count: ~250 lines
