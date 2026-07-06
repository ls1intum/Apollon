// @ts-check
// Type-checks the fenced ```ts / ```tsx examples in the library docs against the
// real built @tumaet/apollon types, so published examples can't silently rot when
// the public API changes. Each block is a standalone module (must carry its own
// imports); tag a fence ```ts no-check to skip incomplete/framework-specific ones.
// See docs/contributor/development/scripts.md.

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  readdirSync,
} from "node:fs"
import { join, relative, extname } from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"

const repoRoot = fileURLToPath(new URL("..", import.meta.url))
const docsDir = join(repoRoot, "docs")

// Resolve the same TypeScript the docs use (not hoisted to the repo root).
const require = createRequire(join(docsDir, "package.json"))
/** @type {import("typescript")} */
const ts = require("typescript")

/** @param {string} dir @returns {string[]} */
function collectMarkdown(dir) {
  /** @type {string[]} */
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isSymbolicLink()) continue
    if (e.isDirectory()) out.push(...collectMarkdown(join(dir, e.name)))
    else if (extname(e.name) === ".md") out.push(join(dir, e.name))
  }
  return out
}

const DOC_FILES = [
  join(repoRoot, "library", "README.md"),
  join(repoRoot, "library", "THEMING.md"),
  ...collectMarkdown(join(docsDir, "library")),
]

const FENCE = /^```(ts|tsx)([^\n]*)$/

/** @param {string} file */
function extractBlocks(file) {
  const lines = readFileSync(file, "utf8").split("\n")
  /** @type {{fenceLine:number, startLine:number, code:string, skip:boolean}[]} */
  const blocks = []
  for (let i = 0; i < lines.length; i++) {
    const m = FENCE.exec(lines[i])
    if (!m) continue
    const bodyStart = i + 1
    let j = bodyStart
    while (j < lines.length && lines[j].trimEnd() !== "```") j++
    blocks.push({
      fenceLine: i + 1, // 1-based line of the ``` opening fence
      startLine: bodyStart + 1, // 1-based line of the first code line
      code: lines.slice(bodyStart, j).join("\n"),
      skip: /\bno-check\b/.test(m[2]),
    })
    i = j
  }
  return blocks
}

const workDir = join(docsDir, ".snippet-typecheck")
rmSync(workDir, { recursive: true, force: true })
mkdirSync(workDir, { recursive: true })
// `import "@tumaet/apollon/style.css"` resolves to a real .css file tsc can't type.
writeFileSync(join(workDir, "css-shim.d.ts"), `declare module "*.css";\n`)

/** @type {{virtual:string, file:string, fenceLine:number, srcStartLine:number}[]} */
const manifest = []
let total = 0
let skipped = 0
for (const file of DOC_FILES) {
  let n = 0
  for (const b of extractBlocks(file)) {
    n++
    if (b.skip) {
      skipped++
      continue
    }
    total++
    const rel = relative(repoRoot, file).replace(/[/\\.]/g, "_")
    const virtual = join(workDir, `${rel}__b${n}.tsx`)
    writeFileSync(virtual, b.code + "\n")
    manifest.push({
      virtual,
      file,
      fenceLine: b.fenceLine,
      srcStartLine: b.startLine,
    })
  }
}

/** @type {import("typescript").CompilerOptions} */
const options = {
  target: ts.ScriptTarget.ES2023,
  lib: ["lib.es2023.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  strict: true,
  skipLibCheck: true,
  resolveJsonModule: true,
  noEmit: true,
  baseUrl: docsDir, // route bare specifiers through docs/node_modules → library/dist
  types: ["react", "react-dom", "node"],
}

const program = ts.createProgram(
  [join(workDir, "css-shim.d.ts"), ...manifest.map((m) => m.virtual)],
  options
)
const diagnostics = [
  ...program.getSemanticDiagnostics(),
  ...program.getSyntacticDiagnostics(),
  ...program.getGlobalDiagnostics(),
]

const byVirtual = new Map(manifest.map((m) => [m.virtual, m]))
/** @type {Set<string>} */
const failingFences = new Set()
let failures = 0
for (const d of diagnostics) {
  const msg = ts.flattenDiagnosticMessageText(d.messageText, "\n")
  if (!d.file) {
    console.error(`✗ TS${d.code}: ${msg}`)
    failures++
    continue
  }
  const m = byVirtual.get(d.file.fileName)
  const { line, character } = d.file.getLineAndCharacterOfPosition(d.start ?? 0)
  if (!m) {
    console.error(
      `✗ ${d.file.fileName}:${line + 1}:${character + 1} TS${d.code}: ${msg}`
    )
    failures++
    continue
  }
  failingFences.add(`${relative(repoRoot, m.file)}:${m.fenceLine}`)
  console.error(
    `✗ ${relative(repoRoot, m.file)}:${m.srcStartLine + line}:${character + 1}  TS${d.code}: ${msg}`
  )
  failures++
}

rmSync(workDir, { recursive: true, force: true })

if (failures > 0) {
  console.error(
    `\nFailing blocks (fence line — fix the example or tag the fence \`\`\`ts no-check):`
  )
  for (const f of [...failingFences].sort()) console.error(`  ${f}`)
  console.error(
    `\n${failures} type error(s) across ${failingFences.size} block(s) (${total} checked, ${skipped} skipped).`
  )
  process.exit(1)
}
console.log(
  `✓ ${total} doc code example(s) type-check (${skipped} skipped as no-check)`
)
