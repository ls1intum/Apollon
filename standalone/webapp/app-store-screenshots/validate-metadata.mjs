import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const appDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const metadataDirectory = path.join(appDirectory, "fastlane", "metadata")
const localeDirectory = path.join(metadataDirectory, "en-US")
const skipUrls = process.argv.includes("--skip-urls")

const read = (directory, filename) =>
  fs.readFileSync(path.join(directory, filename), "utf8").trim()

const fields = {
  name: read(localeDirectory, "name.txt"),
  subtitle: read(localeDirectory, "subtitle.txt"),
  keywords: read(localeDirectory, "keywords.txt"),
  promotionalText: read(localeDirectory, "promotional_text.txt"),
  description: read(localeDirectory, "description.txt"),
  copyright: read(metadataDirectory, "copyright.txt"),
}

const limits = {
  name: 30,
  subtitle: 30,
  keywords: 100,
  promotionalText: 170,
  description: 4000,
}

for (const [field, limit] of Object.entries(limits)) {
  const length = [...fields[field]].length
  if (length > limit) {
    throw new Error(`${field} is ${length} characters; maximum is ${limit}`)
  }
}

const keywords = fields.keywords.split(",")
if (keywords.some((keyword) => keyword !== keyword.trim())) {
  throw new Error("Keywords must be comma-separated without padding spaces")
}
if (
  new Set(keywords.map((keyword) => keyword.toLowerCase())).size !==
  keywords.length
) {
  throw new Error("Keywords must not contain duplicate terms")
}
if (!/^20\d{2} TUM Applied Education Technologies$/.test(fields.copyright)) {
  throw new Error("Copyright must use the established App Store owner name")
}

const publicUrls = {
  marketing: read(localeDirectory, "marketing_url.txt"),
  support: read(localeDirectory, "support_url.txt"),
  privacy: read(localeDirectory, "privacy_url.txt"),
}

for (const [label, value] of Object.entries(publicUrls)) {
  const url = new URL(value)
  if (url.protocol !== "https:") {
    throw new Error(`${label} URL must use HTTPS: ${value}`)
  }
}

if (!skipUrls) {
  for (const [label, value] of Object.entries(publicUrls)) {
    const response = await fetch(value, {
      headers: {
        "user-agent": "Apollon-App-Store-Metadata-Validator/1.0",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    })

    if (!response.ok) {
      throw new Error(
        `${label} URL returned ${response.status}: ${response.url}`
      )
    }

    const contentType = response.headers.get("content-type") ?? ""
    if (!contentType.includes("text/html")) {
      throw new Error(
        `${label} URL must resolve to an HTML page, received ${contentType}`
      )
    }
  }
}

console.log(
  `Validated App Store metadata${skipUrls ? " (public URL checks skipped)" : " and public URLs"}`
)
