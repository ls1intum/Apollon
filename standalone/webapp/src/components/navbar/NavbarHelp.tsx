import { FC, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@tumaet/ui/components/dropdown-menu"
import { Button } from "@tumaet/ui/components/button"
import { ChevronDownIcon } from "lucide-react"
import { useLocation, useNavigate } from "@tanstack/react-router"
import { bugReportURL } from "@/constants/urls"
import { useModalContext } from "@/contexts"
import { navbarButtonStyle } from "./styleConstants"

interface Props {
  color?: string
}

export const NavbarHelp: FC<Props> = ({ color }) => {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { openModal } = useModalContext()

  const close = () => setOpen(false)

  // Stamp where the user came from so the legal page can offer a one-tap return
  // to the diagram they were editing. This is the single editor → legal
  // chokepoint (both the desktop and mobile navbars render NavbarHelp), so the
  // dead-end fix lives in exactly one place.
  const goToLegalPage = (path: "/imprint" | "/privacy") => {
    navigate({
      to: path,
      // searchStr includes the leading "?".
      state: { from: location.pathname + location.searchStr },
    })
    close()
  }

  const openHelpModal = () => {
    openModal("HowToUseModal")
    close()
  }
  const openAboutModal = () => {
    openModal("AboutModal")
    close()
  }
  const openBugReport = () => {
    window.open(bugReportURL, "_blank")
    close()
  }
  const linkToPlayground = () => {
    navigate({ to: "/playground" })
    close()
  }
  const linkToImprint = () => goToLegalPage("/imprint")
  const linkToPrivacy = () => goToLegalPage("/privacy")

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        id="help-menu-button"
        render={
          <Button
            variant="ghost"
            size="sm"
            className={navbarButtonStyle()}
            style={color ? { color } : undefined}
          />
        }
      >
        <span>Help</span>
        <ChevronDownIcon className="ml-1 size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent aria-labelledby="help-menu-button">
        <DropdownMenuItem onClick={openHelpModal}>
          How does this Editor Work?
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openAboutModal}>About</DropdownMenuItem>
        <DropdownMenuItem onClick={openBugReport}>
          Report a Problem
        </DropdownMenuItem>
        <DropdownMenuItem onClick={linkToPlayground}>
          Open Playground
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={linkToImprint}>Imprint</DropdownMenuItem>
        <DropdownMenuItem onClick={linkToPrivacy}>Privacy</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
