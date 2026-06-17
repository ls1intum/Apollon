import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"
import { MenuIcon } from "lucide-react"
import { Input } from "@tumaet/ui/components/input"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@tumaet/ui/components/sheet"
import { NavbarFile } from "./NavbarFile"
import { NavbarHelp } from "./NavbarHelp"
import { VersionHistoryButton } from "./VersionHistoryButton"
import { BrandAndVersion } from "./BrandAndVersion"
import { BackNav } from "./BackNav"
import { ThemeSwitcherMenu } from "./ThemeSwitcher"
import { navTriggerClass } from "./styles"
import { ALL_DIAGRAMS_LABEL } from "@/lib/navProvenance"
import { secondary } from "@/constants"
import { useEditorContext, useModalContext } from "@/contexts"

const PRIMARY_CONTRAST = "var(--apollon-primary-contrast)"

// One responsive navbar for the editor. Desktop (`hidden md:flex`) lays the
// controls out inline on the always-dark bar; mobile (`md:hidden`) collapses
// them into a hamburger-triggered sheet. The diagram-title subscription and
// state live here so the controls render exactly once regardless of viewport.
export const Navbar = () => {
  const { editor } = useEditorContext()
  const { openModal } = useModalContext()
  const [diagramTitle, setDiagramTitle] = useState(
    editor?.getDiagramMetadata().diagramTitle || ""
  )
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const unsubscribeId = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!editor) {
      unsubscribeId.current = undefined
      return
    }

    unsubscribeId.current = editor.subscribeToDiagramNameChange((title) => {
      setDiagramTitle(title)
    })
    setDiagramTitle(editor.getDiagramMetadata().diagramTitle || "")

    return () => {
      if (unsubscribeId.current !== undefined) {
        editor.unsubscribe(unsubscribeId.current)
        unsubscribeId.current = undefined
      }
    }
  }, [editor])

  const updateTitle = (value: string) => {
    editor?.updateDiagramTitle(value)
    setDiagramTitle(value)
  }

  const brandLink = (
    <Link
      to="/"
      aria-label="Apollon home"
      className="flex shrink-0 items-center rounded-sm text-white no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <BrandAndVersion />
    </Link>
  )

  return (
    <header className="sticky top-0 z-[1100] border-b border-black/10 bg-[var(--navbar-bg)] text-white shadow-[var(--navbar-shadow)]">
      {/* Desktop / tablet — inline layout */}
      <nav className="hidden min-h-16 w-full items-center gap-4 px-4 md:flex">
        {brandLink}

        <div className="flex min-w-0 flex-1 items-center gap-4 pl-1.5">
          <BackNav to="/" label={ALL_DIAGRAMS_LABEL} tone="onDark" />
          <NavbarFile />
          <button
            type="button"
            className={navTriggerClass}
            style={{ color: secondary }}
            onClick={() => openModal("SHARE")}
          >
            Share
          </button>
          <NavbarHelp />
          <Input
            value={diagramTitle}
            onChange={(event) => updateTitle(event.target.value)}
            placeholder="Diagram Name"
            className="ml-1 max-w-[360px] border-white/30 bg-transparent text-white placeholder:text-white/50"
          />

          <div className="ml-auto flex items-center gap-1">
            <VersionHistoryButton />
            <ThemeSwitcherMenu />
          </div>
        </div>
      </nav>

      {/* Mobile — hamburger + sheet */}
      <nav className="flex min-h-16 items-center justify-between px-4 md:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger
            aria-label="navigation menu"
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-md bg-transparent text-white outline-none transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <MenuIcon className="size-6" aria-hidden />
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-72 max-w-[80vw] gap-1 bg-[var(--apollon-background)] p-2 text-[var(--apollon-primary-contrast)]"
          >
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            <div className="flex flex-col items-start gap-1 pt-6">
              <BackNav
                to="/"
                label={ALL_DIAGRAMS_LABEL}
                tone="onSurface"
                onNavigate={() => setMobileMenuOpen(false)}
                className="mx-1"
              />
              <NavbarFile
                color={PRIMARY_CONTRAST}
                handleCloseNavMenu={() => setMobileMenuOpen(false)}
              />
              <button
                type="button"
                className={navTriggerClass}
                style={{ color: PRIMARY_CONTRAST }}
                onClick={() => {
                  openModal("SHARE")
                  setMobileMenuOpen(false)
                }}
              >
                Share
              </button>
              <VersionHistoryButton color={PRIMARY_CONTRAST} />
              <NavbarHelp color={PRIMARY_CONTRAST} />

              <div className="w-full p-0.5">
                <Input
                  value={diagramTitle}
                  onChange={(event) => updateTitle(event.target.value)}
                  placeholder="Diagram Name"
                  className="text-[var(--apollon-primary-contrast)]"
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {brandLink}

        <ThemeSwitcherMenu />
      </nav>
    </header>
  )
}
