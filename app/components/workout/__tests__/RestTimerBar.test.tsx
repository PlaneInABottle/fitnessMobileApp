import { Vibration } from "react-native"
import { act, fireEvent, render } from "@testing-library/react-native"

import { ThemeProvider } from "@/theme/context"

import { RestTimerBar } from "../RestTimerBar"

function renderTimer(endsAt?: Date) {
  const onAddThirty = jest.fn()
  const onSkip = jest.fn()
  const onExpire = jest.fn().mockReturnValueOnce(true).mockReturnValue(false)
  const result = render(
    <ThemeProvider>
      <RestTimerBar endsAt={endsAt} onAddThirty={onAddThirty} onSkip={onSkip} onExpire={onExpire} />
    </ThemeProvider>,
  )
  return { ...result, onAddThirty, onSkip, onExpire }
}

describe("RestTimerBar", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2025-01-01T00:00:00Z"))
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it("renders from an absolute deadline and exposes add and skip controls", () => {
    const { getByText, getByLabelText, onAddThirty, onSkip } = renderTimer(
      new Date("2025-01-01T00:01:30Z"),
    )

    expect(getByText("1:30")).toBeTruthy()
    fireEvent.press(getByLabelText("Add 30 seconds to rest timer"))
    fireEvent.press(getByLabelText("Skip rest timer"))
    expect(onAddThirty).toHaveBeenCalledTimes(1)
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it("shows non-color completion, vibrates once, and cleans up its interval", () => {
    const vibrationSpy = jest.spyOn(Vibration, "vibrate").mockImplementation(() => true)
    const { getByText, getByLabelText, unmount } = renderTimer(new Date("2025-01-01T00:00:01Z"))

    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(getByText("✓ Rest complete")).toBeTruthy()
    expect(getByText("Ready")).toBeTruthy()
    expect(getByLabelText("Dismiss rest timer")).toBeTruthy()
    expect(vibrationSpy).toHaveBeenCalledTimes(1)
    expect(jest.getTimerCount()).toBe(0)

    act(() => {
      jest.advanceTimersByTime(3000)
    })
    expect(vibrationSpy).toHaveBeenCalledTimes(1)

    unmount()
    expect(jest.getTimerCount()).toBe(0)
  })
})
