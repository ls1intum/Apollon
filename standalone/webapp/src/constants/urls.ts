const isDev = import.meta.env.DEV

export const backendURL =
  import.meta.env.VITE_BACKEND_URL || (isDev ? "" : "http://localhost:8000")

export const backendWSSUrl =
  import.meta.env.VITE_BACKEND_URL_WSS ||
  (isDev
    ? `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`
    : "ws://localhost:4444")

export const serverURL = import.meta.env.VITE_SERVER_URL || ""

export const serverWSSUrl =
  import.meta.env.VITE_SERVER_URL_WSS ||
  `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`
