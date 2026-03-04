export type Styles = typeof apollonTheme

export type withThemeProps = { theme: Styles }

export type Color = "primary" | "secondary"
export type Size = "sm" | "md" | "lg"

// TODO: These values are not used yet, but they are defined in the theme as reference
const apollonTheme = {
  color: {
    primary: "var(--apollon2-primary, #2a8fbd)",
    secondary: "var(--apollon2-secondary, #6c757d)",
    warningYellow: "var(--apollon2-warning-yellow, #ffc800)",
    background: "var(--apollon2-background, #ffffff)",
    backgroundVariant: "var(--apollon2-background-variant, #e5e5e5)",
    grid: "var(--apollon2-grid, rgba(36, 39, 36, 0.1))",
    primaryContrast: "var(--apollon2-primary-contrast, #000000)",
    gray: "var(--apollon2-gray, #e9ecef)",
    grayAccent: "var(--apollon2-gray-variant, #343a40)",
  },
  font: {
    color: "var(--apollon2-primary-contrast, #000000)",
    family: "Helvetica Neue, Helvetica, Arial, sans-serif",
    size: 16,
  },
  interactive: {
    normal: "rgba(0, 220, 0, 0.3)",
    hovered: "rgba(0, 220, 0, 0.15)",
  },
}

export const defaults = () => {
  return apollonTheme
}
