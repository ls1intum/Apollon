import { isPlatform } from "@ionic/react"

export const isCapacitorApp =
  isPlatform("ios") || isPlatform("android") || isPlatform("capacitor")

type CapacitorEnv = "local" | "staging" | "prod"

const capacitorEnv = (
  (import.meta.env.VITE_CAPACITOR_ENV as string | undefined) ?? "local"
).toLowerCase() as CapacitorEnv

const capacitorPresets: Record<CapacitorEnv, { url: string; wss: string }> = {
  local: {
    url: import.meta.env.VITE_CAPACITOR_URL_LOCAL || "",
    wss: import.meta.env.VITE_CAPACITOR_WSS_LOCAL || "",
  },
  staging: {
    url: import.meta.env.VITE_CAPACITOR_URL_STAGING || "",
    wss: import.meta.env.VITE_CAPACITOR_WSS_STAGING || "",
  },
  prod: {
    url: import.meta.env.VITE_CAPACITOR_URL_PROD || "",
    wss: import.meta.env.VITE_CAPACITOR_WSS_PROD || "",
  },
}

const capacitorPreset = capacitorPresets[capacitorEnv] ?? capacitorPresets.local

const capacitorServerURL =
  import.meta.env.VITE_CAPACITOR_SERVER_URL || capacitorPreset.url
const capacitorServerWSSUrl =
  import.meta.env.VITE_CAPACITOR_SERVER_URL_WSS || capacitorPreset.wss

export const BACKEND_URL = capacitorServerURL

export const serverURL = isCapacitorApp
  ? capacitorServerURL
  : import.meta.env.VITE_SERVER_URL || ""

export const serverWSSUrl = isCapacitorApp
  ? capacitorServerWSSUrl
  : import.meta.env.VITE_SERVER_URL_WSS ||
    `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`
