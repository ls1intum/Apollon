import MobileNavbar from "./MobileNavbar"
import { DesktopNavbar } from "./DesktopNavbar"
import useMediaQuery from "@mui/material/useMediaQuery"
import { MOBILE_VIEW_QUERY } from "@/constants"

export const Navbar = () => {
  const isMobile = useMediaQuery(MOBILE_VIEW_QUERY)

  return isMobile ? <MobileNavbar /> : <DesktopNavbar />
}
