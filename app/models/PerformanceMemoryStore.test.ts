import { PerformanceMemoryStoreModel } from "./PerformanceMemoryStore"

describe("PerformanceMemoryStore (v2)", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("stores last performance per pattern and returns placeholders", () => {
    const store = PerformanceMemoryStoreModel.create({})

    const completedAt = new Date("2025-01-01T00:00:00Z")

    store.recordCompletedWorkout({
      completedAt,
      exercises: [
        {
          exerciseId: "bench-press",
          category: "STRENGTH",
          sets: [
            { setType: "working", weight: 100, reps: 5 },
            { setType: "warmup", weight: 45, reps: 10 },
            { setType: "working", weight: 110, reps: 3 },
          ],
        },
      ],
    })

    expect(
      store.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 1,
      }),
    ).toMatchObject({ weight: "100", reps: "5" })

    expect(
      store.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 2,
      }),
    ).toMatchObject({ weight: "110", reps: "3" })

    expect(
      store.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "warmup",
        order: 1,
      }),
    ).toMatchObject({ weight: "45", reps: "10" })

    expect(
      store.getPlaceholdersForSet({
        exerciseId: "bench-press",
        category: "STRENGTH",
        setType: "working",
        order: 3,
      }),
    ).toMatchObject({ weight: "-", reps: "-" })
  })

  it("tracks personal records per exercise", () => {
    const store = PerformanceMemoryStoreModel.create({})

    store.recordCompletedWorkout({
      completedAt: new Date("2025-01-01T00:00:00Z"),
      exercises: [
        {
          exerciseId: "bench-press",
          category: "STRENGTH",
          sets: [{ setType: "working", weight: 100, reps: 5 }],
        },
      ],
    })

    store.recordCompletedWorkout({
      completedAt: new Date("2025-01-01T00:00:10Z"),
      exercises: [
        {
          exerciseId: "bench-press",
          category: "STRENGTH",
          sets: [{ setType: "working", weight: 120, reps: 3 }],
        },
      ],
    })

    store.recordCompletedWorkout({
      completedAt: new Date("2025-01-01T00:00:20Z"),
      exercises: [
        {
          exerciseId: "bench-press",
          category: "STRENGTH",
          sets: [{ setType: "working", reps: 8 }],
        },
      ],
    })

    store.recordCompletedWorkout({
      completedAt: new Date("2025-01-01T00:00:30Z"),
      exercises: [
        {
          exerciseId: "bench-press",
          category: "STRENGTH",
          sets: [{ setType: "working", time: 60, distance: 1.5 }],
        },
      ],
    })

    const pr = store.getPersonalRecord("bench-press")
    expect(pr?.maxWeight).toBe(120)
    expect(pr?.maxReps).toBe(8)
    expect(pr?.maxTime).toBe(60)
    expect(pr?.maxDistance).toBe(1.5)
    expect(pr?.updatedAt.toISOString()).toBe("2025-01-01T00:00:30.000Z")
  })

  it("stores last non-empty note per exercise", () => {
    const store = PerformanceMemoryStoreModel.create({})

    store.recordCompletedWorkout({
      completedAt: new Date("2025-01-01T00:00:00Z"),
      exercises: [
        {
          exerciseId: "bench-press",
          category: "STRENGTH",
          sets: [],
          notes: "Keep elbows tucked",
        },
      ],
    })

    expect(store.getPreviousNotes("bench-press")).toBe("Keep elbows tucked")

    // Whitespace updates must not overwrite.
    store.recordCompletedWorkout({
      completedAt: new Date("2025-01-01T00:00:10Z"),
      exercises: [
        {
          exerciseId: "bench-press",
          category: "STRENGTH",
          sets: [],
          notes: "   ",
        },
      ],
    })

    expect(store.getPreviousNotes("bench-press")).toBe("Keep elbows tucked")
  })
})
