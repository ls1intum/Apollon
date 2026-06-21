import Box from "@mui/material/Box/Box"
import Typography from "@mui/material/Typography/Typography"
import { appVersion } from "@/constants"
import { APP_NAME_FONT_FAMILY } from "./styleConstants"
import TumLogo from "assets/images/tum-logo-579x579.png"

/**
 * Brand lockup: TUM logo + "APOLLON" wordmark. The version string is NOT shown
 * here, so the brand island stays uncluttered and leaves room for controls; the
 * version is discoverable via Help → About and the `title` tooltip below. The
 * logo is a compact ~28px so the brand island stays the same height as its
 * sibling islands.
 */
export const BrandAndVersion = () => {
  return (
    <Box
      title={`Apollon ${appVersion}`}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      <img
        alt="TUM logo"
        src={TumLogo}
        width="28"
        height="28"
        style={{ display: "block", flexShrink: 0 }}
      />
      <Typography
        component="span"
        sx={{
          fontWeight: 600,
          fontFamily: APP_NAME_FONT_FAMILY,
          letterSpacing: "0.06em",
          lineHeight: 1,
          fontSize: "1rem",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          overflow: "visible",
          color: "var(--apollon-chrome-text)",
        }}
      >
        Apollon
      </Typography>
    </Box>
  )
}
