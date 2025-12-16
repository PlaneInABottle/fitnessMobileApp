import { NavigationContainer } from "@react-navigation/native"
import { render, fireEvent } from "@testing-library/react-native"

import { RoutineCard } from "../RoutineCard"
import { ThemeProvider } from "../../theme/context"

function renderRoutineCard(props: {
  title: string
  exercisePreview: string
  onStart: jest.Mock
  onMenu?: jest.Mock
}) {
  return render(
    <ThemeProvider>
      <NavigationContainer>
        <RoutineCard {...props} />
      </NavigationContainer>
    </ThemeProvider>,
  )
}

describe("RoutineCard", () => {
  const mockOnStart = jest.fn()
  const mockOnMenu = jest.fn()

  beforeEach(() => {
    mockOnStart.mockClear()
    mockOnMenu.mockClear()
  })

  describe("rendering", () => {
    it("renders routine title", () => {
      const { getByText } = renderRoutineCard({
        title: "Push Day",
        exercisePreview: "Bench Press, Incline Dumbbell Press",
        onStart: mockOnStart,
      })

      expect(getByText("Push Day")).toBeTruthy()
    })

    it("renders exercise preview", () => {
      const { getByText } = renderRoutineCard({
        title: "Pull Day",
        exercisePreview: "Deadlift, Barbell Row, Lat Pulldown",
        onStart: mockOnStart,
      })

      expect(getByText("Deadlift, Barbell Row, Lat Pulldown")).toBeTruthy()
    })

    it("renders Start Routine button", () => {
      const { getByText } = renderRoutineCard({
        title: "Leg Day",
        exercisePreview: "Squat, Leg Press",
        onStart: mockOnStart,
      })

      expect(getByText("Start Routine")).toBeTruthy()
    })
  })

  describe("interactions", () => {
    it("calls onStart when Start Routine button is pressed", () => {
      const { getByText } = renderRoutineCard({
        title: "Upper Body",
        exercisePreview: "Exercises",
        onStart: mockOnStart,
      })

      fireEvent.press(getByText("Start Routine"))

      expect(mockOnStart).toHaveBeenCalledTimes(1)
    })

    it("calls onMenu when menu button is pressed", () => {
      const { getByLabelText } = renderRoutineCard({
        title: "Lower Body",
        exercisePreview: "Exercises",
        onStart: mockOnStart,
        onMenu: mockOnMenu,
      })

      fireEvent.press(getByLabelText("More options"))

      expect(mockOnMenu).toHaveBeenCalledTimes(1)
    })

    it("does not render menu button when onMenu is not provided", () => {
      const { queryByLabelText } = renderRoutineCard({
        title: "Core",
        exercisePreview: "Exercises",
        onStart: mockOnStart,
      })

      expect(queryByLabelText("More options")).toBeNull()
    })
  })

  describe("truncation", () => {
    it("handles long exercise preview text", () => {
      const longPreview =
        "Bench Press, Incline Dumbbell Press, Cable Flyes, Tricep Pushdown, Overhead Tricep Extension, Lateral Raises"

      const { getByText } = renderRoutineCard({
        title: "Full Workout",
        exercisePreview: longPreview,
        onStart: mockOnStart,
      })

      // Should render without error, text will be truncated by numberOfLines prop
      expect(getByText(longPreview)).toBeTruthy()
    })
  })
})
