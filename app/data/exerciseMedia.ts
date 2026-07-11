import { EXERCISE_IMAGES, type ExerciseImagePair } from "./exerciseImages.generated"
import { EXERCISE_VIDEOS, type ExerciseVideo } from "./exerciseVideos.generated"

export function getExerciseImages(exerciseId: string): ExerciseImagePair | undefined {
  return EXERCISE_IMAGES[exerciseId]
}

export function getExerciseVideo(exerciseId: string): ExerciseVideo | undefined {
  return EXERCISE_VIDEOS[exerciseId]
}
