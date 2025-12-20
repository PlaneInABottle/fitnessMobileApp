import { useState } from "react"
import { StyleSheet } from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { fireEvent, render } from "@testing-library/react-native"

import type { SetData } from "@/models/SetStore"
import { colors } from "@/theme/colors"
import { ThemeProvider } from "@/theme/context"

import { SetRow } from "../SetRow"

function Harness({
  initialValue,
  isDone,
}: {
  initialValue: Partial<SetData>
  isDone?: boolean
}) {
  const [value, setValue] = useState<Partial<SetData>>(initialValue)

  return (
    <ThemeProvider>
      <NavigationContainer>
        <SetRow
          category="STRENGTH"
          mode="edit"
          value={value}
          allowEmptyNumbers={false}
          isDone={isDone}
          onChange={(next) => setValue(next)}
        />
      </NavigationContainer>
    </ThemeProvider>
  )
}

describe("SetRow", () => {
  it("shows Kg/Reps placeholders when values are 0 and untouched", () => {
    const { getByLabelText } = render(<Harness initialValue={{ setType: "working", weight: 0, reps: 0 }} />)

    expect(getByLabelText("Kg").props.value).toBe("")
    expect(getByLabelText("Reps").props.value).toBe("")
  })

  it("allows clearing numeric input while focused and coerces on blur", () => {
    const { getByLabelText } = render(
      <Harness initialValue={{ setType: "working", weight: 12, reps: 5 }} />,
    )

    const kgInput = getByLabelText("Kg")

    fireEvent(kgInput, "focus")
    fireEvent.changeText(kgInput, "")
    expect(getByLabelText("Kg").props.value).toBe("")

    fireEvent(kgInput, "blur")
    expect(getByLabelText("Kg").props.value).toBe("0")
  })

  it("shows Kg/Reps as 0 when set is done and untouched", () => {
    const { getByLabelText } = render(
      <Harness initialValue={{ setType: "working", weight: 0, reps: 0 }} isDone />,
    )

    const kgInput = getByLabelText("Kg")
    const repsInput = getByLabelText("Reps")

    expect(kgInput.props.value).toBe("0")
    expect(repsInput.props.value).toBe("0")

    const kgStyle = StyleSheet.flatten(kgInput.props.style)
    expect(kgStyle.fontFamily).toBe("spaceGroteskBold")
    expect(kgStyle.color).toBe(colors.text)
  })

  it("shows Kg/Reps as 0 when set is done, untouched, and values are undefined", () => {
    const { getByLabelText } = render(<Harness initialValue={{ setType: "working" }} isDone />)

    const kgInput = getByLabelText("Kg")
    const repsInput = getByLabelText("Reps")

    expect(kgInput.props.value).toBe("0")
    expect(repsInput.props.value).toBe("0")

    const kgStyle = StyleSheet.flatten(kgInput.props.style)
    expect(kgStyle.fontFamily).toBe("spaceGroteskBold")
    expect(kgStyle.color).toBe(colors.text)
  })

  it("shows entered styling after user types (including 0)", () => {
    const { getByLabelText } = render(<Harness initialValue={{ setType: "working", weight: 0, reps: 0 }} />)

    fireEvent.changeText(getByLabelText("Kg"), "0")

    const kgInput = getByLabelText("Kg")
    expect(kgInput.props.value).toBe("0")

    const kgStyle = StyleSheet.flatten(kgInput.props.style)
    expect(kgStyle.fontFamily).toBe("spaceGroteskBold")

    fireEvent.changeText(getByLabelText("Reps"), "5")
    const repsInput = getByLabelText("Reps")
    expect(repsInput.props.value).toBe("5")
  })

  it("renders non-zero Kg/Reps values as entered (no placeholder)", () => {
    const { getByLabelText } = render(
      <Harness initialValue={{ setType: "working", weight: 100, reps: 5 }} />,
    )

    const kgInput = getByLabelText("Kg")
    const repsInput = getByLabelText("Reps")

    expect(kgInput.props.value).toBe("100")
    expect(repsInput.props.value).toBe("5")

    expect(StyleSheet.flatten(kgInput.props.style).fontFamily).toBe("spaceGroteskBold")
    expect(StyleSheet.flatten(repsInput.props.style).fontFamily).toBe("spaceGroteskBold")
  })
})
