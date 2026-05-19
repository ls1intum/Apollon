import MobileNavbar from "./MobileNavbar"
import { DesktopNavbar } from "./DesktopNavbar"

export const Navbar = () => {
  return (
    <>
      <div className="hidden md:block">
        <DesktopNavbar />
      </div>

      <div className="md:hidden">
        <MobileNavbar />
      </div>
    </>
  )
}
