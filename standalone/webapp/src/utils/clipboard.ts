import { isPlatform } from "@ionic/react"
import { Clipboard } from "@capacitor/clipboard"

/** Platform-aware clipboard write: Capacitor on native, Web API otherwise. */
export async function copyToClipboard(value: string): Promise<void> {
  if (isPlatform("capacitor")) {
    await Clipboard.write({ string: value })
  } else {
    await navigator.clipboard.writeText(value)
  }
}
