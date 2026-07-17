import { FC, useMemo } from "react"
import { TextStyle, View, ViewStyle } from "react-native"
import { format } from "date-fns/format"
import { observer } from "mobx-react-lite"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { WorkoutHeader } from "@/components/workout/WorkoutHeader"
import { useStores } from "@/models/RootStoreContext"
import type { ExerciseSet } from "@/models/WorkoutStore"
import type { HomeStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 })

const SET_LABELS = {
  dropset: "Drop",
  failure: "Failure",
  warmup: "Warm-up",
  working: "Working",
} as const

function formatDuration(startedAt: Date, completedAt?: Date): string {
  if (!completedAt) return "In progress"
  const minutes = Math.max(1, Math.round((completedAt.getTime() - startedAt.getTime()) / 60000))
  return `${minutes} min`
}

function formatSet(set: ExerciseSet): string {
  const values: string[] = []
  if (set.weight !== undefined) values.push(`${numberFormatter.format(set.weight)} kg`)
  if (set.reps !== undefined) values.push(`${numberFormatter.format(set.reps)} reps`)
  if (set.time !== undefined) {
    values.push(set.time >= 60 ? `${numberFormatter.format(set.time / 60)} min` : `${set.time} sec`)
  }
  if (set.distance !== undefined) {
    values.push(
      set.distance >= 1000
        ? `${numberFormatter.format(set.distance / 1000)} km`
        : `${numberFormatter.format(set.distance)} m`,
    )
  }
  return values.join(" · ") || "Completed"
}

export const WorkoutHistoryScreen: FC<HomeStackScreenProps<"WorkoutHistory">> = observer(
  function WorkoutHistoryScreen({ navigation, route }) {
    const { exerciseStore, workoutStore } = useStores()
    const { themed } = useAppTheme()
    const session = workoutStore.sessionHistory.find((item) => item.id === route.params.sessionId)

    const summary = useMemo(() => {
      if (!session) return { completedSets: 0, totalVolume: 0 }
      let completedSets = 0
      let totalVolume = 0
      for (const exercise of session.exercises) {
        for (const set of exercise.sets) {
          if (!set.isDone) continue
          completedSets++
          totalVolume += (set.weight ?? 0) * (set.reps ?? 0)
        }
      }
      return { completedSets, totalVolume }
    }, [session])

    return (
      <Screen preset="scroll" safeAreaEdges={["top", "bottom"]}>
        <WorkoutHeader
          title="Workout details"
          leftActionLabel="Back"
          onLeftActionPress={navigation.goBack}
        />

        <View style={themed($content)}>
          {!session ? (
            <View style={themed($empty)}>
              <Text text="Workout not found" preset="subheading" />
              <Text text="This workout is no longer available." style={themed($muted)} />
            </View>
          ) : (
            <>
              <View style={themed($summary)}>
                <Text
                  text={format(session.completedAt ?? session.startedAt, "EEEE, MMMM d, yyyy")}
                  preset="subheading"
                />
                <Text text={format(session.startedAt, "h:mm a")} size="sm" style={themed($muted)} />
                <View style={themed($stats)}>
                  <View style={$stat}>
                    <Text
                      text={formatDuration(session.startedAt, session.completedAt)}
                      preset="bold"
                    />
                    <Text text="Duration" size="xs" style={themed($muted)} />
                  </View>
                  <View style={themed($divider)} />
                  <View style={$stat}>
                    <Text text={summary.completedSets.toString()} preset="bold" />
                    <Text text="Sets" size="xs" style={themed($muted)} />
                  </View>
                  <View style={themed($divider)} />
                  <View style={$stat}>
                    <Text
                      text={`${numberFormatter.format(summary.totalVolume)} kg`}
                      preset="bold"
                    />
                    <Text text="Volume" size="xs" style={themed($muted)} />
                  </View>
                </View>
              </View>

              <View style={themed($exerciseList)}>
                {session.exercises.map((workoutExercise) => {
                  const exercise = exerciseStore.getExercise(workoutExercise.exerciseId)
                  const completedSets = workoutExercise.sets.filter((set) => set.isDone)
                  if (completedSets.length === 0) return null

                  return (
                    <View key={workoutExercise.id} style={themed($exerciseCard)}>
                      <View style={themed($exerciseHeader)}>
                        <Text text={exercise?.name ?? "Unknown exercise"} preset="subheading" />
                        <Text
                          text={exercise?.category ?? "Exercise"}
                          size="xs"
                          style={themed($muted)}
                        />
                      </View>
                      {completedSets.map((set, index) => (
                        <View key={set.id} style={themed($setRow)}>
                          <View style={themed($setIndex)}>
                            <Text text={(index + 1).toString()} size="xs" preset="bold" />
                          </View>
                          <View style={$setCopy}>
                            <Text text={formatSet(set)} preset="bold" size="sm" />
                            <Text text={SET_LABELS[set.setType]} size="xs" style={themed($muted)} />
                          </View>
                        </View>
                      ))}
                    </View>
                  )
                })}
              </View>
            </>
          )}
        </View>
      </Screen>
    )
  },
)

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.lg,
  padding: spacing.lg,
  paddingBottom: spacing.xxl,
})

const $summary: ThemedStyle<ViewStyle> = ({ spacing }) => ({ gap: spacing.xs })

const $stats: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "stretch",
  backgroundColor: colors.card,
  borderColor: colors.separator,
  borderRadius: 8,
  borderWidth: 1,
  flexDirection: "row",
  marginTop: spacing.sm,
  minHeight: 76,
  paddingVertical: spacing.sm,
})

const $stat: ViewStyle = { alignItems: "center", flex: 1, justifyContent: "center" }

const $divider: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.separator,
  width: 1,
})

const $exerciseList: ThemedStyle<ViewStyle> = ({ spacing }) => ({ gap: spacing.md })

const $exerciseCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderColor: colors.separator,
  borderRadius: 8,
  borderWidth: 1,
  overflow: "hidden",
  padding: spacing.md,
})

const $exerciseHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xxs,
  paddingBottom: spacing.sm,
})

const $setRow: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  borderTopColor: colors.separator,
  borderTopWidth: 1,
  flexDirection: "row",
  gap: spacing.sm,
  minHeight: 56,
  paddingVertical: spacing.sm,
})

const $setIndex: ThemedStyle<ViewStyle> = ({ colors }) => ({
  alignItems: "center",
  backgroundColor: colors.cardSecondary,
  borderRadius: 8,
  height: 32,
  justifyContent: "center",
  width: 32,
})

const $setCopy: ViewStyle = { flex: 1 }

const $empty: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderColor: colors.separator,
  borderRadius: 8,
  borderWidth: 1,
  gap: spacing.xs,
  padding: spacing.lg,
})

const $muted: ThemedStyle<TextStyle> = ({ colors }) => ({ color: colors.textDim })
