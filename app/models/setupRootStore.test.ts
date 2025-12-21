import { getSnapshot } from "mobx-state-tree"

import { RootStoreModel } from "./RootStore"

describe("setupRootStore persistence", () => {
  it("does not include pendingRoutineExerciseId in workoutStore snapshot", () => {
    const root = RootStoreModel.create({})
    root.workoutStore.setPendingRoutineExerciseId("deadlift")

    const snapshot = getSnapshot(root.workoutStore) as any
    expect(snapshot.pendingRoutineExerciseId).toBeUndefined()
    expect("pendingRoutineExerciseId" in snapshot).toBe(false)
  })

  it("drops pendingRoutineExerciseId when restoring an old persisted snapshot", async () => {
    const baseline = getSnapshot(RootStoreModel.create({})) as any
    baseline.workoutStore = {
      ...baseline.workoutStore,
      pendingRoutineExerciseId: "deadlift",
    }

    const loadMock = jest.fn().mockReturnValue(baseline)
    const removeMock = jest.fn()

    const secureLoadMock = jest.fn().mockReturnValue(null)

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {})
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {})

    try {
      jest.resetModules()
      jest.doMock("@/utils/storage", () => ({
        load: loadMock,
        save: jest.fn(),
        remove: removeMock,
      }))
      jest.doMock("@/utils/storage/secure", () => ({
        load: secureLoadMock,
        save: jest.fn(),
        remove: jest.fn(),
      }))

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { setupRootStore } = require("./setupRootStore")
      const { rootStore, dispose } = await setupRootStore()

      try {
        expect((rootStore as any).workoutStore.pendingRoutineExerciseId).toBeUndefined()
        expect(removeMock).not.toHaveBeenCalled()
      } finally {
        dispose()
      }
    } finally {
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    }
  })
})
