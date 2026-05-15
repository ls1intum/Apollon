import { isPlatform } from "@ionic/react"

export const isCapacitorApp =
  isPlatform("ios") || isPlatform("android") || isPlatform("capacitor")

export const BACKEND_URL = "https://apollon-staging.aet.cit.tum.de"

export const serverURL = isCapacitorApp
  ? BACKEND_URL
  : import.meta.env.VITE_SERVER_URL || ""

export const serverWSSUrl = isCapacitorApp
  ? `wss://apollon-staging.aet.cit.tum.de/ws`
  : import.meta.env.VITE_SERVER_URL_WSS ||
    `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`
