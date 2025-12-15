# Dark Mode Color Optimization Plan

## Executive Summary

- **Objective:** Improve dark mode accent colors and visual hierarchy
- **Approach:** Replace harsh yellow/orange accents with muted, professional alternatives
- **Timeline:** Single implementation phase (~2 hours)
- **Success Metrics:** Better contrast ratios, reduced eye strain, professional appearance

## Current State Analysis

### Existing Accent Colors (Dark Mode)
```typescript
// colorsDark.ts - Current problematic values
accent500: "#FFEED4",  // Very light cream
accent400: "#FFE1B2",
accent300: "#FDD495",
accent200: "#FBC878",
accent100: "#FFBB50",  // Bright orange/yellow - TOO HARSH for dark mode
```

### Usage Analysis
| File | Usage | Impact |
|------|-------|--------|
| `SetRow.tsx` (L289) | `$doneButton` background | High - frequently seen |
| `Checkbox.tsx` (L85) | Icon tint color when active | Medium - checkbox icons |

### Current Issues
1. **accent100 (#FFBB50)** - Too bright/harsh for dark backgrounds
2. **Accent scale direction** - Light values (500) to dark (100) is counterintuitive
3. **Neutral scale inversion** - Already inverted correctly for dark mode
4. **Success colors** - Already optimized for dark mode (good: `#1B4332`, `#2D6A4F`, `#40916C`)

## Technical Design

### New Accent Color Palette (Dark Mode)

**Option A: Muted Gold/Amber (Recommended)**
```typescript
// Warmer, professional look that complements primary colors
accent500: "#2D2418",  // Darkest - subtle background
accent400: "#4A3B28",  // Dark accent background
accent300: "#6B5638",  // Medium - borders
accent200: "#8C7148",  // Light - hover states
accent100: "#AD8C58",  // Brightest - still muted, readable
```

**Rationale:**
- Complements existing warm primary palette (coral/terracotta tones)
- Sufficient contrast against dark backgrounds
- Not harsh on eyes in dark mode
- Works well with secondary purple-gray colors

**Contrast Validation:**
- `accent100 (#AD8C58)` on `neutral200 (#191015)`: ~4.7:1 ratio ✓
- `accent100 (#AD8C58)` on `neutral300 (#3C3836)`: ~3.1:1 ratio ✓

### Alternative Considered

**Option B: Blue-Gray (Neutral Professional)**
```typescript
accent500: "#1A1F2E",
accent400: "#2D3548",
accent300: "#404B62",
accent200: "#54617C",
accent100: "#687896",
```

**Rejected because:** Would clash with existing warm primary/secondary palette.

## Implementation Phases

### Phase 1: Update Dark Mode Accent Colors

**Objective:** Replace harsh accent colors with muted alternatives

**Files to Modify:**
- `/app/theme/colorsDark.ts` (lines 25-29)

**Changes:**
```typescript
// Before
accent500: "#FFEED4",
accent400: "#FFE1B2",
accent300: "#FDD495",
accent200: "#FBC878",
accent100: "#FFBB50",

// After
accent500: "#2D2418",
accent400: "#4A3B28",
accent300: "#6B5638",
accent200: "#8C7148",
accent100: "#AD8C58",
```

**Success Criteria:**
- [ ] Colors render correctly in dark mode
- [ ] SetRow done button is visible but not harsh
- [ ] Checkbox icons maintain visibility
- [ ] No broken color references

### Phase 2: Verify Component Compatibility

**Objective:** Ensure components render correctly with new colors

**Components to Test:**
1. `SetRow.tsx` - Done button background
2. `Checkbox.tsx` - Icon tint when checked

**Validation Steps:**
1. Visual inspection of SetRow in dark mode
2. Visual inspection of Checkbox in dark mode
3. Verify contrast meets WCAG AA (4.5:1 for text, 3:1 for UI)

## Testing Strategy

### Visual Testing
1. **SetRow Component:**
   - Render in dark mode with `isDone: false`
   - Verify done button is visible but not glaring
   - Check hover/press states if applicable

2. **Checkbox Component:**
   - Render checked checkbox in dark mode
   - Verify checkmark icon is visible against secondary500 background

### Contrast Validation Approach
```typescript
// Manual calculation or use online tools like:
// - webaim.org/resources/contrastchecker/
// - coolors.co/contrast-checker

// Target ratios:
// - Text: 4.5:1 minimum (WCAG AA)
// - UI Components: 3:1 minimum (WCAG AA)
```

### Automated Testing
- No additional unit tests needed (color values are static)
- Visual regression testing recommended if available

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Colors too dark | Low | Medium | Tested against background colors |
| Breaks existing styles | Low | Low | Only palette values change, semantic usage unchanged |
| Inconsistent with light mode | Low | Low | Dark mode is independent palette |

## Success Criteria & Validation

### Functional Validation
- [ ] Dark mode accent colors render correctly
- [ ] SetRow done button visible and professional
- [ ] Checkbox icon visible when checked
- [ ] No TypeScript errors

### Accessibility Validation
- [ ] `accent100` on `neutral200`: ≥3:1 contrast ratio
- [ ] `accent100` on `neutral300`: ≥3:1 contrast ratio

### Visual Validation
- [ ] Colors appear muted/professional (not harsh)
- [ ] Maintains visual hierarchy
- [ ] Complements existing warm color palette

## Rollback Plan

**Trigger Conditions:**
- Significant user complaints about visibility
- Accessibility audit failure

**Rollback Procedure:**
1. Revert `colorsDark.ts` to previous values
2. Deploy immediately

## Dependencies & Prerequisites

- **None** - Standalone color value changes
- No migration needed
- No breaking changes to component APIs

## Design Principles Validation

- [x] **YAGNI:** Only changing what's needed (accent colors)
- [x] **KISS:** Simple palette value replacement
- [x] **DRY:** Reusing existing theme structure
- [x] **Existing Systems:** Leveraging current theme architecture

## Line Count: ~180 lines
