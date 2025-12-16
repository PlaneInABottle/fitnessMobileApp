import { NavigationContainer } from "@react-navigation/native"
import { render } from "@testing-library/react-native"

import { WorkoutStatsBar } from "../WorkoutStatsBar"
import { ThemeProvider } from "../../theme/context"

function renderWorkoutStatsBar(props: {
  timeSeconds: number
  volumeKg: number
  setsCount: number
}) {
  return render(
    <ThemeProvider>
      <NavigationContainer>
        <WorkoutStatsBar {...props} />
      </NavigationContainer>
    </ThemeProvider>,
  )
}

describe("WorkoutStatsBar", () => {
  describe("time formatting", () => {
    it("formats seconds only as 0:SS", () => {
      const { getByText } = renderWorkoutStatsBar({
        timeSeconds: 45,
        volumeKg: 0,
        setsCount: 0,
      })

      expect(getByText("0:45")).toBeTruthy()
    })

    it("formats minutes and seconds as M:SS", () => {
      const { getByText } = renderWorkoutStatsBar({
        timeSeconds: 125,
        volumeKg: 0,
        setsCount: 0,
      })

      expect(getByText("2:05")).toBeTruthy()
    })

    it("formats hours, minutes and seconds as H:MM:SS", () => {
      const { getByText } = renderWorkoutStatsBar({
        timeSeconds: 3665, // 1 hour, 1 minute, 5 seconds
        volumeKg: 0,
        setsCount: 0,
      })

      expect(getByText("1:01:05")).toBeTruthy()
    })

    it("handles zero time", () => {
      const { getByText } = renderWorkoutStatsBar({
        timeSeconds: 0,
        volumeKg: 0,
        setsCount: 0,
      })

      expect(getByText("0:00")).toBeTruthy()
    })
  })

  describe("volume display", () => {
    it("displays volume in kg", () => {
      const { getByText } = renderWorkoutStatsBar({
        timeSeconds: 0,
        volumeKg: 1500,
        setsCount: 0,
      })

      expect(getByText("1,500 kg")).toBeTruthy()
    })

    it("displays zero volume", () => {
      const { getByText } = renderWorkoutStatsBar({
        timeSeconds: 0,
        volumeKg: 0,
        setsCount: 0,
      })

      expect(getByText("0 kg")).toBeTruthy()
    })

    it("formats large volumes with locale separators", () => {
      const { getByText } = renderWorkoutStatsBar({
        timeSeconds: 0,
        volumeKg: 10000,
        setsCount: 0,
      })

      expect(getByText("10,000 kg")).toBeTruthy()
    })
  })

  describe("sets count display", () => {
    it("displays sets count", () => {
      const { getByText } = renderWorkoutStatsBar({
        timeSeconds: 0,
        volumeKg: 0,
        setsCount: 12,
      })

      expect(getByText("12")).toBeTruthy()
    })

    it("displays zero sets", () => {
      const { getByText } = renderWorkoutStatsBar({
        timeSeconds: 0,
        volumeKg: 0,
        setsCount: 0,
      })

      // There should be a "0" text for sets count
      const zeroTexts = getByText("0")
      expect(zeroTexts).toBeTruthy()
    })
  })

  describe("labels", () => {
    it("displays Turkish labels", () => {
      const { getByText } = renderWorkoutStatsBar({
        timeSeconds: 60,
        volumeKg: 100,
        setsCount: 5,
      })

      expect(getByText("Süre")).toBeTruthy()
      expect(getByText("Hacim")).toBeTruthy()
      expect(getByText("Sets")).toBeTruthy()
    })
  })
})
