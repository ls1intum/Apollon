import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const directory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fastlane/screenshots-preview/en-US"
)

export default function globalSetup() {
  fs.rmSync(directory, { force: true, recursive: true })
  fs.mkdirSync(directory, { recursive: true })
}
