import { fireEvent, render } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"

import { SetOptionsBottomSheet, SetOptionsBottomSheetProps } from "../SetOptionsBottomSheet"

function renderBottomSheet(props: Partial<SetOptionsBottomSheetProps> = {}) {
  const defaultProps: SetOptionsBottomSheetProps = {
    visible: true,
    onClose: jest.fn(),
    onDelete: jest.fn(),
    onChangeType: jest.fn(),
    setTypeName: "Working",
    ...props,
  }

  const result = render(
    <ThemeProvider>
      <SetOptionsBottomSheet {...defaultProps} />
    </ThemeProvider>,
  )

  return { ...result, props: defaultProps }
}

describe("SetOptionsBottomSheet", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe("rendering", () => {
    it("renders all option buttons when visible", () => {
      const { getByText } = renderBottomSheet()

      expect(getByText("Delete Set")).toBeTruthy()
      expect(getByText("Change Type (Working)")).toBeTruthy()
    })

    it("displays current set type name", () => {
      const { getByText } = renderBottomSheet({ setTypeName: "Warmup" })

      expect(getByText("Change Type (Warmup)")).toBeTruthy()
    })
  })

  describe("callbacks", () => {
    it("calls onDelete after animation when Delete Set is pressed", () => {
      const onDelete = jest.fn()
      const { getByText } = renderBottomSheet({ onDelete })

      fireEvent.press(getByText("Delete Set"))

      // Run animation timers
      jest.advanceTimersByTime(500)

      expect(onDelete).toHaveBeenCalled()
    })

    it("calls onChangeType after animation when Change Type is pressed", () => {
      const onChangeType = jest.fn()
      const { getByText } = renderBottomSheet({ onChangeType })

      fireEvent.press(getByText("Change Type (Working)"))

      // Run animation timers
      jest.advanceTimersByTime(500)

      expect(onChangeType).toHaveBeenCalled()
    })
  })

  describe("accessibility", () => {
    it("has proper accessibility labels", () => {
      const { getByLabelText } = renderBottomSheet()

      expect(getByLabelText("Delete set")).toBeTruthy()
      expect(getByLabelText("Change set type, currently Working")).toBeTruthy()
    })
  })
})
