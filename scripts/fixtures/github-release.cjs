#!/usr/bin/env node
const { readFileSync, writeFileSync } = require("node:fs")
const { join } = require("node:path")
const args = process.argv.slice(2)
const state = JSON.parse(readFileSync(process.env.GH_STATE, "utf8"))
state.calls.push(args)
const save = () => writeFileSync(process.env.GH_STATE, JSON.stringify(state))
const fail = (status) => {
  save()
  console.error(`HTTP ${status}`)
  process.exit(1)
}
if (state.fail === args[1]) {
  delete state.fail
  fail(503)
}
if (state.fail === "api") fail(403)
if (args[0] === "api") {
  if (args.includes("POST")) {
    state.tag = args.find((arg) => arg.startsWith("sha=")).slice(4)
  } else if (args[1].includes("git/ref/")) {
    if (!state.tag) fail(404)
    console.log(JSON.stringify({ object: { sha: state.tag } }))
  } else {
    if (!state.release) fail(404)
    console.log(JSON.stringify({ draft: state.release === "draft" }))
  }
} else if (args[1] === "create") {
  state.release = "draft"
} else if (args[1] === "upload") {
  state.asset = readFileSync(args[3]).toString("base64")
} else if (args[1] === "download") {
  if (!state.asset) fail(404)
  writeFileSync(
    join(args[args.indexOf("--dir") + 1], "package.tgz"),
    Buffer.from(state.asset, "base64")
  )
} else if (args[1] === "edit") {
  state.release = "public"
} else {
  throw new Error(`Unexpected command: ${args.join(" ")}`)
}
save()
