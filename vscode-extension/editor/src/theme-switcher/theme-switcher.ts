import * as themings from "./themings.json"

export const setTheme = (theming: string) => {
  const root = document.documentElement
  // @ts-ignore
  for (const themingVar of Object.keys(themings[theming])) {
    // @ts-ignore
    root.style.setProperty(themingVar, themings[theming][themingVar])
  }
}

export const toggleTheme = (themePreference: "light" | "dark") => {
  switch (themePreference) {
    case "dark":
      setTheme("light")
      break

    default:
      setTheme("dark")
      break
  }
}
