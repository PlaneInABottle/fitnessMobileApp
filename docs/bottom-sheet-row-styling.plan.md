# Bottom Sheet & Row Styling Implementation Plan

## Executive Summary
- **Objective:** Implement SetOptionsBottomSheet component and improve SetRow styling with alternating colors, success states, and input field enhancements
- **Approach:** Use React Native Modal for bottom sheet (KISS), extend existing SetRow component, add success colors to theme
- **Timeline:** 2-3 days implementation
- **Success Metrics:** Bottom sheet functional on long-press, alternating row colors visible, done state shows green highlight

## Requirements Analysis

### Functional Requirements
1. **SetOptionsBottomSheet** - Modal-based action sheet triggered by long-press on completed sets
   - Edit set action → enters edit mode for that set
   - Delete set action → removes set from workout
   - Change set type action → cycles through warmup/working/dropset
2. **Alternating Row Colors** - Even/odd pattern for completed sets
3. **Success State Highlighting** - Green tint when set marked as done
4. **Input Field Improvements** - "0" placeholder, bold placeholders, theme-consistent colors

### Non-Functional Requirements
- No external libraries (use React Native Modal)
- Smooth slide-up animation (200-300ms)
- Dark theme compatible
- Accessible with screen readers

### Acceptance Criteria
- [ ] Long-press on completed row opens bottom sheet
- [ ] All three actions (Edit, Delete, Change Type) functional
- [ ] Tap outside or swipe down dismisses sheet
- [ ] Alternating row colors visible in completed sets
- [ ] Done sets show green background tint
- [ ] Input placeholders show "0" instead of "-"

## Technical Design

### Architecture Changes

```
app/components/workout/
├── SetRow.tsx              # Enhanced with index, isDone props
├── SetOptionsBottomSheet.tsx  # NEW: Modal-based action sheet
├── ExerciseCard.tsx        # Unchanged
├── MemorySuggestions.tsx   # Unchanged
└── WorkoutHeader.tsx       # Unchanged
```

### Component Interfaces

#### SetOptionsBottomSheet Props
```typescript
export interface SetOptionsBottomSheetProps {
  visible: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onChangeType: () => void
  setTypeName: string  // Current type for display
}
```

#### Enhanced SetRow Props
```typescript
export interface SetRowProps {
  category: ExerciseCategory
  mode: SetRowMode
  value?: Partial<SetData>
  placeholders?: Partial<Record<EditableFieldKey, string>>
  touched?: Partial<Record<EditableFieldKey | "setType", boolean>>
  availableSetTypes?: Array<{ id: SetTypeId; name: string }>
  onChange?: (next: Partial<SetData>, touchedKey?: EditableFieldKey | "setType") => void
  onDone?: () => void
  // NEW PROPS:
  index?: number           // For alternating row colors
  isDone?: boolean         // For green success highlighting
  onLongPress?: () => void // Trigger bottom sheet
  onEdit?: () => void      // Edit this set
}
```

### Theme Color Additions

#### colorsDark.ts additions
```typescript
// Add success colors to palette
success100: "#1B4332",  // Dark green background
success200: "#2D6A4F",  // Medium dark green
success500: "#40916C",  // Green accent
```

#### colors.ts additions
```typescript
// Add success colors to palette
success100: "#D1FAE5",  // Light green background
success200: "#A7F3D0",  // Light medium green
success500: "#10B981",  // Green accent
```

### Styling Specifications

#### Alternating Row Colors (Dark Mode)
- Even rows (index 0, 2, 4...): `neutral300` (#3C3836)
- Odd rows (index 1, 3, 5...): `neutral200` (#191015)

#### Done State Highlighting
- Background: `success100` (#1B4332 in dark mode)
- Checkmark: `success500` (#40916C)

#### Bottom Sheet Styling
- Backdrop: `overlay50` (semi-transparent)
- Sheet background: `background` (neutral200 in dark)
- Border radius: 16px top corners
- Handle indicator: 40px width, 4px height, neutral500 color
- Padding: lg (24px)
- Gap between options: md (16px)

### Animation Approach

**Bottom Sheet Animation:**
- Use React Native Animated API
- Slide from bottom: translateY from screen height to 0
- Duration: 250ms
- Easing: ease-out

```typescript
// Animation setup
const slideAnim = useRef(new Animated.Value(screenHeight)).current

const showSheet = () => {
  Animated.timing(slideAnim, {
    toValue: 0,
    duration: 250,
    useNativeDriver: true,
    easing: Easing.out(Easing.ease),
  }).start()
}

const hideSheet = () => {
  Animated.timing(slideAnim, {
    toValue: screenHeight,
    duration: 200,
    useNativeDriver: true,
  }).start(() => onClose())
}
```

## Implementation Phases

### Phase 1: Theme Color Updates
**Objective:** Add success color tokens to both light and dark themes

**Deliverables:**
- Add success100, success200, success500 to colors.ts palette
- Add success100, success200, success500 to colorsDark.ts palette

**Files Modified:**
- `app/theme/colors.ts`
- `app/theme/colorsDark.ts`

**Success Criteria:**
- Colors accessible via `colors.palette.success*`

---

### Phase 2: SetRow Enhancements
**Objective:** Add index, isDone props and update styling

**Deliverables:**
1. Add `index`, `isDone`, `onLongPress` props to SetRowProps interface
2. Update row background logic for alternating colors
3. Add green highlight for isDone state
4. Update placeholder from "-" to "0"
5. Use theme color for placeholderTextColor
6. Make completed rows pressable with onLongPress handler

**Implementation Details:**
```typescript
// Row style logic
const rowStyle: ThemedStyle<ViewStyle> = ({ colors }) => {
  if (isDone) {
    return { backgroundColor: colors.palette.success100 }
  }
  if (mode === "completed" && typeof index === "number") {
    return { 
      backgroundColor: index % 2 === 0 
        ? colors.palette.neutral300 
        : colors.palette.neutral200 
    }
  }
  return { backgroundColor: "transparent" }
}

// Placeholder update
placeholder={placeholders?.[key] ?? "0"}
placeholderTextColor={colors.textDim}
```

**Files Modified:**
- `app/components/workout/SetRow.tsx`

**Success Criteria:**
- [ ] Alternating colors visible
- [ ] Done state shows green
- [ ] Long-press triggers callback

---

### Phase 3: SetOptionsBottomSheet Component
**Objective:** Create new bottom sheet component using React Native Modal

**Deliverables:**
1. Create SetOptionsBottomSheet.tsx with Modal wrapper
2. Implement slide-up animation
3. Add three action buttons (Edit, Delete, Change Type)
4. Handle dismiss on backdrop tap

**Component Structure:**
```tsx
<Modal visible={visible} transparent animationType="none">
  <Pressable style={$backdrop} onPress={handleClose}>
    <Animated.View style={[$sheet, { transform: [{ translateY: slideAnim }] }]}>
      <View style={$handle} />
      <Pressable style={$option} onPress={handleEdit}>
        <Text text="Edit Set" />
      </Pressable>
      <Pressable style={$option} onPress={handleDelete}>
        <Text text="Delete Set" />
      </Pressable>
      <Pressable style={$option} onPress={handleChangeType}>
        <Text text={`Change Type (${setTypeName})`} />
      </Pressable>
    </Animated.View>
  </Pressable>
</Modal>
```

**Files Created:**
- `app/components/workout/SetOptionsBottomSheet.tsx`

**Success Criteria:**
- [ ] Modal opens with slide animation
- [ ] Backdrop tap dismisses
- [ ] All actions trigger callbacks

---

### Phase 4: ActiveWorkoutScreen Integration
**Objective:** Integrate bottom sheet and pass index to SetRow

**Deliverables:**
1. Add state for selected set (for bottom sheet context)
2. Add SetOptionsBottomSheet to component tree
3. Pass index prop to SetRow in map
4. Implement edit/delete/changeType handlers
5. Remove Cancel button (optional - user can tap outside)

**State Management:**
```typescript
const [selectedSetInfo, setSelectedSetInfo] = useState<{
  workoutExerciseId: string
  setIndex: number
  setId: string
} | null>(null)

function handleSetLongPress(weId: string, setIndex: number, setId: string) {
  setSelectedSetInfo({ workoutExerciseId: weId, setIndex, setId })
}

function handleEditSet() {
  if (!selectedSetInfo) return
  // Enter edit mode for this specific set
  // Implementation depends on store methods
  setSelectedSetInfo(null)
}

function handleDeleteSet() {
  if (!selectedSetInfo) return
  workoutStore.deleteSetFromWorkoutExercise(
    selectedSetInfo.workoutExerciseId,
    selectedSetInfo.setId
  )
  setSelectedSetInfo(null)
}
```

**Files Modified:**
- `app/screens/ActiveWorkoutScreen.tsx`

**Success Criteria:**
- [ ] Long-press opens bottom sheet
- [ ] Edit enters edit mode
- [ ] Delete removes set
- [ ] Change type cycles set type

---

### Phase 5: WorkoutStore Methods (If Needed)
**Objective:** Add deleteSet and editSet actions to WorkoutStore

**Deliverables:**
- `deleteSetFromWorkoutExercise(workoutExerciseId, setId)` action
- `updateSetInWorkoutExercise(workoutExerciseId, setId, data)` action

**Files Modified:**
- `app/models/WorkoutStore.ts` (if methods don't exist)

**Success Criteria:**
- [ ] Delete action removes set from store
- [ ] Update action modifies set data

## Testing Strategy

### Unit Testing
- SetOptionsBottomSheet renders correctly
- Callbacks fire on button press
- Animation completes before onClose called

### Integration Testing
- Long-press flow: tap → hold → sheet appears
- Delete flow: long-press → delete → set removed from list
- Edit flow: long-press → edit → row enters edit mode

### Manual Testing Checklist
- [ ] Dark mode: Alternating colors visible and distinct
- [ ] Light mode: Alternating colors visible and distinct
- [ ] Done state: Green background appears
- [ ] Bottom sheet: Slides up smoothly
- [ ] Bottom sheet: Backdrop tap dismisses
- [ ] Bottom sheet: Actions work correctly
- [ ] Accessibility: VoiceOver announces actions

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Animation jank on low-end devices | Low | Medium | Use native driver, test on older devices |
| WorkoutStore missing delete action | Medium | High | Check store first, add if needed |
| Color contrast issues | Low | Medium | Test with accessibility tools |
| Long-press conflicts with scroll | Low | Medium | Use delayLongPress prop |

## Dependencies & Prerequisites

### Technical Dependencies
- React Native Animated API (built-in)
- React Native Modal (built-in)
- Existing Button, Text components

### Store Dependencies
- WorkoutStore may need deleteSetFromWorkoutExercise action
- Check if updateSetInWorkoutExercise exists

## Rollback Plan

**Trigger Conditions:**
- Animation causes performance issues
- Bottom sheet interferes with other gestures
- Store actions break data integrity

**Rollback Procedure:**
1. Revert SetRow changes (remove new props, restore old styling)
2. Remove SetOptionsBottomSheet component
3. Revert ActiveWorkoutScreen integration
4. Keep theme color additions (harmless)

## Design Principles Validation

### YAGNI Validation
- [x] All planned features have current, proven business need (from UI report)
- [x] No "future-proofing" or speculative capabilities
- [x] Implementation scope is minimal viable solution
- [x] No over-engineering for hypothetical requirements

### KISS Validation
- [x] Architecture matches actual problem complexity (Modal is simplest)
- [x] No unnecessary abstractions or layers added
- [x] Technology choices are straightforward and justified (React Native built-ins)
- [x] Solution is understandable to the development team

### DRY Validation
- [x] Common functionality is properly abstracted (reuse Button, Text)
- [x] Consistent patterns used throughout (follows SessionDiscardModal pattern)
- [x] No duplicate system capabilities planned
- [x] Reusable components designed where beneficial

### Existing Systems Validation
- [x] Current infrastructure is fully leveraged (Modal pattern from SessionDiscardModal)
- [x] New systems integrate with existing ones
- [x] No reinventing existing capabilities
- [x] Theme system extended, not replaced

## File Summary

### Files to Create
| File | Purpose |
|------|---------|
| `app/components/workout/SetOptionsBottomSheet.tsx` | Modal-based action sheet for set operations |

### Files to Modify
| File | Changes |
|------|---------|
| `app/theme/colors.ts` | Add success100, success200, success500 to palette |
| `app/theme/colorsDark.ts` | Add success100, success200, success500 to palette |
| `app/components/workout/SetRow.tsx` | Add index, isDone, onLongPress props; update styling |
| `app/screens/ActiveWorkoutScreen.tsx` | Integrate bottom sheet, pass index, add handlers |
| `app/models/WorkoutStore.ts` | Add deleteSetFromWorkoutExercise (if needed) |

## Line Count Validation
- [x] Plan is under 1000 lines (current: ~350 lines)
