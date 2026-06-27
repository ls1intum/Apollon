// Side-effect module: load `.env` into process.env before any other module
// reads it. Imported first (before logger/config) so import ordering — and thus
// which env values are visible at module-eval time — matches the pre-dotenv@17
// `import "dotenv/config"` behavior.
//
// dotenv@17 prints an "injected env (…)" banner to the console on load; we pass
// `{ quiet: true }` to suppress it and keep the previously-silent startup.
// https://github.com/motdotla/dotenv/releases (v17.0.0)
import { config } from "dotenv"

config({ quiet: true })
