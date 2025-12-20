import { NavigationContainer } from "@react-navigation/native"
import { render } from "@testing-library/react-native"

import { ThemeProvider } from "../../theme/context"
import { SetTypeIndicator, SetType } from "../SetTypeIndicator"

function renderSetTypeIndicator(props: { type: SetType; index?: number }) {
  return render(
    <ThemeProvider>
      <NavigationContainer>
        <SetTypeIndicator {...props} />
      </NavigationContainer>
    </ThemeProvider>,
  )
}

describe("SetTypeIndicator", () => {
  describe("set type display", () => {
    it("displays W for warmup sets", () => {
      const { getByText } = renderSetTypeIndicator({
        type: "warmup",
      })

      expect(getByText("W")).toBeTruthy()
    })

    it("displays D for dropset sets", () => {
      const { getByText } = renderSetTypeIndicator({
        type: "dropset",
      })

      expect(getByText("D")).toBeTruthy()
    })

    it("displays F for failure sets", () => {
      const { getByText } = renderSetTypeIndicator({
        type: "failure",
      })

      expect(getByText("F")).toBeTruthy()
    })
  })

  describe("working sets", () => {
    it("displays N for working sets even when index is provided", () => {
      const { getByText } = renderSetTypeIndicator({
        type: "working",
        index: 1,
      })

      expect(getByText("N")).toBeTruthy()
    })

    it("displays N for working set without index", () => {
      const { getByText } = renderSetTypeIndicator({
        type: "working",
      })

      expect(getByText("N")).toBeTruthy()
    })
  })

  describe("special set types ignore index", () => {
    it("displays W for warmup even with index provided", () => {
      const { getByText, queryByText } = renderSetTypeIndicator({
        type: "warmup",
        index: 3,
      })

      expect(getByText("W")).toBeTruthy()
      expect(queryByText("3")).toBeNull()
    })

    it("displays D for dropset even with index provided", () => {
      const { getByText, queryByText } = renderSetTypeIndicator({
        type: "dropset",
        index: 2,
      })

      expect(getByText("D")).toBeTruthy()
      expect(queryByText("2")).toBeNull()
    })

    it("displays F for failure even with index provided", () => {
      const { getByText, queryByText } = renderSetTypeIndicator({
        type: "failure",
        index: 4,
      })

      expect(getByText("F")).toBeTruthy()
      expect(queryByText("4")).toBeNull()
    })
  })
})
