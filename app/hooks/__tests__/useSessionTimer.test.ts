import { renderHook, act } from "@testing-library/react-native"

import { useSessionTimer } from "../useSessionTimer"

describe("useSessionTimer", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("returns 00:00 when no startedAt provided", () => {
    const { result } = renderHook(() => useSessionTimer(undefined))
    expect(result.current).toBe("00:00")
  })

  it("formats seconds correctly", () => {
    const startedAt = new Date(Date.now() - 45 * 1000) // 45 seconds ago
    const { result } = renderHook(() => useSessionTimer(startedAt))
    expect(result.current).toBe("00:45")
  })

  it("formats minutes correctly", () => {
    const startedAt = new Date(Date.now() - 5 * 60 * 1000 - 30 * 1000) // 5:30 ago
    const { result } = renderHook(() => useSessionTimer(startedAt))
    expect(result.current).toBe("05:30")
  })

  it("formats hours when > 60 minutes", () => {
    const startedAt = new Date(Date.now() - 2 * 60 * 60 * 1000 - 15 * 60 * 1000 - 30 * 1000) // 2:15:30 ago
    const { result } = renderHook(() => useSessionTimer(startedAt))
    expect(result.current).toBe("2:15:30")
  })

  it("updates every second", () => {
    const startedAt = new Date(Date.now())
    const { result } = renderHook(() => useSessionTimer(startedAt))

    expect(result.current).toBe("00:00")

    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(result.current).toBe("00:01")

    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(result.current).toBe("00:02")
  })

  it("resets to 00:00 when startedAt becomes undefined", () => {
    const startedAt = new Date(Date.now() - 30 * 1000)
    const { result, rerender } = renderHook(
      ({ started }: { started: Date | undefined }) => useSessionTimer(started),
      { initialProps: { started: startedAt } },
    )

    expect(result.current).toBe("00:30")

    rerender({ started: undefined })
    expect(result.current).toBe("00:00")
  })
})
