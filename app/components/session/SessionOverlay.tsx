import { useState } from "react"
import { View, ViewStyle } from "react-native"
import { useNavigation, CommonActions } from "@react-navigation/native"
import { observer } from "mobx-react-lite"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { useSessionTimer } from "@/hooks/useSessionTimer"
import { useStores } from "@/models/RootStoreContext"

import { SessionDiscardModal } from "./SessionDiscardModal"
import { SessionOverlayBar } from "./SessionOverlayBar"

export const SessionOverlay = observer(function SessionOverlay() {
  const { workoutStore } = useStores()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()

  const session = workoutStore.currentSession
  const duration = useSessionTimer(session?.startedAt)
  const [showDiscardModal, setShowDiscardModal] = useState(false)

  if (!session) return null

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
      <View style={[$overlay, { bottom: bottomOffset }]}>
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
