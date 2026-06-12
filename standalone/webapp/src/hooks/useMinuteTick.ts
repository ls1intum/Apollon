import { useEffect, useState } from "react"

// A single shared 60s interval drives all subscribers, so N relative-date
// labels (e.g. one per diagram card) don't each spin up their own timer.
const subscribers = new Set<() => void>()
let intervalId: number | null = null

const startTicking = () => {
  if (intervalId !== null) {
    return
  }
  intervalId = window.setInterval(() => {
    for (const notify of subscribers) {
      notify()
    }
  }, 60_000)
}

const stopTicking = () => {
  if (intervalId !== null && subscribers.size === 0) {
    window.clearInterval(intervalId)
    intervalId = null
  }
}

/**
 * Returns a value that changes once per minute, backed by a process-wide shared
 * interval. Use it to refresh relative timestamps without one timer per component.
 */
export const useMinuteTick = (): number => {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const notify = () => setTick((current) => current + 1)
    subscribers.add(notify)
    startTicking()

    return () => {
      subscribers.delete(notify)
      stopTicking()
    }
  }, [])

  return tick
}
