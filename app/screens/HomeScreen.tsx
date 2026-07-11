import { FC } from "react"
import { Pressable, TextStyle, View, ViewStyle } from "react-native"
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs"
import { format } from "date-fns/format"
import { observer } from "mobx-react-lite"

import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useStores } from "@/models/RootStoreContext"
import type { AppStackParamList, HomeStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 })

function getStartOfCurrentWeek(now: Date): number {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start.getTime()
}

function formatDuration(startedAt: Date, completedAt?: Date): string {
  if (!completedAt) return "In progress"
  const minutes = Math.max(1, Math.round((completedAt.getTime() - startedAt.getTime()) / 60000))
  return `${minutes} min`
}

export const HomeScreen: FC<HomeStackScreenProps<"HomeTab">> = observer(function HomeScreen({
  navigation,
}) {
  const { themed, theme } = useAppTheme()
  const { exerciseStore, performanceMemoryStore, workoutStore } = useStores()
  const now = new Date()
  const weekStart = getStartOfCurrentWeek(now)
  const history = [...workoutStore.sessionHistory]
    .filter((session) =>
      session.exercises.some((exercise) => exercise.sets.some((set) => set.isDone)),
    )
    .sort(
      (a, b) =>
        (b.completedAt?.getTime() ?? b.startedAt.getTime()) -
        (a.completedAt?.getTime() ?? a.startedAt.getTime()),
    )

  let totalVolume = 0
  let totalMinutes = 0
  for (const session of history) {
    if (session.completedAt) {
      totalMinutes += Math.max(
        0,
        Math.round((session.completedAt.getTime() - session.startedAt.getTime()) / 60000),
      )
    }

    for (const exercise of session.exercises) {
      for (const set of exercise.sets) {
        if (set.isDone) totalVolume += (set.weight ?? 0) * (set.reps ?? 0)
      }
    }
  }

  const workoutsThisWeek = history.filter(
    (session) => (session.completedAt?.getTime() ?? 0) >= weekStart,
  ).length
  const recentSessions = history.slice(0, 5)
  const personalRecordCount = performanceMemoryStore.personalRecords.size

  function openActiveWorkout() {
    navigation
      .getParent<BottomTabNavigationProp<AppStackParamList>>()
      ?.navigate("Workout", { screen: "ActiveWorkout" })
  }

  function handleStartWorkout() {
    if (!workoutStore.currentSession && !workoutStore.startNewSession()) return
    openActiveWorkout()
  }

  return (
    <Screen preset="scroll" safeAreaEdges={["top"]} contentContainerStyle={themed($screenContent)}>
      <View style={themed($header)}>
        <View>
          <Text preset="heading" style={themed($headerTitle)}>
            Fitness Tracker
          </Text>
          <Text text={format(now, "EEEE, MMMM d")} size="sm" style={themed($subtitleText)} />
        </View>
      </View>

      <View style={themed($content)}>
        {workoutStore.currentSession ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Resume active workout"
            testID="home-resume-workout"
            onPress={openActiveWorkout}
            style={themed($activeWorkout)}
          >
            <View style={themed($activeWorkoutCopy)}>
              <Text text="Workout in progress" preset="subheading" style={themed($activeTitle)} />
              <Text
                text={`${workoutStore.completedSetsCount} of ${workoutStore.totalSetsCount} sets complete`}
                size="sm"
                style={themed($activeSubtitle)}
              />
            </View>
            <Icon icon="caretRight" size={20} color={theme.colors.palette.neutral900} />
          </Pressable>
        ) : (
          <View style={themed($welcomeSection)}>
            <Text preset="subheading" style={themed($welcomeText)}>
              Ready to train?
            </Text>
            <Text style={themed($subtitleText)}>
              Start a session or continue from one of your routines.
            </Text>
            <Button
              text="Start workout"
              preset="filled"
              testID="home-start-workout"
              onPress={handleStartWorkout}
              style={themed($startButton)}
            />
          </View>
        )}

        <View style={themed($section)}>
          <Text weight="semiBold" size="lg" style={themed($sectionTitle)}>
            Training summary
          </Text>

          <View style={themed($statsBand)}>
            <View style={$statItem}>
              <Text
                testID="home-total-workouts"
                text={history.length.toString()}
                weight="bold"
                size="xl"
                style={themed($statValue)}
              />
              <Text text="Workouts" size="sm" style={themed($statLabel)} />
            </View>

            <View style={themed($statDivider)} />
            <View style={$statItem}>
              <Text
                testID="home-week-workouts"
                text={workoutsThisWeek.toString()}
                weight="bold"
                size="xl"
                style={themed($statValue)}
              />
              <Text text="This week" size="sm" style={themed($statLabel)} />
            </View>

            <View style={themed($statDivider)} />
            <View style={$statItem}>
              <Text
                testID="home-total-volume"
                text={numberFormatter.format(totalVolume)}
                weight="bold"
                size="xl"
                style={themed($statValue)}
              />
              <Text text="Volume (kg)" size="sm" style={themed($statLabel)} />
            </View>

            <View style={themed($statDivider)} />
            <View style={$statItem}>
              <Text
                testID="home-total-minutes"
                text={numberFormatter.format(totalMinutes)}
                weight="bold"
                size="xl"
                style={themed($statValue)}
              />
              <Text text="Minutes" size="sm" style={themed($statLabel)} />
            </View>
          </View>

          <Text
            text={`${personalRecordCount} ${personalRecordCount === 1 ? "exercise" : "exercises"} with personal records`}
            size="sm"
            style={themed($summaryFootnote)}
          />
        </View>

        <View style={themed($section)}>
          <Text weight="semiBold" size="lg" style={themed($sectionTitle)}>
            Recent workouts
          </Text>

          {recentSessions.length === 0 ? (
            <View style={themed($emptyHistory)}>
              <Icon icon="check" size={28} color={theme.colors.textDim} />
              <View style={themed($emptyHistoryCopy)}>
                <Text text="No completed workouts yet" weight="semiBold" />
                <Text
                  text="Your latest sessions and training volume will appear here."
                  size="sm"
                  style={themed($subtitleText)}
                />
              </View>
            </View>
          ) : (
            <View style={themed($historyList)}>
              {recentSessions.map((session) => {
                const completedSets = session.exercises.reduce(
                  (sum, exercise) => sum + exercise.sets.filter((set) => set.isDone).length,
                  0,
                )
                const volume = session.exercises.reduce(
                  (sum, exercise) =>
                    sum +
                    exercise.sets.reduce(
                      (setTotal, set) =>
                        setTotal + (set.isDone ? (set.weight ?? 0) * (set.reps ?? 0) : 0),
                      0,
                    ),
                  0,
                )
                const exerciseNames = session.exercises
                  .slice(0, 3)
                  .map((exercise) => exerciseStore.getExercise(exercise.exerciseId)?.name)
                  .filter((name): name is string => !!name)
                  .join(", ")
                const templateName = session.templateId
                  ? workoutStore.templates.get(session.templateId)?.name
                  : undefined

                return (
                  <View key={session.id} style={themed($historyCard)}>
                    <View style={themed($historyHeader)}>
                      <View style={themed($historyTitleGroup)}>
                        <Text text={templateName ?? "Workout"} weight="semiBold" />
                        <Text
                          text={format(session.completedAt ?? session.startedAt, "MMM d, yyyy")}
                          size="xs"
                          style={themed($subtitleText)}
                        />
                      </View>
                      <Text
                        text={formatDuration(session.startedAt, session.completedAt)}
                        size="sm"
                        weight="semiBold"
                        style={themed($historyDuration)}
                      />
                    </View>
                    <Text
                      text={exerciseNames || "No exercises recorded"}
                      size="sm"
                      numberOfLines={2}
                      style={themed($subtitleText)}
                    />
                    <View style={themed($historyMetrics)}>
                      <Text
                        text={`${completedSets} ${completedSets === 1 ? "set" : "sets"}`}
                        size="xs"
                      />
                      <Text text={`${numberFormatter.format(volume)} kg`} size="xs" />
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </View>
      </View>
    </Screen>
  )
})

const $screenContent: ThemedStyle<ViewStyle> = () => ({
  flexGrow: 1,
})

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  backgroundColor: colors.background,
  borderBottomWidth: 1,
  borderBottomColor: colors.separator,
})

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.lg,
  paddingBottom: spacing.xxl,
  gap: spacing.xl,
})

const $welcomeSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $welcomeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $subtitleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $startButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
  borderRadius: 8,
  marginTop: 4,
})

const $activeWorkout: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  backgroundColor: colors.tint,
  borderRadius: 8,
  flexDirection: "row",
  justifyContent: "space-between",
  minHeight: 88,
  padding: spacing.lg,
})

const $activeWorkoutCopy: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  gap: spacing.xs,
})

const $activeTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral900,
})

const $activeSubtitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral800,
})

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.md,
})

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $statsBand: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "stretch",
  backgroundColor: colors.card,
  borderColor: colors.separator,
  borderRadius: 8,
  borderWidth: 1,
  flexDirection: "row",
  minHeight: 88,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.md,
})

const $statItem: ViewStyle = {
  alignItems: "center",
  flex: 1,
  justifyContent: "center",
  gap: 2,
}

const $statDivider: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.separator,
  width: 1,
})

const $statValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 20,
})

const $statLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 11,
  textAlign: "center",
})

const $summaryFootnote: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $emptyHistory: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  borderColor: colors.separator,
  borderRadius: 8,
  borderWidth: 1,
  flexDirection: "row",
  gap: spacing.md,
  padding: spacing.lg,
})

const $emptyHistoryCopy: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  gap: spacing.xs,
})

const $historyList: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
})

const $historyCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderColor: colors.separator,
  borderRadius: 8,
  borderWidth: 1,
  gap: spacing.sm,
  padding: spacing.md,
})

const $historyHeader: ThemedStyle<ViewStyle> = () => ({
  alignItems: "flex-start",
  flexDirection: "row",
  justifyContent: "space-between",
})

const $historyTitleGroup: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  gap: spacing.xs,
})

const $historyDuration: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})

const $historyMetrics: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderTopColor: colors.separator,
  borderTopWidth: 1,
  flexDirection: "row",
  gap: spacing.lg,
  paddingTop: spacing.sm,
})
