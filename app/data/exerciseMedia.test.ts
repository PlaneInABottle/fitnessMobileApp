import { EXERCISE_CATALOG, getCatalogExercise } from "./exerciseCatalog"
import { EXERCISE_IMAGE_IDS } from "./exerciseImages.generated"
import { getExerciseImages, getExerciseVideo } from "./exerciseMedia"
import { EXERCISE_VIDEO_IDS } from "./exerciseVideos.generated"

describe("exercise catalog media", () => {
  it("contains a unique 873-exercise catalog", () => {
    expect(EXERCISE_CATALOG).toHaveLength(873)
    expect(new Set(EXERCISE_CATALOG.map(({ id }) => id)).size).toBe(873)
  })

  it("provides start and finish images for all available catalog media", () => {
    expect(EXERCISE_IMAGE_IDS).toHaveLength(872)
    expect(getExerciseImages("bench-press")).toHaveLength(2)
    expect(getExerciseImages("Hanging_Leg_Raise")).toBeUndefined()
  })

  it("provides licensed demonstrations for 50 catalog exercises", () => {
    expect(EXERCISE_VIDEO_IDS).toHaveLength(50)

    for (const exerciseId of EXERCISE_VIDEO_IDS) {
      const video = getExerciseVideo(exerciseId)
      expect(getCatalogExercise(exerciseId)).toBeDefined()
      expect(video?.source).toBeDefined()
      expect(video?.attribution).not.toBe("")
      expect(video?.licenseUrl).toMatch(/^https:\/\//)
    }
  })

  it("returns the preferred demonstration for a foundational exercise", () => {
    expect(getExerciseVideo("bench-press")).toEqual(
      expect.objectContaining({ sourceName: "YMove", licenseName: "Royalty-free commercial use" }),
    )
  })
})
