import { PerformanceMemoryStoreModel } from "./PerformanceMemoryStore"

describe("PerformanceMemoryStore", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("stores last 20 per setType and returns last 5 across set types sorted by performedAt desc", () => {
    const store = PerformanceMemoryStoreModel.create({})

    for (let i = 0; i < 25; i++) {
      jest.setSystemTime(new Date(`2025-01-01T00:00:${String(i).padStart(2, "0")}Z`))
      store.updateSetMemory("bench-press", "working", 0, { weight: 100 + i, reps: 5 })
    }

    const exerciseMemory = store.exerciseMemories.get("bench-press")
    expect(exerciseMemory?.setMemories.get("working")?.length).toBe(20)

    jest.setSystemTime(new Date("2025-01-01T00:01:00Z"))
    store.updateSetMemory("bench-press", "warmup", 0, { weight: 45, reps: 10 })

    jest.setSystemTime(new Date("2025-01-01T00:01:30Z"))
    store.updateSetMemory("bench-press", "warmup", 1, { weight: 65, reps: 8 })

    const memories = store.getSetMemories("bench-press")
    expect(memories).toHaveLength(5)
    expect(memories.map((m) => m.performedAt.toISOString())).toEqual([
      "2025-01-01T00:01:30.000Z",
      "2025-01-01T00:01:00.000Z",
      "2025-01-01T00:00:24.000Z",
      "2025-01-01T00:00:23.000Z",
      "2025-01-01T00:00:22.000Z",
    ])
  })

  it("tracks personal records per exercise", () => {
    const store = PerformanceMemoryStoreModel.create({})

    jest.setSystemTime(new Date("2025-01-01T00:00:00Z"))
    store.updateSetMemory("bench-press", "working", 0, { weight: 100, reps: 5 })

    jest.setSystemTime(new Date("2025-01-01T00:00:10Z"))
    store.updateSetMemory("bench-press", "working", 0, { weight: 120, reps: 3 })

    jest.setSystemTime(new Date("2025-01-01T00:00:20Z"))
    store.updateSetMemory("bench-press", "working", 0, { reps: 8 })

    jest.setSystemTime(new Date("2025-01-01T00:00:30Z"))
    store.updateSetMemory("bench-press", "working", 0, { time: 60, distance: 1.5 })

    const pr = store.getPersonalRecord("bench-press")
    expect(pr?.maxWeight).toBe(120)
    expect(pr?.maxReps).toBe(8)
    expect(pr?.maxTime).toBe(60)
    expect(pr?.maxDistance).toBe(1.5)
    expect(pr?.updatedAt.toISOString()).toBe("2025-01-01T00:00:30.000Z")
  })
})
