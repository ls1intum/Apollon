import { useState, MouseEvent, FC } from "react"
import Button from "@mui/material/Button"
import Divider from "@mui/material/Divider"
import Menu from "@mui/material/Menu"
import MenuItem from "@mui/material/MenuItem"
import Typography from "@mui/material/Typography/Typography"
import { bugReportURL } from "@/constants/urls"
import { useModalContext } from "@/contexts"
import { useLocation, useNavigate } from "@tanstack/react-router"
import { KeyboardArrowDownIcon } from "../Icon"
import { navbarButtonStyle } from "./styleConstants"

interface Props {
  color?: string
}

export const NavbarHelp: FC<Props> = ({ color }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { openModal } = useModalContext()

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
    handleClose()
  }

  const open = Boolean(anchorEl)
  const openMenu = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const openHelpModal = () => {
    openModal("HowToUseModal")
    handleClose()
  }

  const openAboutModal = () => {
    openModal("AboutModal")

    handleClose()
  }

  const openBugReport = () => {
    window.open(bugReportURL, "_blank")
    handleClose()
  }

  const linkToPlayground = () => {
    navigate({ to: "/playground" })
    handleClose()
  }

  const linkToImprint = () => {
    goToLegalPage("/imprint")
  }

  const linkToPrivacy = () => {
    goToLegalPage("/privacy")
  }

  return (
    <>
      <Button
        id="basic-button"
        aria-controls={open ? "basic-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={openMenu}
        sx={navbarButtonStyle(color)}
      >
        <Typography color="inherit">Help</Typography>
        <KeyboardArrowDownIcon width={16} height={16} />
      </Button>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "basic-button",
          onMouseLeave: handleClose,
        }}
      >
        <MenuItem
          sx={{
            background: "var(--apollon-background)",
            color: "var(--apollon-primary-contrast)",
          }}
          onClick={openHelpModal}
        >
          How does this Editor Work?
        </MenuItem>
        <MenuItem onClick={openAboutModal}>About</MenuItem>
        <MenuItem onClick={openBugReport}>Report a Problem</MenuItem>
        <MenuItem onClick={linkToPlayground}>Open Playground</MenuItem>
        <Divider />
        <MenuItem onClick={linkToImprint}>Imprint</MenuItem>
        <MenuItem onClick={linkToPrivacy}>Privacy</MenuItem>
      </Menu>
    </>
  )
}
