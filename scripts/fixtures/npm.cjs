#!/usr/bin/env node
const { readFileSync, writeFileSync } = require("node:fs")
const state = JSON.parse(readFileSync(process.env.NPM_STATE, "utf8"))
const args = process.argv.slice(2)
state.calls.push(args)
if (
  state.fail ||
  (state.failAfterPromotion &&
    args[0] === "view" &&
    state.calls.some((call) => call[0] === "dist-tag"))
) {
  writeFileSync(process.env.NPM_STATE, JSON.stringify(state))
  process.exit(1)
}
if (args[0] === "view") {
  const result = args.at(-1) === "versions" ? state.versions : state.latest
  console.log(JSON.stringify(state.arrayResults ? [result] : result))
} else if (args[0] === "dist-tag") {
  state.latest = args[2].split("@").at(-1)
}
writeFileSync(process.env.NPM_STATE, JSON.stringify(state))
