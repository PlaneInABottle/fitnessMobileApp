import { useState } from "react"
import { StyleSheet } from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { fireEvent, render } from "@testing-library/react-native"

import type { ExerciseCategory } from "@/models/ExerciseStore"
import type { SetData } from "@/models/SetStore"
import { colors } from "@/theme/colors"
import { ThemeProvider } from "@/theme/context"

import { SetRow } from "../SetRow"

function Harness({
  initialValue,
  isDone,
  category = "STRENGTH",
}: {
  initialValue: Partial<SetData>
  isDone?: boolean
  category?: ExerciseCategory
}) {
  const [value, setValue] = useState<Partial<SetData>>(initialValue)

  return (
    <ThemeProvider>
      <NavigationContainer>
        <SetRow
          category={category}
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
  it("converts placeholders to actual values when marking done", () => {
    const onChange = jest.fn()
    const onDone = jest.fn()

    const { getByLabelText } = render(
      <ThemeProvider>
        <NavigationContainer>
          <SetRow
            category="STRENGTH"
            mode="edit"
            value={{ setType: "working", weight: 0, reps: 0 }}
            placeholders={{ weight: "100", reps: "5" }}
            allowEmptyNumbers={false}
            isDone={false}
            onChange={onChange}
            onDone={onDone}
          />
        </NavigationContainer>
      </ThemeProvider>,
    )

    fireEvent.press(getByLabelText("Done"))

    expect(onChange).not.toHaveBeenCalled()
    expect(onDone).toHaveBeenCalledWith({ setType: "working", weight: 100, reps: 5 })
  })

  it("shows Kg/Reps placeholders when values are 0 and untouched", () => {
    const { getByLabelText } = render(
      <Harness initialValue={{ setType: "working", weight: 0, reps: 0 }} />,
    )

    expect(getByLabelText("Kg").props.value).toBe("")
    expect(getByLabelText("Reps").props.value).toBe("")
  })

  it("shows time placeholder when value is 0 and untouched", () => {
    const { getByLabelText } = render(
      <Harness category="TIMED" initialValue={{ setType: "working", time: 0 }} />,
    )

    expect(getByLabelText("Sec").props.value).toBe("")
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

  it("does not overwrite a submitted value when focus advances to the next field", () => {
    const { getByLabelText } = render(
      <Harness initialValue={{ setType: "working", weight: 0, reps: 0 }} />,
    )

    const kgInput = getByLabelText("Kg")
    fireEvent(kgInput, "focus")
    fireEvent.changeText(kgInput, "60")
    fireEvent(kgInput, "submitEditing")
    fireEvent(kgInput, "blur")

    expect(getByLabelText("Kg").props.value).toBe("60")
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
    const { getByLabelText } = render(
      <Harness initialValue={{ setType: "working", weight: 0, reps: 0 }} />,
    )

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

  it("provides contextual labels, stable 44pt actions, and contained keyboard traversal", () => {
    const { getByLabelText } = render(
      <ThemeProvider>
        <NavigationContainer>
          <SetRow
            category="STRENGTH"
            mode="edit"
            value={{ setType: "working", weight: 0, reps: 0 }}
            exerciseName="Bench Press"
            setNumber={2}
            onChange={jest.fn()}
            onDone={jest.fn()}
            onPressSetType={jest.fn()}
          />
        </NavigationContainer>
      </ThemeProvider>,
    )

    const weight = getByLabelText("Bench Press, set 2, weight in kilograms")
    const reps = getByLabelText("Bench Press, set 2, repetitions")
    const setType = getByLabelText("Set type for Bench Press, set 2: working")
    const done = getByLabelText("Mark Bench Press, set 2 complete")

    expect(weight.props.returnKeyType).toBe("next")
    expect(weight.props.blurOnSubmit).toBe(false)
    expect(reps.props.returnKeyType).toBe("done")
    expect(reps.props.blurOnSubmit).toBe(true)
    expect(StyleSheet.flatten(setType.props.style)).toMatchObject({ width: 44, height: 44 })
    expect(StyleSheet.flatten(done.props.style)).toMatchObject({ width: 44, height: 44 })
    const visualButton = done.children[0]
    if (typeof visualButton === "string") throw new Error("Expected a visual button container")
    expect(StyleSheet.flatten(visualButton.props.style)).toMatchObject({
      width: 36,
      height: 36,
    })
  })
})
