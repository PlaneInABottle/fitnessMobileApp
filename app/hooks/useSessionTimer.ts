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
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    if (!startedAt) return

    const interval = setInterval(() => setNow(Date.now()), 1000)

    return () => clearInterval(interval)
  }, [startedAt])

  if (!startedAt) return "00:00"
  return formatDuration(Math.max(0, now - startedAt.getTime()))
}
