import Box from "@mui/material/Box/Box"
import Typography from "@mui/material/Typography/Typography"
import { appVersion } from "@/constants"
import { APP_NAME_FONT_FAMILY } from "./styleConstants"
import TumLogo from "assets/images/tum-logo-579x579.png"

export const BrandAndVersion = () => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
      }}
    >
      {/* Logo + wordmark are one indivisible unit: never shrink, never wrap,
          never truncate (no "Apol…" on narrow viewports). */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        <img
          alt="TUM logo"
          src={TumLogo}
          width="40"
          height="40"
          style={{ display: "block", flexShrink: 0 }}
        />

        <Typography
          component="span"
          sx={{
            fontWeight: 600,
            fontFamily: APP_NAME_FONT_FAMILY,
            letterSpacing: "0.06em",
            lineHeight: 1,
            fontSize: "1.05rem",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            overflow: "visible",
          }}
        >
          Apollon
        </Typography>
      </Box>

      <Typography
        variant="body2"
        component="span"
        sx={{
          // Muted text on the always-dark navbar — theme-independent translucent
          // white, not a theme-reactive token (the navbar never changes color).
          color: "rgba(255, 255, 255, 0.65)",
          display: { xs: "none", sm: "block" },
          lineHeight: 1.1,
          fontSize: "0.75rem",
          letterSpacing: "0.02em",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
        }}
      >
        {appVersion}
      </Typography>
    </Box>
  )
}
