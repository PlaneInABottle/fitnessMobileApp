import { Platform } from "react-native"
import * as Haptics from "expo-haptics"

/**
 * Confirms a completed set without delaying the state update or blocking devices
 * that do not expose a compatible haptics engine.
 */
export function playSetCompletedHaptic(): void {
  const feedback =
    Platform.OS === "android"
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm)
      : Haptics.selectionAsync()

  void feedback.catch(() => undefined)
}
