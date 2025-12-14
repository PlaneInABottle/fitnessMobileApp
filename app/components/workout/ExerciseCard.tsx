import { ViewStyle } from "react-native"

import type { Exercise } from "@/models/ExerciseStore"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

import { Card } from "../Card"
import { Text } from "../Text"

export interface ExerciseCardProps {
  exercise: Exercise
}

export function ExerciseCard({ exercise }: ExerciseCardProps) {
  const { themed } = useAppTheme()

  const muscles = exercise.muscleGroups.length ? exercise.muscleGroups.join(", ") : "—"

  return (
    <Card
      heading={exercise.name}
      ContentComponent={
        <>
          <Text text={`Category: ${exercise.category}`} style={themed($line)} />
          <Text text={`Muscles: ${muscles}`} style={themed($line)} />
        </>
      }
      style={themed($card)}
    />
  )
}

const $card: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
  minHeight: undefined,
})

const $line: ThemedStyle<any> = ({ colors }) => ({
  color: colors.textDim,
})
