#!/usr/bin/env node
const { readFileSync, writeFileSync } = require("node:fs")
const state = JSON.parse(readFileSync(process.env.NPM_STATE, "utf8"))
const args = process.argv.slice(2)
state.calls.push(args)
if (state.fail) {
  writeFileSync(process.env.NPM_STATE, JSON.stringify(state))
  process.exit(1)
}
if (args[0] === "view" && args.at(-1).startsWith("@tumaet/apollon@")) {
  // A staged version stays invisible until it is approved.
  state.pendingViews = (state.pendingViews ?? 0) - 1
  if (state.pendingViews >= 0 || state.published === undefined) {
    console.log(JSON.stringify({ error: { code: state.error ?? "E404" } }))
    writeFileSync(process.env.NPM_STATE, JSON.stringify(state))
    process.exit(1)
  }
  console.log(JSON.stringify(state.published))
} else if (args[0] === "view") {
  const result = args.at(-1) === "versions" ? state.versions : state.latest
  console.log(JSON.stringify(state.arrayResults ? [result] : result))
}
writeFileSync(process.env.NPM_STATE, JSON.stringify(state))
