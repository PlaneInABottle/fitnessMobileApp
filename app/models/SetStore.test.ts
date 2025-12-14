import { RootStoreModel } from "./RootStore"

describe("SetStore", () => {
  it("validates strength sets require weight + reps", () => {
    const root = RootStoreModel.create({})
    expect(root.setStore.validateSetData("bench-press", { setType: "working", weight: 100, reps: 5 }).ok).toBe(
      true,
    )
    expect(root.setStore.validateSetData("bench-press", { setType: "working", reps: 5 }).ok).toBe(false)
  })

  it("enforces numeric ranges for required and optional fields", () => {
    const root = RootStoreModel.create({})

    expect(root.setStore.validateSetData("bench-press", { setType: "working", weight: 501, reps: 5 }).ok).toBe(
      false,
    )
    expect(root.setStore.validateSetData("bench-press", { setType: "working", weight: 100, reps: 101 }).ok).toBe(
      false,
    )

    expect(
      root.setStore.validateSetData("bench-press", { setType: "working", weight: 100, reps: 5, restTime: 3601 }).ok,
    ).toBe(false)

    expect(
      root.setStore.validateSetData("bench-press", { setType: "working", weight: 100, reps: 5, restTime: 60 }).ok,
    ).toBe(true)
  })

  it("validates bodyweight sets require reps", () => {
    const root = RootStoreModel.create({})
    expect(root.setStore.validateSetData("pull-up", { setType: "working", reps: 10 }).ok).toBe(true)
    expect(root.setStore.validateSetData("pull-up", { setType: "working" }).ok).toBe(false)
  })

  it("validates timed sets require time", () => {
    const root = RootStoreModel.create({})
    expect(root.setStore.validateSetData("plank", { setType: "warmup", time: 60 }).ok).toBe(true)
    expect(root.setStore.validateSetData("plank", { setType: "warmup" }).ok).toBe(false)
  })

  it("validates cardio sets require time", () => {
    const root = RootStoreModel.create({})
    expect(root.setStore.validateSetData("running", { setType: "working", time: 600 }).ok).toBe(true)
    expect(root.setStore.validateSetData("running", { setType: "working" }).ok).toBe(false)
  })
})
