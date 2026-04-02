export const backendURL = import.meta.env.VITE_BACKEND_URL || ""

export const backendWSSUrl =
  import.meta.env.VITE_BACKEND_URL_WSS ||
  `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`
