import { useState, useEffect } from "react"
import { View, ViewStyle } from "react-native"
import { useNavigation, CommonActions } from "@react-navigation/native"
import { observer } from "mobx-react-lite"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useSessionTimer } from "@/hooks/useSessionTimer"
import { useStores } from "@/models/RootStoreContext"
import { navigationRef, getActiveRouteName } from "@/navigators/navigationUtilities"

import { SessionDiscardModal } from "./SessionDiscardModal"
import { SessionOverlayBar } from "./SessionOverlayBar"

/** Routes where the overlay should be hidden (user is actively in workout flow) */
const OVERLAY_HIDDEN_ROUTES = ["ActiveWorkout", "ExerciseLibrary", "WorkoutComplete"]

export const SessionOverlay = observer(function SessionOverlay() {
  const { workoutStore } = useStores()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()

  const session = workoutStore.currentSession
  const duration = useSessionTimer(session?.startedAt)
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [currentRoute, setCurrentRoute] = useState<string>("")

  useEffect(() => {
    function updateCurrentRoute() {
      if (navigationRef.isReady()) {
        const route = getActiveRouteName(navigationRef.getRootState())
        setCurrentRoute(route)
      }
    }

    // Get initial route
    updateCurrentRoute()

    // Subscribe to navigation state changes
    const unsubscribe = navigationRef.addListener("state", updateCurrentRoute)

    return unsubscribe
  }, [])

  if (!session) return null
  if (OVERLAY_HIDDEN_ROUTES.includes(currentRoute)) return null

  const exerciseCount = session.exercises.length

  function handleContinue() {
    navigation.dispatch(
      CommonActions.navigate({
        name: "Workout",
        params: {
          screen: "ActiveWorkout",
        },
      }),
    )
  }

  function handleDiscard() {
    setShowDiscardModal(true)
  }

  function handleConfirmDiscard() {
    workoutStore.discardSession()
    setShowDiscardModal(false)
  }

  function handleCancelDiscard() {
    setShowDiscardModal(false)
  }

  const bottomOffset = 49 + insets.bottom

  return (
    <>
      <View style={[$overlay, { bottom: bottomOffset }]} pointerEvents="box-none">
        <SessionOverlayBar
          duration={duration}
          exerciseCount={exerciseCount}
          onContinue={handleContinue}
          onDiscard={handleDiscard}
        />
      </View>
      <SessionDiscardModal
        visible={showDiscardModal}
        onConfirm={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
      />
    </>
  )
})

const $overlay: ViewStyle = {
  position: "absolute",
  left: 0,
  right: 0,
  zIndex: 100,
}
