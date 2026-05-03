const COLLAB_COLORS = [
  "#ffb61e",
  "#37b24d",
  "#1c7ed6",
  "#f03e3e",
  "#ae3ec9",
  "#0ca678",
  "#f76707",
  "#1098ad",
]

export const collabColorFromName = (name: string): string => {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash << 5) - hash + name.charCodeAt(i)
    hash |= 0
  }

  const index = Math.abs(hash) % COLLAB_COLORS.length
  return COLLAB_COLORS[index]
}
