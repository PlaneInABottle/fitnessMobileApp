import { StyleSheet } from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { render } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"

import { TextField } from "../TextField"

function renderTextField(multiline = false) {
  return render(
    <ThemeProvider>
      <NavigationContainer>
        <TextField placeholder="Search exercises" multiline={multiline} />
      </NavigationContainer>
    </ThemeProvider>,
  )
}

describe("TextField", () => {
  it("centers single-line text vertically", () => {
    const { getByPlaceholderText } = renderTextField()
    const input = getByPlaceholderText("Search exercises")

    expect(input.props.textAlignVertical).toBe("center")
    expect(StyleSheet.flatten(input.props.style)).toMatchObject({
      alignSelf: "center",
      height: 24,
      marginVertical: 0,
    })
  })

  it("keeps multiline text aligned to the top", () => {
    const { getByPlaceholderText } = renderTextField(true)
    const input = getByPlaceholderText("Search exercises")

    expect(input.props.textAlignVertical).toBe("top")
    expect(StyleSheet.flatten(input.props.style)).toMatchObject({
      alignSelf: "stretch",
      height: "auto",
    })
  })
})
