import { isPlatform } from "@ionic/react"

export const isCapacitorApp =
  isPlatform("ios") || isPlatform("android") || isPlatform("capacitor")

export const serverURL = import.meta.env.VITE_SERVER_URL || ""

export const serverWSSUrl =
  import.meta.env.VITE_SERVER_URL_WSS ||
  `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`
