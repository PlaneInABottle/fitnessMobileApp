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
import { openLinkInBrowser } from "@/utils/openLinkInBrowser"

const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 })
const privacyPolicyUrl = "https://planeinabottle.github.io/fitnessMobileApp/privacy/"
const supportUrl = "https://planeinabottle.github.io/fitnessMobileApp/support/"

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
    navigation.getParent<BottomTabNavigationProp<AppStackParamList>>()?.navigate("Workout", {
      screen: "ExerciseLibrary",
      params: { newWorkout: true, returnToHome: true },
    })
  }

  function browseExercises() {
    navigation.getParent<BottomTabNavigationProp<AppStackParamList>>()?.navigate("Workout", {
      screen: "ExerciseLibrary",
      params: { browseOnly: true, returnToHome: true },
    })
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
            <Button text="Browse exercises" onPress={browseExercises} />
          </View>
        )}

        <View style={themed($section)}>
          <Text weight="semiBold" size="lg" style={themed($sectionTitle)}>
            Training summary
          </Text>

          <View style={themed($statsBand)}>
            <View style={$statsRow}>
              <View style={$statItem}>
                <Text
                  testID="home-total-workouts"
                  text={history.length.toString()}
                  weight="bold"
                  size="lg"
                  style={themed($statValue)}
                />
                <Text text="Workouts" size="xxs" style={themed($statLabel)} />
              </View>
              <View style={themed($statDivider)} />
              <View style={$statItem}>
                <Text
                  testID="home-week-workouts"
                  text={workoutsThisWeek.toString()}
                  weight="bold"
                  size="lg"
                  style={themed($statValue)}
                />
                <Text text="This week" size="xxs" style={themed($statLabel)} />
              </View>
            </View>
            <View style={themed($statsRowDivider)} />
            <View style={$statsRow}>
              <View style={$statItem}>
                <Text
                  testID="home-total-volume"
                  text={numberFormatter.format(totalVolume)}
                  weight="bold"
                  size="lg"
                  style={themed($statValue)}
                />
                <Text text="Volume (kg)" size="xxs" style={themed($statLabel)} />
              </View>
              <View style={themed($statDivider)} />
              <View style={$statItem}>
                <Text
                  testID="home-total-minutes"
                  text={numberFormatter.format(totalMinutes)}
                  weight="bold"
                  size="lg"
                  style={themed($statValue)}
                />
                <Text text="Minutes" size="xxs" style={themed($statLabel)} />
              </View>
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
                  <Pressable
                    key={session.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${templateName ?? "workout"} from ${format(
                      session.completedAt ?? session.startedAt,
                      "MMMM d, yyyy",
                    )}`}
                    testID={`workout-history-${session.id}`}
                    onPress={() => navigation.navigate("WorkoutHistory", { sessionId: session.id })}
                    style={({ pressed }) => [
                      themed($historyCard),
                      pressed && themed($historyCardPressed),
                    ]}
                  >
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
                  </Pressable>
                )
              })}
            </View>
          )}
        </View>

        <View style={themed($legalFooter)}>
          <Text
            text="Workout data is stored only on this device."
            size="sm"
            style={themed($subtitleText)}
          />
          <View style={themed($legalLinks)}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Open privacy policy"
              testID="home-privacy-policy"
              onPress={() => openLinkInBrowser(privacyPolicyUrl)}
              style={({ pressed }) => [themed($legalLink), pressed && $legalLinkPressed]}
            >
              <Text
                text="Privacy policy"
                size="sm"
                weight="semiBold"
                style={themed($legalLinkText)}
              />
            </Pressable>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Open support website"
              testID="home-support"
              onPress={() => openLinkInBrowser(supportUrl)}
              style={({ pressed }) => [themed($legalLink), pressed && $legalLinkPressed]}
            >
              <Text text="Support" size="sm" weight="semiBold" style={themed($legalLinkText)} />
            </Pressable>
          </View>
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

const $welcomeSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderColor: colors.separator,
  borderRadius: 12,
  borderWidth: 1,
  gap: spacing.sm,
  padding: spacing.lg,
})

const $welcomeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $subtitleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $startButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
  borderRadius: 12,
  marginTop: 4,
})

const $activeWorkout: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  backgroundColor: colors.tint,
  borderRadius: 12,
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
  backgroundColor: colors.card,
  borderColor: colors.separator,
  borderRadius: 12,
  borderWidth: 1,
  minHeight: 164,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
})

const $statsRow: ViewStyle = {
  flex: 1,
  flexDirection: "row",
}

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

const $statsRowDivider: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.separator,
  height: 1,
})

const $statValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $statLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  textAlign: "center",
})

const $summaryFootnote: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $emptyHistory: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  borderColor: colors.separator,
  borderRadius: 12,
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
  borderRadius: 12,
  borderWidth: 1,
  gap: spacing.sm,
  padding: spacing.md,
})

const $historyCardPressed: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.cardSecondary,
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

const $legalFooter: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderTopColor: colors.separator,
  borderTopWidth: 1,
  gap: spacing.xs,
  paddingTop: spacing.lg,
})

const $legalLinks: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.md,
})

const $legalLink: ThemedStyle<ViewStyle> = () => ({
  justifyContent: "center",
  minHeight: 44,
})

const $legalLinkPressed: ViewStyle = {
  opacity: 0.7,
}

const $legalLinkText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
})
