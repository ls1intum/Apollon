import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const modelPath = resolve(repositoryRoot, "library/dist/model.js")
const modelTypesPath = resolve(repositoryRoot, "library/dist/model.d.ts")

const pending = [pathToFileURL(modelPath)]
const visited = new Set()

while (pending.length > 0) {
  const url = pending.pop()
  if (!url || visited.has(url.href)) continue

  visited.add(url.href)
  const source = readFileSync(fileURLToPath(url), "utf8")
  if (/\b(?:document|window|HTMLElement)\b/.test(source)) {
    throw new Error(`${url.pathname} references a browser global`)
  }

  const specifiers = [
    ...source.matchAll(
      /\b(?:import|export)\s+(?:[^"'()]*?\s+from\s+)?["']([^"']+)["']/g
    ),
    ...source.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g),
  ].map((match) => match[1])

  for (const specifier of specifiers) {
    if (!specifier.startsWith(".")) {
      throw new Error(`${url.pathname} imports runtime dependency ${specifier}`)
    }
    pending.push(new URL(specifier, url))
  }
}

const modelTypes = readFileSync(modelTypesPath, "utf8")
for (const browserType of [
  "@xyflow/react",
  "@xyflow/system",
  "from 'react'",
  'from "react"',
]) {
  if (modelTypes.includes(browserType)) {
    throw new Error(
      `@tumaet/apollon/model declarations depend on ${browserType}`
    )
  }
}

const modelEntry = await import(pathToFileURL(modelPath).href)
if (typeof modelEntry.importDiagram !== "function") {
  throw new Error("@tumaet/apollon/model does not export importDiagram")
}

console.log(
  `Verified DOM-free @tumaet/apollon/model graph (${visited.size} modules)`
)
