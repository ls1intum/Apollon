import TumLogo from "assets/images/tum-logo.png"

type AppLoadingScreenProps = {
  label?: string
  variant?: "page" | "panel"
}

export const AppLoadingScreen = ({
  label = "Loading workspace...",
  variant = "page",
}: AppLoadingScreenProps) => {
  return (
    <div
      className={`app-loading-screen app-loading-screen--${variant}`}
      role="status"
      aria-label={label}
      aria-live="polite"
    >
      <div className="app-loading-content">
        <div className="app-loading-logo-shell">
          <img
            className="app-loading-logo"
            src={TumLogo}
            alt="TUM logo"
            width="108"
            height="54"
          />
        </div>
        <span className="app-loading-progress" aria-hidden="true" />
      </div>
    </div>
  )
}
