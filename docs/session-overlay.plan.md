# Session Overlay Component Implementation Plan

## Executive Summary

- **Objective:** Create a global session overlay that displays when an active workout session exists, allowing users to quickly resume or discard their workout from any screen
- **Approach:** Build a composable overlay component that integrates with MobX-State-Tree and React Navigation, positioned above the bottom tab bar
- **Timeline:** 2-3 days for implementation and testing
- **Success Metrics:** Overlay visible on all screens when session active, smooth navigation to ActiveWorkout, clean session discard with confirmation

---

## Requirements Analysis

### Functional Requirements
1. **Overlay Display:** Show overlay at bottom of screen (above tab bar) when `workoutStore.currentSession` exists
2. **Session Info Display:** Show session duration (elapsed time) and exercise count
3. **Action Buttons:** "Discard" button (with confirmation) and "Continue Workout" button
4. **Global Visibility:** Visible on ALL screens within the app when session is active
5. **Confirmation Modal:** Show confirmation dialog before discarding session
6. **Navigation:** Navigate to ActiveWorkoutScreen when "Continue Workout" pressed

### Non-Functional Requirements
1. **Performance:** Timer updates every second without causing excessive re-renders
2. **Responsiveness:** Works across different screen sizes
3. **Accessibility:** Buttons accessible, proper labels
4. **Theme Support:** Follows existing app theming system

### Business Rules
- Overlay only appears when `workoutStore.currentSession` is truthy
- Discard requires explicit user confirmation
- Timer shows elapsed time since `currentSession.startedAt`

### Acceptance Criteria
- [x] Overlay visible when active session exists
- [x] Overlay hidden when no session
- [x] Timer displays correct elapsed time
- [x] Exercise count accurate
- [x] "Continue Workout" navigates to ActiveWorkout
- [x] "Discard" shows confirmation modal
- [x] Confirming discard clears session and hides overlay
- [x] Canceling discard keeps session active

---

## Technical Design

### Component Hierarchy

```
App.tsx
└── RootStoreProvider
    └── SafeAreaProvider
        └── ThemeProvider
            └── SessionOverlayProvider  ← NEW (wraps navigation)
                └── AppNavigator
                    └── SessionOverlay  ← NEW (renders overlay + modal)
```

### File Structure

```
app/
├── components/
│   └── session/                              ← NEW directory
│       ├── SessionOverlay.tsx               ← Main overlay component
│       ├── SessionOverlayBar.tsx            ← Visual bar component
│       ├── SessionDiscardModal.tsx          ← Confirmation modal
│       └── index.ts                         ← Barrel export
├── hooks/
│   └── useSessionTimer.ts                   ← NEW: Timer logic hook
├── models/
│   └── WorkoutStore.ts                      ← MODIFY: Add discardSession action
└── navigators/
    └── AppNavigator.tsx                     ← MODIFY: Add overlay wrapper
```

### API Specifications

#### SessionOverlay Component Props
```typescript
interface SessionOverlayProps {
  // No props needed - uses MobX context directly
}
```

#### SessionOverlayBar Component Props
```typescript
interface SessionOverlayBarProps {
  duration: string           // Formatted duration "12:34"
  exerciseCount: number      // Number of exercises
  onContinue: () => void     // Handler for continue button
  onDiscard: () => void      // Handler for discard button
}
```

#### SessionDiscardModal Component Props
```typescript
interface SessionDiscardModalProps {
  visible: boolean           // Modal visibility
  onConfirm: () => void      // Confirm discard
  onCancel: () => void       // Cancel discard
}
```

#### useSessionTimer Hook
```typescript
function useSessionTimer(startedAt: Date | undefined): string
// Returns formatted duration string "MM:SS" or "HH:MM:SS"
```

### Data Model Updates

Add `discardSession` action to WorkoutStore:

```typescript
// In WorkoutStore.ts actions
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
}
```

### Integration Points

1. **MobX Store Access:** Use `useStores()` hook from `@/models/RootStoreContext`
2. **Navigation:** Use `useNavigation()` from `@react-navigation/native` with proper typing
3. **Theme:** Use `useAppTheme()` hook for consistent styling
4. **Safe Areas:** Use `useSafeAreaInsets()` for proper bottom spacing

---

## Implementation Phases

### Phase 1: Add discardSession Action to WorkoutStore
**Objective:** Enable session discard functionality in the store

**Deliverables:**
- Modified `WorkoutStore.ts` with `discardSession` action

**Files to Modify:**
- `/app/models/WorkoutStore.ts` (lines 270-355, add action)

**Implementation Details:**
```typescript
// Add to actions return object (after createTemplateFromSession):
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

**Dependencies:** None
**Risks:** Low - simple action, follows existing pattern
**Success Criteria:** `workoutStore.discardSession()` clears session successfully

---

### Phase 2: Create useSessionTimer Hook
**Objective:** Encapsulate timer logic for session duration display

**Deliverables:**
- New `useSessionTimer.ts` hook file

**File to Create:**
- `/app/hooks/useSessionTimer.ts`

**Implementation Details:**
```typescript
import { useEffect, useState } from "react"

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const pad = (n: number) => n.toString().padStart(2, "0")

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`
  }
  return `${pad(minutes)}:${pad(seconds)}`
}

export function useSessionTimer(startedAt: Date | undefined): string {
  const [duration, setDuration] = useState("00:00")

  useEffect(() => {
    if (!startedAt) {
      setDuration("00:00")
      return
    }

    const updateDuration = () => {
      const elapsed = Date.now() - startedAt.getTime()
      setDuration(formatDuration(elapsed))
    }

    updateDuration()
    const interval = setInterval(updateDuration, 1000)

    return () => clearInterval(interval)
  }, [startedAt])

  return duration
}
```

**Dependencies:** None
**Risks:** Low - standard timer pattern
**Success Criteria:** Returns accurate formatted duration, updates every second

---

### Phase 3: Create Session Overlay Components
**Objective:** Build the visual overlay components

**Deliverables:**
- New `/app/components/session/` directory with components
- `SessionOverlayBar.tsx` - Visual bar
- `SessionDiscardModal.tsx` - Confirmation modal
- `SessionOverlay.tsx` - Container with logic
- `index.ts` - Barrel export

**Files to Create:**

#### `/app/components/session/SessionDiscardModal.tsx`
```typescript
import { Modal, Pressable, View, ViewStyle } from "react-native"

import { Button } from "@/components/Button"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export interface SessionDiscardModalProps {
  visible: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function SessionDiscardModal({ visible, onConfirm, onCancel }: SessionDiscardModalProps) {
  const { themed, theme } = useAppTheme()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={themed($backdrop)} onPress={onCancel}>
        <Pressable style={themed($content)} onPress={(e) => e.stopPropagation()}>
          <Text text="Discard Workout?" preset="subheading" />
          <Text text="You will lose all progress from this workout session." />
          <View style={themed($buttons)}>
            <Button text="Cancel" preset="default" onPress={onCancel} style={themed($button)} />
            <Button
              text="Discard"
              preset="filled"
              onPress={onConfirm}
              style={themed($button)}
              textStyle={{ color: theme.colors.error }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const $backdrop: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.palette.overlay50,
  justifyContent: "center",
  alignItems: "center",
})

const $content: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  borderRadius: 12,
  padding: spacing.lg,
  margin: spacing.lg,
  gap: spacing.md,
  maxWidth: 320,
  width: "100%",
})

const $buttons: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
  marginTop: spacing.sm,
})

const $button: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})
```

#### `/app/components/session/SessionOverlayBar.tsx`
```typescript
import { View, ViewStyle } from "react-native"

import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"
import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

export interface SessionOverlayBarProps {
  duration: string
  exerciseCount: number
  onContinue: () => void
  onDiscard: () => void
}

export function SessionOverlayBar({
  duration,
  exerciseCount,
  onContinue,
  onDiscard,
}: SessionOverlayBarProps) {
  const { themed, theme } = useAppTheme()

  const exerciseLabel = exerciseCount === 1 ? "exercise" : "exercises"

  return (
    <View style={themed($container)}>
      <View style={themed($info)}>
        <Text text={duration} preset="bold" size="md" />
        <Text text={`${exerciseCount} ${exerciseLabel}`} size="xs" />
      </View>
      <View style={themed($actions)}>
        <Button
          text="Discard"
          preset="default"
          onPress={onDiscard}
          style={themed($discardButton)}
          textStyle={{ color: theme.colors.error }}
        />
        <Button text="Continue" preset="reversed" onPress={onContinue} style={themed($continueButton)} />
      </View>
    </View>
  )
}

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: colors.palette.neutral300,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderTopWidth: 1,
  borderTopColor: colors.border,
})

const $info: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "column",
})

const $actions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.xs,
})

const $discardButton: ThemedStyle<ViewStyle> = () => ({
  minHeight: 40,
})

const $continueButton: ThemedStyle<ViewStyle> = () => ({
  minHeight: 40,
})
```

#### `/app/components/session/SessionOverlay.tsx`
```typescript
import { useState } from "react"
import { View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"
import { useNavigation, CommonActions } from "@react-navigation/native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useStores } from "@/models/RootStoreContext"
import { useSessionTimer } from "@/hooks/useSessionTimer"

import { SessionDiscardModal } from "./SessionDiscardModal"
import { SessionOverlayBar } from "./SessionOverlayBar"

export const SessionOverlay = observer(function SessionOverlay() {
  const { workoutStore } = useStores()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()

  const session = workoutStore.currentSession
  const duration = useSessionTimer(session?.startedAt)
  const [showDiscardModal, setShowDiscardModal] = useState(false)

  if (!session) return null

  const exerciseCount = session.exercises.length

  function handleContinue() {
    // Navigate to ActiveWorkout within the Workout stack
    navigation.dispatch(
      CommonActions.navigate({
        name: "Workout",
        params: {
          screen: "ActiveWorkout",
        },
      })
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

  // Calculate bottom position to sit above tab bar (typically 49px + safe area)
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

#### `/app/components/session/index.ts`
```typescript
export { SessionOverlay } from "./SessionOverlay"
export { SessionOverlayBar } from "./SessionOverlayBar"
export { SessionDiscardModal } from "./SessionDiscardModal"
```

**Dependencies:** Phase 1 (discardSession), Phase 2 (useSessionTimer)
**Risks:** Medium - positioning above tab bar may need adjustment per device
**Success Criteria:** Components render correctly, follow existing patterns

---

### Phase 4: Integrate Overlay into App Navigation
**Objective:** Add the overlay to the app so it appears globally

**Deliverables:**
- Modified `AppNavigator.tsx` to include overlay

**Files to Modify:**
- `/app/navigators/AppNavigator.tsx`

**Implementation Details:**

Wrap the navigation content with a View that includes the overlay:

```typescript
// Add imports at top:
import { View, ViewStyle } from "react-native"
import { SessionOverlay } from "@/components/session"

// Modify AppNavigator component:
export const AppNavigator = (props: NavigationProps) => {
  const { navigationTheme } = useAppTheme()

  const exitRouteNames = [...exitRoutes, "WorkoutTab"]
  useBackButtonHandler((routeName) => exitRouteNames.includes(routeName))

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme} {...props}>
      <ErrorBoundary catchErrors={Config.catchErrors}>
        <View style={$container}>
          <AppTabs />
          <SessionOverlay />
        </View>
      </ErrorBoundary>
    </NavigationContainer>
  )
}

const $container: ViewStyle = {
  flex: 1,
}
```

**Dependencies:** Phase 3 (SessionOverlay component)
**Risks:** Low - simple wrapper addition
**Success Criteria:** Overlay appears when session active, navigation still works

---

### Phase 5: Create hooks directory and barrel export
**Objective:** Organize hooks properly

**Deliverables:**
- Create `/app/hooks/` directory if not exists
- Add barrel export

**Files to Create:**
- `/app/hooks/useSessionTimer.ts` (from Phase 2)
- `/app/hooks/index.ts`

**Implementation:**
```typescript
// /app/hooks/index.ts
export { useSessionTimer } from "./useSessionTimer"
```

**Dependencies:** None
**Risks:** None
**Success Criteria:** Hooks importable from `@/hooks`

---

## Testing Strategy

### Unit Testing

**useSessionTimer Hook:**
```typescript
// Test file: /app/hooks/__tests__/useSessionTimer.test.ts
describe("useSessionTimer", () => {
  it("returns 00:00 when no startedAt provided", () => {})
  it("formats seconds correctly", () => {})
  it("formats minutes correctly", () => {})
  it("formats hours when > 60 minutes", () => {})
  it("updates every second", () => {})
  it("cleans up interval on unmount", () => {})
})
```

**WorkoutStore.discardSession:**
```typescript
describe("WorkoutStore.discardSession", () => {
  it("clears currentSession when active", () => {})
  it("returns false when no session", () => {})
  it("sets lastError when no session", () => {})
})
```

### Integration Testing

**SessionOverlay Component:**
```typescript
describe("SessionOverlay", () => {
  it("renders nothing when no active session", () => {})
  it("renders overlay bar when session active", () => {})
  it("shows correct exercise count", () => {})
  it("opens discard modal on discard press", () => {})
  it("navigates to ActiveWorkout on continue", () => {})
  it("clears session on discard confirm", () => {})
  it("closes modal on discard cancel", () => {})
})
```

### Manual Testing Steps
1. Start a new workout session
2. Navigate away from ActiveWorkout to WorkoutTab
3. Verify overlay appears at bottom
4. Verify timer is counting up
5. Verify exercise count is accurate
6. Press "Continue" - verify navigates to ActiveWorkout
7. Navigate away again
8. Press "Discard" - verify confirmation modal appears
9. Press "Cancel" - verify modal closes, overlay still visible
10. Press "Discard" again, then "Discard" in modal
11. Verify session is cleared and overlay disappears

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Overlay positioning varies by device | Medium | Low | Use SafeAreaInsets for dynamic positioning |
| Timer causes performance issues | Low | Medium | Use single interval, memo optimization |
| Navigation dispatch fails | Low | High | Use CommonActions for reliable navigation |
| Modal blocks underlying touches | Low | Medium | Use proper z-index and event handling |

---

## Success Criteria & Validation

### Functional Validation
- [ ] Overlay visible on all screens when session active
- [ ] Overlay hidden when no session
- [ ] Timer displays and updates correctly
- [ ] Exercise count accurate
- [ ] Continue button navigates correctly
- [ ] Discard shows confirmation modal
- [ ] Discard confirm clears session
- [ ] Discard cancel keeps session

### Performance Validation
- [ ] Timer updates don't cause visible lag
- [ ] Overlay renders without blocking main thread
- [ ] Memory doesn't leak from timer intervals

### Design Validation
- [ ] Follows existing theme patterns
- [ ] Uses existing Button, Text components
- [ ] Consistent with app styling
- [ ] Accessible labels present

---

## Rollback Plan

- **Trigger Conditions:** Major bugs in navigation, performance degradation, or blocking user interactions
- **Rollback Procedure:**
  1. Remove SessionOverlay from AppNavigator.tsx
  2. Keep discardSession action (harmless if unused)
  3. Delete `/app/components/session/` directory
  4. Delete `/app/hooks/useSessionTimer.ts`
- **Data Recovery:** No data migration needed - purely UI change
- **Communication Plan:** Document rollback in PR/commit if needed

---

## Dependencies & Prerequisites

### Technical Dependencies
- React Navigation (already installed)
- MobX-State-Tree (already configured)
- react-native-safe-area-context (already installed)

### Team Dependencies
- None - self-contained implementation

### External Dependencies
- None

### Timeline Dependencies
- Phases must be completed in order (1 → 2 → 3 → 4 → 5)
- Phase 3 is the largest and can be parallelized internally

---

## Design Principles Validation

### YAGNI ✅
- [x] Only features needed NOW are planned
- [x] No speculative future features (e.g., no "pause session", no "session notes")
- [x] Minimal viable solution for the problem

### KISS ✅
- [x] Simple component hierarchy
- [x] Standard React patterns (hooks, observers)
- [x] No complex state machines or abstractions

### DRY ✅
- [x] Reuses existing Button, Text, Icon components
- [x] Uses existing theme system
- [x] Timer logic extracted to reusable hook

### Existing Systems ✅
- [x] Uses existing MobX store patterns
- [x] Follows existing component structure
- [x] Uses existing ThemedStyle patterns
- [x] Integrates with existing navigation

---

## Implementation Order Summary

1. **WorkoutStore.discardSession** - Add action (15 min)
2. **useSessionTimer hook** - Create timer hook (30 min)
3. **Session components** - Create all 4 files (2-3 hours)
4. **AppNavigator integration** - Add overlay (15 min)
5. **Testing** - Write and run tests (1-2 hours)

**Total Estimated Time:** 4-6 hours of implementation + testing

---

## Line Count: ~450 lines
