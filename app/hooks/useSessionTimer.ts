import { useEffect, useState } from "react"

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const pad = (n: number) => n.toString().padStart(2, "0")

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`
  }
  return `${pad(minutes)}:${pad(seconds)}`
}

export function useSessionTimer(startedAt: Date | undefined): string {
  const [duration, setDuration] = useState("00:00")

  useEffect(() => {
    if (!startedAt) {
      setDuration("00:00")
      return
    }

    const updateDuration = () => {
      const elapsed = Math.max(0, Date.now() - startedAt.getTime())
      setDuration(formatDuration(elapsed))
    }

    updateDuration()
    const interval = setInterval(updateDuration, 1000)

    return () => clearInterval(interval)
  }, [startedAt])

  return duration
}
