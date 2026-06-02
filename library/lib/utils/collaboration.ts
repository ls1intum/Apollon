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

const ADJECTIVES = [
  "Swift",
  "Bold",
  "Clever",
  "Bright",
  "Calm",
  "Eager",
  "Kind",
  "Noble",
]

const ANIMALS = [
  "Falcon",
  "Otter",
  "Panda",
  "Lynx",
  "Dolphin",
  "Owl",
  "Fox",
  "Crane",
]

export const randomCollabName = (): string => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
  return `${adj} ${animal}`
}

export const collabColorFromName = (name: string): string => {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash << 5) - hash + name.charCodeAt(i)
    hash |= 0
  }

  const index = Math.abs(hash) % COLLAB_COLORS.length
  return COLLAB_COLORS[index]
}
