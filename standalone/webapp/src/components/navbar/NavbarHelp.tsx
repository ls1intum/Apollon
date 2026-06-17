import { FC, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@tumaet/ui/components/dropdown-menu"
import { ChevronDownIcon } from "lucide-react"
import { secondary } from "@/constants"
import { bugReportURL } from "@/constants/urls"
import { useModalContext } from "@/contexts"
import { useLocation, useNavigate } from "react-router"
import { navTriggerClass } from "./styles"

interface Props {
  color?: string
}

export const NavbarHelp: FC<Props> = ({ color }) => {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { openModal } = useModalContext()

  // Stamp where the user came from so the legal page can offer a one-tap return
  // to the diagram they were editing. This is the single editor → legal
  // chokepoint (both the desktop and mobile navbars render NavbarHelp), so the
  // dead-end fix lives in exactly one place.
  const goToLegalPage = (path: string) => {
    navigate(path, { state: { from: location.pathname + location.search } })
  }

  const openHelpModal = () => openModal("HowToUseModal")
  const openAboutModal = () => openModal("AboutModal")
  const openBugReport = () => window.open(bugReportURL, "_blank")
  const linkToPlayground = () => navigate("/playground")
  const linkToImprint = () => goToLegalPage("/imprint")
  const linkToPrivacy = () => goToLegalPage("/privacy")

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={navTriggerClass}
        style={{ color: color ?? secondary }}
      >
        <span>Help</span>
        <ChevronDownIcon className="ml-1 size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
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
