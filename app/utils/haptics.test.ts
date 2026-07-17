import { Platform, Vibration } from "react-native"
import * as Haptics from "expo-haptics"

import { playSetCompletedHaptic } from "./haptics"

describe("playSetCompletedHaptic", () => {
  const originalPlatform = Platform.OS

  beforeEach(() => {
    jest.spyOn(Vibration, "vibrate").mockImplementation(() => undefined)
    jest.mocked(Vibration.vibrate).mockClear()
    jest.mocked(Haptics.notificationAsync).mockClear()
  })

  afterEach(() => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: originalPlatform })
    jest.restoreAllMocks()
  })

  it("plays a short hardware vibration on Android", () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "android" })

    playSetCompletedHaptic()

    expect(Vibration.vibrate).toHaveBeenCalledWith(60)
    expect(Haptics.notificationAsync).not.toHaveBeenCalled()
  })

  it("plays native success feedback on iOS", () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" })

    playSetCompletedHaptic()

    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success)
    expect(Vibration.vibrate).not.toHaveBeenCalled()
  })
})
