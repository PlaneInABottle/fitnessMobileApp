# Workout persistence (notes, sets, templates)

This document describes how the app currently persists workout sessions, sets, exercise templates, and “memory” placeholders.

## Storage layers

### Root store persistence
The MobX-State-Tree root store snapshot is persisted via the `setupRootStore` wiring (see `app/models/setupRootStore.ts`). This is what makes an in-progress workout and your templates survive app restarts.

> **Key idea:** persistence is snapshot-based; the *current* MST state is serialized and restored.

## Workout session lifecycle

### `currentSession`
- The active workout lives in `WorkoutStore.currentSession` (see `app/models/WorkoutStore.ts`).
- A session contains `exercises[]`, and each workout exercise contains:
  - `notes: string`
  - `sets: ExerciseSet[]`

### Start / Resume
- Starting a workout (`startNewSession` / `startSessionFromTemplate`) creates `currentSession`.
- Because `currentSession` is inside the persisted root store snapshot, an *in-progress* session is restored on app restart.

### Discard
- `discardSession()` simply sets `currentSession = undefined` (WorkoutStore), so nothing is added to history.

### Complete
- `completeSession()` sets `completedAt` and then moves the session into `sessionHistory`.
- **Important behavior:** notes are intentionally removed before saving to history:
  - See `completeSessionUnsafe()` in `app/models/WorkoutStore.ts` where it builds `snapshotForHistory` and omits `notes`.

## Notes persistence behavior

### During an active workout
- Notes are stored on `WorkoutExerciseModel.notes`.
- UI edits call `workoutStore.updateWorkoutExerciseNotes(...)` which updates that model field.

### After finishing a workout
- Notes do **not** persist into `sessionHistory` by design (comment in `WorkoutStore.completeSessionUnsafe`).

### User-visible implications
- You will see your notes when resuming an in-progress workout (since `currentSession` is persisted).
- You will **not** see prior workout notes when looking at completed workout history, because they were stripped on completion.

## Sets persistence behavior

### During an active workout
- Sets are stored in `WorkoutExerciseModel.sets` inside `currentSession`.
- They are updated via `addSetToWorkoutExercise` / `updateSetInWorkoutExercise`.

### After finishing a workout
- Sets *do* persist into `sessionHistory` because the history snapshot retains `sets`.

## Templates persistence behavior

### What a template contains
- Templates are stored in `WorkoutStore.templates`.
- A template includes:
  - `exerciseIds` (exercise ordering)
  - `exercises[]` with a per-exercise list of stored sets (see `TemplateExerciseModel` / `TemplateSetModel`)

### Creating/updating templates
- `createTemplateFromSession(name)` copies the session’s exercises + sets into a new template.
- `updateTemplateFromCurrentSession(templateId)` overwrites the template’s exercise ids and stored sets from the current session.
- Notes are not part of templates.

## Performance memory (“placeholders” / suggested values)

### What it is
`PerformanceMemoryStore` maintains:
- `patternMemories`: a map keyed by `(exerciseId, category, setType, order)`.
- `personalRecords`: a per-exercise map of best-ever values.

### When it is written
- On `completeSession`, `WorkoutStore` calls:
  - `root.performanceMemoryStore.recordCompletedWorkout(...)`
  - This records the performed sets into `patternMemories` and updates `personalRecords`.

### How the UI uses it
- Set placeholder values are fetched via `PerformanceMemoryStore.getPlaceholdersForSet(...)`.
- This is why new workouts can show “last time” numbers as placeholders/suggestions even if you start a fresh session.

## Common scenarios

### “Why did my note disappear after finishing?”
Because `completeSession` explicitly strips `notes` before persisting the session into `sessionHistory`.

### “Why do my sets show last time’s numbers as placeholders?”
Because `PerformanceMemoryStore.recordCompletedWorkout` stores the last completed patterns, and the UI queries them when rendering new set rows.

### “If I kill the app mid-workout, do I lose sets/notes?”
Typically no: `currentSession` is part of the persisted root store snapshot and should restore on relaunch.
