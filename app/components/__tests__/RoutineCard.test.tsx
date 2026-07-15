import { NavigationContainer } from "@react-navigation/native"
import { render, fireEvent } from "@testing-library/react-native"

import { ThemeProvider } from "../../theme/context"
import { RoutineCard } from "../RoutineCard"

function renderRoutineCard(props: {
  title: string
  exercisePreview: string
  onStart: jest.Mock
  onOpen?: jest.Mock
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
  const mockOnOpen = jest.fn()

  beforeEach(() => {
    mockOnStart.mockClear()
    mockOnOpen.mockClear()
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

    it("renders a compact start action", () => {
      const { getByText } = renderRoutineCard({
        title: "Leg Day",
        exercisePreview: "Squat, Leg Press",
        onStart: mockOnStart,
      })

      expect(getByText("Start")).toBeTruthy()
    })
  })

  describe("interactions", () => {
    it("calls onStart when Start Routine button is pressed", () => {
      const { getByText } = renderRoutineCard({
        title: "Upper Body",
        exercisePreview: "Exercises",
        onStart: mockOnStart,
      })

      fireEvent.press(getByText("Start"))

      expect(mockOnStart).toHaveBeenCalledTimes(1)
    })

    it("calls onOpen when the routine details are pressed", () => {
      const { getByLabelText } = renderRoutineCard({
        title: "Lower Body",
        exercisePreview: "Exercises",
        onStart: mockOnStart,
        onOpen: mockOnOpen,
      })

      fireEvent.press(getByLabelText("Open Lower Body"))

      expect(mockOnOpen).toHaveBeenCalledTimes(1)
    })

    it("does not expose an open action when onOpen is not provided", () => {
      const { queryByLabelText } = renderRoutineCard({
        title: "Core",
        exercisePreview: "Exercises",
        onStart: mockOnStart,
      })

      expect(queryByLabelText("Open Core")).toBeNull()
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
