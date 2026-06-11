import { Link } from "react-router"
import { useModalContext } from "@/contexts"
import { bugReportURL } from "@/constants/urls"

const linkClass =
  "rounded-sm text-[var(--home-text-secondary)] transition-colors duration-200 hover:text-[var(--home-text-primary)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--home-accent-ring)] focus-visible:outline-offset-2"

// Slim, always-visible footer. Legal links (Imprint/Privacy) must not be hidden
// in a dropdown — they live here, inline, alongside About and a problem report.
export const HomeFooter = () => {
  const { openModal } = useModalContext()

  return (
    <footer className="z-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 border-t border-[var(--home-border-subtle)] px-4 py-2.5 text-xs">
      <Link to="/imprint" className={linkClass}>
        Imprint
      </Link>
      <Link to="/privacy" className={linkClass}>
        Privacy
      </Link>
      <button
        type="button"
        className={linkClass}
        onClick={() => openModal("AboutModal")}
      >
        About Apollon
      </button>
      <a
        href={bugReportURL}
        target="_blank"
        rel="noreferrer"
        className={linkClass}
      >
        Report a problem
      </a>
    </footer>
  )
}
