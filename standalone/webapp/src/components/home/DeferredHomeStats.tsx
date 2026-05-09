import { lazy, Suspense, useEffect, useState } from "react"

const HomeStats = lazy(() =>
  import("@/components/home/HomeStats").then((module) => ({
    default: module.HomeStats,
  }))
)

const StatsFallback = () => (
  <>
    <span className="inline-flex h-6 w-28 animate-pulse rounded-full border border-[var(--home-border-color)] bg-[var(--home-bg-secondary)]" />
    <span className="inline-flex h-6 w-36 animate-pulse rounded-full border border-[var(--home-border-color)] bg-[var(--home-bg-secondary)]" />
  </>
)

export const DeferredHomeStats = () => {
  const [shouldLoadStats, setShouldLoadStats] = useState(false)

  useEffect(() => {
    const loadStats = () => {
      setShouldLoadStats(true)
    }

    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions
      ) => number
      cancelIdleCallback?: (handle: number) => void
    }

    if (typeof idleWindow.requestIdleCallback === "function") {
      const idleHandle = idleWindow.requestIdleCallback(loadStats, {
        timeout: 500,
      })
      return () => {
        idleWindow.cancelIdleCallback?.(idleHandle)
      }
    }

    const timeoutHandle = window.setTimeout(loadStats, 0)
    return () => {
      window.clearTimeout(timeoutHandle)
    }
  }, [])

  if (!shouldLoadStats) {
    return <StatsFallback />
  }

  return (
    <Suspense fallback={<StatsFallback />}>
      <HomeStats />
    </Suspense>
  )
}
