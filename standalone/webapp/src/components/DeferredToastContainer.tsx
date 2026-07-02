import { lazy, Suspense, useEffect, useState } from "react"
import { useThemeStore } from "@/stores/useThemeStore"

const ToastContainer = lazy(() =>
  import("react-toastify").then((module) => ({
    default: module.ToastContainer,
  }))
)

export const DeferredToastContainer = () => {
  const [shouldLoadToasts, setShouldLoadToasts] = useState(false)
  const currentTheme = useThemeStore((state) => state.currentTheme)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setShouldLoadToasts(true)
    }, 1000)

    return () => window.clearTimeout(timeout)
  }, [])

  if (!shouldLoadToasts) {
    return null
  }

  return (
    <Suspense fallback={null}>
      <ToastContainer
        aria-label="Notifications"
        theme={currentTheme === "dark" ? "dark" : "light"}
        className="home-toast-container"
        toastClassName="home-toast"
      />
    </Suspense>
  )
}
