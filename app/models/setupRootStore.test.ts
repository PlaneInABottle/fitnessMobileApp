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

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {})
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {})

    try {
      jest.resetModules()
      jest.doMock("@/utils/storage", () => ({
        load: loadMock,
        loadLegacySecure: jest.fn().mockReturnValue(null),
        save: jest.fn(),
        remove: removeMock,
        removeLegacySecure: jest.fn(),
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

  it("migrates legacy workout data without restoring fake authentication state", async () => {
    const legacyRoot = RootStoreModel.create({})
    legacyRoot.workoutStore.createTemplate("Legacy routine", [])
    const legacySnapshot = {
      ...(getSnapshot(legacyRoot) as any),
      authenticationStore: { accessToken: "fabricated-token" },
    }
    const saveMock = jest.fn()
    const removeLegacySecureMock = jest.fn()

    jest.resetModules()
    jest.doMock("@/utils/storage", () => ({
      load: jest.fn().mockReturnValue(null),
      loadLegacySecure: jest.fn().mockReturnValue(legacySnapshot),
      save: saveMock,
      remove: jest.fn(),
      removeLegacySecure: removeLegacySecureMock,
    }))

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setupRootStore } = require("./setupRootStore")
    const { rootStore, dispose } = await setupRootStore()

    try {
      expect(rootStore.workoutStore.templates.size).toBe(1)
      expect((rootStore as any).authenticationStore).toBeUndefined()
      expect(saveMock).toHaveBeenCalledWith(
        "ROOT_STORE",
        expect.not.objectContaining({ authenticationStore: expect.anything() }),
      )
      expect(removeLegacySecureMock).toHaveBeenCalledWith("ROOT_STORE_SECURE")
    } finally {
      dispose()
    }
  })

  it("ignores malformed persisted roots and starts with usable domain stores", async () => {
    jest.resetModules()
    jest.doMock("@/utils/storage", () => ({
      load: jest.fn().mockReturnValue(["invalid-root"]),
      loadLegacySecure: jest.fn().mockReturnValue(null),
      save: jest.fn(),
      remove: jest.fn(),
      removeLegacySecure: jest.fn(),
    }))

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setupRootStore } = require("./setupRootStore")
    const { rootStore, dispose } = await setupRootStore()

    try {
      expect(rootStore.exerciseStore).toBeDefined()
      expect(rootStore.workoutStore.templates.size).toBe(0)
    } finally {
      dispose()
    }
  })
})
