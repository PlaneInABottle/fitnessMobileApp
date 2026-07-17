import { getGeneratedExerciseImages, type ExerciseImagePair } from "./exerciseImages.generated"
import {
  EXERCISE_VIDEO_IDS,
  getGeneratedExerciseVideo,
  type ExerciseVideo,
} from "./exerciseVideos.generated"

const exerciseVideoIds = new Set<string>(EXERCISE_VIDEO_IDS)

export function getExerciseImages(exerciseId: string): ExerciseImagePair | undefined {
  return getGeneratedExerciseImages(exerciseId)
}

export function getExerciseVideo(exerciseId: string): ExerciseVideo | undefined {
  return getGeneratedExerciseVideo(exerciseId)
}

export function hasExerciseVideo(exerciseId: string): boolean {
  return exerciseVideoIds.has(exerciseId)
}
