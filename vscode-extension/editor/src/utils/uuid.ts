// Webview runtime: VS Code 1.86+ ships Electron whose Chromium supports
// crypto.randomUUID() (Chromium 92+). No uuid package needed.
export const uuid = (): string => crypto.randomUUID()
