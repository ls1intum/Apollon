import Box from "@mui/material/Box/Box"
import Typography from "@mui/material/Typography/Typography"
import { secondary, appVersion } from "@/constants"
import { APP_NAME_FONT_FAMILY } from "./styleConstants"
import ApollonLogo from "assets/images/apollon-logo-v1.svg"

export const BrandAndVersion = () => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <img
          alt="Apollon logo"
          src={ApollonLogo}
          width="20"
          height="20"
          style={{ display: "block", flexShrink: 0 }}
        />

        <Typography
          noWrap
          component="span"
          sx={{
            fontWeight: 600,
            fontFamily: APP_NAME_FONT_FAMILY,
            letterSpacing: "0.06em",
            lineHeight: 1,
            fontSize: "1.25rem",
            textTransform: "uppercase",
          }}
        >
          Apollon
        </Typography>
      </Box>

      <Typography
        variant="body2"
        component="span"
        sx={{
          color: secondary,
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
