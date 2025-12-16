import { fireEvent, render } from "@testing-library/react-native"

import { SetTypeId } from "@/models/SetStore"
import { ThemeProvider } from "@/theme/context"

import { SetOptionsBottomSheet, SetOptionsBottomSheetProps } from "../SetOptionsBottomSheet"

function renderBottomSheet(props: Partial<SetOptionsBottomSheetProps> = {}) {
  const defaultProps: SetOptionsBottomSheetProps = {
    visible: true,
    onClose: jest.fn(),
    onDelete: jest.fn(),
    onSelectType: jest.fn(),
    currentTypeId: "working" as SetTypeId,
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
  describe("rendering", () => {
    it("renders all set type options when visible", () => {
      const { getByText } = renderBottomSheet()

      expect(getByText("Isınma Seti")).toBeTruthy()
      expect(getByText("Normal Set")).toBeTruthy()
      expect(getByText("Tükeniş Seti")).toBeTruthy()
      expect(getByText("Drop Set")).toBeTruthy()
      expect(getByText("Seti Kaldır")).toBeTruthy()
    })

    it("displays title", () => {
      const { getByText } = renderBottomSheet()

      expect(getByText("Set Türünü Seç")).toBeTruthy()
    })
  })

  describe("callbacks", () => {
    it("calls onDelete when Seti Kaldır is pressed", () => {
      const onDelete = jest.fn()
      const onClose = jest.fn()
      const { getByText } = renderBottomSheet({ onDelete, onClose })

      fireEvent.press(getByText("Seti Kaldır"))

      expect(onClose).toHaveBeenCalled()
      expect(onDelete).toHaveBeenCalled()
    })

    it("calls onSelectType when a set type is selected", () => {
      const onSelectType = jest.fn()
      const onClose = jest.fn()
      const { getByText } = renderBottomSheet({ onSelectType, onClose })

      fireEvent.press(getByText("Drop Set"))

      expect(onClose).toHaveBeenCalled()
      expect(onSelectType).toHaveBeenCalledWith("dropset")
    })
  })

  describe("accessibility", () => {
    it("has proper accessibility labels", () => {
      const { getByLabelText } = renderBottomSheet()

      expect(getByLabelText("Isınma Seti")).toBeTruthy()
      expect(getByLabelText("Normal Set")).toBeTruthy()
      expect(getByLabelText("Tükeniş Seti")).toBeTruthy()
      expect(getByLabelText("Drop Set")).toBeTruthy()
      expect(getByLabelText("Seti Kaldır")).toBeTruthy()
    })
  })
})
