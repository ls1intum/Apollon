import { isPlatform } from "@ionic/react"

export const isCapacitorApp =
  isPlatform("ios") || isPlatform("android") || isPlatform("capacitor")

const capacitorServerURL =
  import.meta.env.VITE_CAPACITOR_SERVER_URL || "http://localhost:8000"
const capacitorServerWSSUrl =
  import.meta.env.VITE_CAPACITOR_SERVER_URL_WSS || "ws://localhost:4444/ws"

export const BACKEND_URL = capacitorServerURL

export const serverURL = isCapacitorApp
  ? capacitorServerURL
  : import.meta.env.VITE_SERVER_URL || ""

export const serverWSSUrl = isCapacitorApp
  ? capacitorServerWSSUrl
  : import.meta.env.VITE_SERVER_URL_WSS ||
    `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`
