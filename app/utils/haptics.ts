import { Platform, Vibration } from "react-native"
import * as Haptics from "expo-haptics"

/**
 * Confirms a completed set without delaying the state update or blocking devices
 * that do not expose a compatible haptics engine.
 */
export function playSetCompletedHaptic(): void {
  // Some Android devices expose a vibrator but no haptic engine, making
  // semantic feedback such as `Confirm` imperceptible or a no-op.
  if (Platform.OS === "android") {
    Vibration.vibrate(60)
    return
  }

  const feedback = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

  void feedback.catch(() => undefined)
}
