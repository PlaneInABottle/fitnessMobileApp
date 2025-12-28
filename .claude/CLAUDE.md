# Project Context - Claude

<!-- Generated: 2025-12-28T12:00:00Z | Template Version: 2.0.0 -->

<project_identity>

## Project Information

### Description

A modern, high-performance fitness tracking application built with React Native and Expo. Designed with an offline-first philosophy and a focused user experience for tracking workouts, sets, and progress.

### Key Technologies

React Native 0.81.5 with New Architecture (Hermes), Expo 54.0.29 (dev client), MobX State Tree 7.0.2 for global state, React Navigation 7.x (native stack + bottom tabs), TypeScript 5.9.2 (strict mode), i18next + react-i18next (internationalization), Maestro (E2E testing), MMKV (fast persistent storage), Secure Storage (encrypted tokens).
</project_identity>

---

<few_shot_examples>

## Project-Specific Examples

```typescript
// app/models/WorkoutStore.ts
import { types, cast } from "mobx-state-tree"
import { WorkoutExerciseModel } from "./WorkoutExercise"

export const WorkoutStoreModel = types
  .model("WorkoutStore", {
    currentSession: types.maybe(WorkoutSessionModel),
    templates: types.map(WorkoutTemplateModel),
  })
  .views((self) => ({
    get isSessionActive() {
      return !!self.currentSession
    },
  }))
  .actions((self) => ({
    startNewSession() {
      self.currentSession = WorkoutSessionModel.create({
        id: generateId(),
        startedAt: new Date(),
      })
    },
    completeSession() {
      if (!self.currentSession) return
      // Record performance memory and archive session
      self.currentSession = undefined
    },
  }))
```

```typescript
// app/screens/ActiveWorkoutScreen.tsx
import { observer } from "mobx-react-lite"
import { ScrollView } from "react-native"
import { useStores } from "@/models"
import { ExerciseCard } from "@/components/workout/ExerciseCard"

export const ActiveWorkoutScreen = observer(function ActiveWorkoutScreen() {
  const { workoutStore } = useStores()
  const session = workoutStore.currentSession

  if (!session) return null

  return (
    <ScrollView>
      {session.exercises.map((exercise) => (
        <ExerciseCard key={exercise.id} workoutExercise={exercise} />
      ))}
    </ScrollView>
  )
})
```

</few_shot_examples>

---

<architecture>
## Architecture Patterns

Strict 5-Store Architecture:
1. **ExerciseStore**: Library of available exercises and categories.
2. **WorkoutStore**: Active sessions, history, and templates.
3. **SetStore**: Validation and data for individual sets.
4. **PerformanceMemoryStore**: Last 5 performances and reactive suggestions.
5. **ProgressStore**: Analytics and progress tracking.

### State Management (MST)
- **RootStore**: Single source of truth.
- **Volatile State**: Use for UI-only state (e.g., `isSaving`, `pendingId`).
- **Flows**: Use `flow` for all asynchronous actions.

### UI & Theming
- **Themed Styles**: Use the `themed` higher-order function from `@/theme/context` for support of dynamic theme switching.
- **Atomic Components**: Prefer small, reusable components in `app/components/`.

### Storage & Persistence
- **MMKV**: High-frequency performance data and store snapshots.
- **Secure Storage**: Sensitive user data or tokens.
- **Migrations**: Always provide migration logic when changing store models.
</architecture>

---

<code_style>

## Code Style Guidelines

- TypeScript strict mode enforced.
- ESLint with Expo config + Prettier.
- Functional components with React hooks.
- Named exports only.
- Folder-scoped barrel exports (index.ts).
- Consistent naming: PascalCase for components, camelCase for functions/models.
- Use `themed` style pattern for components.
- Semantic commit prefixes: `[implementer] Feature:`, `[implementer] Fix:`, `[implementer] Chore:`, `[implementer] Style:`.
</code_style>

---

<file_organization>

## File Organization

app/
├── components/           # Reusable UI components
├── models/               # MobX State Tree stores
├── screens/              # Screen components
├── navigators/           # Navigation configuration
├── services/             # API and external services
├── theme/                # Theming and styling
├── i18n/                 # Internationalization
├── utils/                # Utility functions
└── app.tsx               # App entry point
</file_organization>

---

<testing>
## Testing Strategy

- Jest 29.7 with jest-expo.
- Integration tests for store workflows (workout creation, template management).
- Component testing with React Testing Library.
- Maestro for cross-platform E2E flows.
- Tests should target actual behavior, not implementation details.
</testing>

---

<dependencies>
## Dependency Management

- Expo-provided modules preferred.
- MobX State Tree for state management.
- MMKV for fast synchronous storage.
- Lucide React Native or custom icon registry.
</dependencies>

---

<project_notes>

## Project-Specific Notes

- Use 'bun run start' for development.
- Development builds required for MMKV and Keyboard Controller.
- Offline-first: all workout data persists locally before any sync.
- Reactive suggestions: suggestions appear based on previous performances stored in PerformanceMemoryStore.
- **Reactotron**: Use for MST action logs and performance tracking.
</project_notes>