import type { SxProps, Theme } from "@mui/material/styles"
import { NAVBAR_BACKGROUND_COLOR } from "@/constants"

export const NAVBAR_DROP_SHADOW = "0 10px 24px rgba(0, 0, 0, 0.26)"

export const APP_NAME_FONT_FAMILY =
  '"Poppins", "Avenir Next", "Avenir", "Segoe UI", "Helvetica Neue", Arial, sans-serif'

export const NAVBAR_SX: SxProps<Theme> = {
  position: "sticky",
  top: 0,
  zIndex: (theme) => theme.zIndex.appBar,
  bgcolor: NAVBAR_BACKGROUND_COLOR,
  backgroundImage: "none",
  borderBottom: "none",
  boxShadow: NAVBAR_DROP_SHADOW,
}
