// Side-effect module: load `.env` into process.env before any other module
// reads it. Imported first (before logger/config) so import ordering — and thus
// which env values are visible at module-eval time — is deterministic.
//
// Uses Node's built-in .env parser (util.parseEnv, stable since Node 20.12), so
// there is no `dotenv` runtime dependency. Behavior matches the prior
// `dotenv.config({ quiet: true })`: silent, does NOT override values already in
// the environment, and is a no-op when `.env` is absent — in deploys the env is
// supplied by the orchestrator, not a file. (process.loadEnvFile is not used: it
// overrides existing vars and throws on a missing file, both of which differ.)
import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"

let contents = ""
try {
  contents = readFileSync(".env", "utf8")
} catch {
  // No readable .env — env comes from the real environment, exactly as dotenv
  // silently no-ops when the file is missing.
}

if (contents) {
  const parsed = parseEnv(contents)
  for (const key of Object.keys(parsed)) {
    // Don't clobber values already present in the environment (dotenv semantics).
    if (process.env[key] === undefined) process.env[key] = parsed[key]
  }
}
