import assert from "node:assert/strict"
import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import test from "node:test"
import { parse } from "yaml"
import semver from "semver"
import {
  integrity,
  normalizeNpmView,
  shouldPromote,
  validateNextVersion,
  validateVersion,
  verifyArtifact,
} from "./library-release.mjs"

const sha = "a".repeat(40)
const bytes = Buffer.from("tested tarball")
const manifest = {
  name: "@tumaet/apollon",
  version: "5.3.2",
  sha,
  integrity: integrity(bytes),
}
const published = {
  name: manifest.name,
  version: manifest.version,
  dist: { integrity: manifest.integrity },
}
test("npm view accepts legacy results and singleton arrays, never ambiguous or error output", () => {
  for (const result of ["5.3.1", published]) {
    assert.equal(normalizeNpmView(result), result)
    assert.equal(normalizeNpmView([result]), result)
  }
  for (const result of [
    [],
    ["5.3.1", "5.3.2"],
    [["5.3.1"]],
    null,
    undefined,
    true,
    1,
    { error: { code: "E404" } },
    [{ error: { code: "E404" } }],
  ]) {
    assert.throws(() => normalizeNpmView(result))
  }
  assert.throws(() => validateVersion(["5.3.1"]))
})

test("only canonical stable release versions are accepted", () => {
  for (const version of ["0.0.0", "5.3.2", "10.20.30"])
    assert.equal(validateVersion(version), version)
  for (const version of [
    undefined,
    1,
    "01.2.3",
    "1.2",
    "v1.2.3",
    "1.2.3-beta.1",
    "1.2.3+build",
    "1.2.3\n",
    "$(id)",
  ]) {
    assert.throws(() => validateVersion(version))
  }
})

test("staging cannot replace latest with the same or an older version", () => {
  for (const [next, latest] of [
    ["5.10.0", "5.9.9"],
    ["6.0.0", "5.9.9"],
    ["5.3.2", "5.3.1"],
  ])
    validateNextVersion(next, latest)
  for (const next of ["5.3.1", "5.2.9", "4.99.99", "5.3.2-beta.1"])
    assert.throws(() => validateNextVersion(next, "5.3.1"))
})

test("latest promotion never moves backwards, including out-of-order approvals", () => {
  assert.equal(shouldPromote("5.4.0", "5.3.1"), true)
  assert.equal(shouldPromote("5.4.0", "5.4.0"), false)
  assert.equal(shouldPromote("5.3.2", "5.4.0"), false)
})

test("exact tested bytes must be published before finalization", () => {
  assert.deepEqual(verifyArtifact(manifest, bytes, sha), {
    version: "5.3.2",
    integrity: manifest.integrity,
  })
  assert.deepEqual(verifyArtifact(manifest, bytes, sha, published), {
    version: "5.3.2",
    integrity: manifest.integrity,
  })
  assert.deepEqual(verifyArtifact(manifest, bytes, sha, [published]), {
    version: "5.3.2",
    integrity: manifest.integrity,
  })
  for (const result of [
    [],
    [published, published],
    [[published]],
    [{ error: {} }],
  ])
    assert.throws(() => verifyArtifact(manifest, bytes, sha, result))
  assert.throws(() =>
    verifyArtifact(manifest, Buffer.from("changed"), sha, published)
  )
  assert.throws(() =>
    verifyArtifact(manifest, bytes, "b".repeat(40), published)
  )
  for (const change of [
    { name: "other" },
    { version: "5.3.1" },
    { dist: {} },
    { dist: { integrity: integrity(Buffer.from("other")) } },
  ]) {
    assert.throws(() =>
      verifyArtifact(manifest, bytes, sha, { ...published, ...change })
    )
  }
  assert.throws(() => verifyArtifact(manifest, bytes, sha, {}))
  assert.throws(() =>
    verifyArtifact({ ...manifest, name: "other" }, bytes, sha)
  )
})

const workflow = parse(
  readFileSync(
    new URL("../.github/workflows/release-library.yml", import.meta.url),
    "utf8"
  )
)

test("workflow permissions and artifact identity preserve the release boundary", () => {
  assert.deepEqual(workflow.permissions, {})
  assert.deepEqual(workflow.jobs.build.permissions, { contents: "read" })
  assert.deepEqual(workflow.jobs.stage.permissions, { "id-token": "write" })
  assert.equal(workflow.jobs.stage.environment, "npm-publish")
  assert.deepEqual(workflow.jobs.promote.permissions, { "id-token": "write" })
  assert.equal(workflow.jobs.promote.environment, "npm-promote")
  assert.deepEqual(workflow.jobs.finalize.permissions, { contents: "read" })
  assert.deepEqual(workflow.jobs.release.permissions, { contents: "write" })
  assert.equal(workflow.jobs.build.needs, "check")
  assert.deepEqual(workflow.jobs.finalize.needs, ["build", "stage"])
  // npm can accept an upload whose response is lost, so a failed stage job
  // must still reach the approval checks.
  assert.equal(
    workflow.jobs.finalize.if,
    "${{ !cancelled() && needs.build.result == 'success' }}"
  )
  const stageActions = workflow.jobs.stage.steps
    .filter((step) => step.uses)
    .map((step) => step.uses.split("@")[0])
  assert.deepEqual(stageActions, [
    "actions/setup-node",
    "actions/download-artifact",
  ])
  const upload = workflow.jobs.build.steps.find((step) => step.id === "upload")
  assert.equal(upload.with.name, "library-release-${{ github.run_attempt }}")
  for (const job of ["finalize", "release"]) {
    const download = workflow.jobs[job].steps.find((step) =>
      step.uses?.startsWith("actions/download-artifact@")
    )
    assert.equal(
      download.with["artifact-ids"],
      "${{ needs.build.outputs.artifact-id }}"
    )
  }
  const checks = parse(
    readFileSync(
      new URL("../.github/workflows/pr-health-checks.yml", import.meta.url),
      "utf8"
    )
  )
  assert.ok(
    checks.jobs["pr-health-gate"].needs.includes("library-release-policy")
  )
})

test("release workflows queue pending versions instead of replacing them", () => {
  for (const name of [
    "release-library",
    "release-standalone",
    "release-vscode-extension",
  ]) {
    const config = parse(
      readFileSync(
        new URL(`../.github/workflows/${name}.yml`, import.meta.url),
        "utf8"
      )
    )
    assert.equal(config.concurrency.queue, "max")
    assert.equal(config.concurrency["cancel-in-progress"], false)
  }
  for (const name of ["release", "docs", "pr-health-checks"]) {
    const config = parse(
      readFileSync(
        new URL(`../.github/workflows/${name}.yml`, import.meta.url),
        "utf8"
      )
    )
    assert.equal(config.concurrency.queue, undefined)
  }
})

test("version PRs use the built-in token and cannot publish packages or tags", () => {
  const config = parse(
    readFileSync(
      new URL("../.github/workflows/release.yml", import.meta.url),
      "utf8"
    )
  )
  const job = config.jobs.version
  assert.equal(job.environment, "version-pr")
  assert.deepEqual(job.permissions, {
    contents: "write",
    "pull-requests": "write",
  })
  assert.equal(
    job.steps.some((step) => step.id === "app-token"),
    false
  )
  const version = job.steps.find((step) =>
    step.uses?.startsWith("changesets/action@")
  )
  assert.equal(version.with["github-token"], "${{ github.token }}")
  assert.equal(version.with.version, "pnpm run changeset:version")
  assert.equal(version.with.publish, undefined)
  assert.equal(version.with.createGithubReleases, false)
  assert.equal(version.with.commitMode, "github-api")
  assert.equal(version.with.prDraft, undefined)
  assert.match(
    version.uses,
    /#|changesets\/action@a45c4d594aa4e2c509dc14a9f2b3b67ba3780d0d/
  )
})

test("CLI fails closed for absent approval, corrupt artifacts, and invalid registry JSON", () => {
  const directory = mkdtempSync(join(tmpdir(), "apollon-release-"))
  const script = fileURLToPath(
    new URL("./library-release.mjs", import.meta.url)
  )
  const publishedFile = join(directory, "published.json")
  const execute = () =>
    spawnSync(process.execPath, [script, directory, publishedFile], {
      encoding: "utf8",
      env: { ...process.env, SOURCE_SHA: sha },
    })
  try {
    writeFileSync(join(directory, "manifest.json"), JSON.stringify(manifest))
    writeFileSync(join(directory, "package.tgz"), bytes)
    assert.notEqual(execute().status, 0)
    for (const data of [published, [published]]) {
      writeFileSync(publishedFile, JSON.stringify(data))
      const result = execute()
      assert.equal(result.status, 0, result.stderr)
      assert.deepEqual(JSON.parse(result.stdout), {
        version: manifest.version,
        integrity: manifest.integrity,
      })
    }
    for (const data of [[], [published, published], [{ error: {} }]]) {
      writeFileSync(publishedFile, JSON.stringify(data))
      assert.notEqual(execute().status, 0)
    }
    writeFileSync(publishedFile, "not registry JSON")
    assert.notEqual(execute().status, 0)
    writeFileSync(publishedFile, JSON.stringify(published))
    writeFileSync(join(directory, "package.tgz"), "modified package")
    assert.notEqual(execute().status, 0)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

function releaseFixture(t, initial = {}) {
  const directory = mkdtempSync(join(tmpdir(), "apollon-finalize-"))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const stateFile = join(directory, "state.json")
  const gh = join(directory, "gh")
  writeFileSync(
    gh,
    readFileSync(new URL("./fixtures/github-release.cjs", import.meta.url)),
    { mode: 0o700 }
  )
  writeFileSync(stateFile, JSON.stringify({ calls: [], ...initial }))
  writeFileSync(join(directory, "package.tgz"), bytes)
  writeFileSync(join(directory, "notes.md"), "Release notes")
  return {
    run: () =>
      spawnSync(
        "bash",
        [
          fileURLToPath(
            new URL("./finalize-library-release.sh", import.meta.url)
          ),
          directory,
          manifest.version,
          sha,
        ],
        {
          encoding: "utf8",
          timeout: 5000,
          env: {
            ...process.env,
            GH_BIN: gh,
            GH_STATE: stateFile,
            GITHUB_REPOSITORY: "ls1intum/Apollon",
          },
        }
      ),
    state: () => JSON.parse(readFileSync(stateFile, "utf8")),
  }
}

test("release creation verifies the uploaded bytes before publishing, and retries are read-only", (t) => {
  const fixture = releaseFixture(t)
  const first = fixture.run()
  assert.equal(first.status, 0, first.stderr)
  const state = fixture.state()
  assert.equal(state.tag, sha)
  assert.equal(state.release, "public")
  assert.deepEqual(
    state.calls.filter((args) => args[0] === "release").map((args) => args[1]),
    ["create", "upload", "download", "edit"]
  )
  assert.ok(
    state.calls.find((args) => args[1] === "create").includes("--draft")
  )
  assert.equal(fixture.run().status, 0)
  assert.deepEqual(
    fixture
      .state()
      .calls.slice(state.calls.length)
      .filter((args) => args[0] === "release")
      .map((args) => args[1]),
    ["download"]
  )
})

for (const failedCommand of ["upload", "edit"]) {
  test(`release resumes safely after a failed ${failedCommand}`, (t) => {
    const fixture = releaseFixture(t, { fail: failedCommand })
    assert.notEqual(fixture.run().status, 0)
    assert.equal(fixture.state().release, "draft")
    const retry = fixture.run()
    assert.equal(retry.status, 0, retry.stderr)
    assert.equal(fixture.state().release, "public")
  })
}

test("conflicting tags, API failures, and corrupt public assets never cause publication", (t) => {
  for (const initial of [
    { tag: "b".repeat(40) },
    { fail: "api" },
    {
      tag: sha,
      release: "public",
      asset: Buffer.from("wrong bytes").toString("base64"),
    },
    { tag: sha, release: "public" },
  ]) {
    const fixture = releaseFixture(t, initial)
    assert.notEqual(fixture.run().status, 0)
    assert.ok(
      fixture
        .state()
        .calls.every((args) => !["create", "upload", "edit"].includes(args[1]))
    )
  }
})

function stepFixture(t, script, files, npmState, environment = {}) {
  const directory = mkdtempSync(join(tmpdir(), "apollon-step-"))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const stateFile = join(directory, "npm.json")
  writeFileSync(
    join(directory, "npm"),
    readFileSync(new URL("./fixtures/npm.cjs", import.meta.url)),
    { mode: 0o700 }
  )
  writeFileSync(stateFile, JSON.stringify({ calls: [], ...npmState }))
  for (const [file, contents] of Object.entries(files)) {
    mkdirSync(dirname(join(directory, file)), { recursive: true })
    writeFileSync(join(directory, file), contents)
  }
  const output = join(directory, "output")
  return {
    directory,
    run: () =>
      spawnSync(
        "bash",
        ["--noprofile", "--norc", "-e", "-o", "pipefail", "-c", script],
        {
          cwd: directory,
          encoding: "utf8",
          timeout: 5000,
          env: {
            ...process.env,
            PATH: `${directory}:${process.env.PATH}`,
            NPM_STATE: stateFile,
            GITHUB_OUTPUT: output,
            GITHUB_STEP_SUMMARY: join(directory, "summary"),
            ...environment,
          },
        }
      ),
    state: () => JSON.parse(readFileSync(stateFile, "utf8")),
    output: () => readFileSync(output, "utf8"),
  }
}

test("build and finalize normalize latest metadata before version checks and outputs", (t) => {
  const helperUrl = new URL("./library-release.mjs", import.meta.url).href
  for (const [job, stepId] of [
    ["build", "identity"],
    ["finalize", "verified"],
  ]) {
    const run = workflow.jobs[job].steps.find((step) => step.id === stepId).run
    const script = run.slice(run.indexOf("node --input-type=module <<'NODE'"))
    for (const data of [
      "5.3.1",
      ["5.3.1"],
      [],
      ["5.3.1", "5.3.2"],
      { error: {} },
    ]) {
      const fixture = stepFixture(
        t,
        script,
        {
          "scripts/library-release.mjs": `export * from ${JSON.stringify(helperUrl)}`,
          "library/package.json": JSON.stringify(manifest),
          "verified.json": JSON.stringify(manifest),
          "latest.json": JSON.stringify(data),
          ".nvmrc": "24.21.0\n",
        },
        {}
      )
      const result = fixture.run()
      const valid =
        typeof data === "string" || (Array.isArray(data) && data.length === 1)
      assert.equal(result.status === 0, valid, result.stderr)
      if (valid && job === "finalize") {
        assert.match(fixture.output(), /\nlatest=5\.3\.1\npromote=true\n/)
      }
    }
  }
})

test("staging invokes native npm only after checking the actual tarball", (t) => {
  const script = workflow.jobs.stage.steps.find(
    (step) => step.env?.EXPECTED_INTEGRITY
  ).run
  for (const contents of [bytes, Buffer.from("corrupt tarball")]) {
    const fixture = stepFixture(
      t,
      script,
      { "artifact/package.tgz": contents },
      {},
      { EXPECTED_INTEGRITY: manifest.integrity }
    )
    const result = fixture.run()
    if (contents === bytes) {
      assert.equal(result.status, 0, result.stderr)
      assert.deepEqual(fixture.state().calls, [
        [
          "stage",
          "publish",
          "./artifact/package.tgz",
          "--ignore-scripts",
          "--access",
          "public",
          "--provenance",
          "--tag",
          "next",
        ],
      ])
    } else {
      assert.notEqual(result.status, 0)
      assert.deepEqual(fixture.state().calls, [])
    }
  }
})

test("finalization waits for the npm approval and fails on other registry errors", (t) => {
  const script = workflow.jobs.finalize.steps.find(
    (step) => step.id === "approval"
  ).run
  for (const [npmState, approved] of [
    [{ published, pendingViews: 2 }, true],
    [{ published, pendingViews: 1, error: "E401" }, false],
  ]) {
    const fixture = stepFixture(
      t,
      script,
      {
        "artifact/manifest.json": JSON.stringify(manifest),
        // Approval polling must not slow the test down.
        sleep: "#!/bin/sh\n",
      },
      npmState
    )
    chmodSync(join(fixture.directory, "sleep"), 0o700)
    const result = fixture.run()
    assert.equal(result.status === 0, approved, result.stderr)
    if (approved) {
      assert.equal(fixture.state().calls.length, 3)
      assert.deepEqual(
        JSON.parse(readFileSync(join(fixture.directory, "published.json"))),
        published
      )
    }
  }
})

test("promotion checks for concurrent tag changes and verifies the new tag", (t) => {
  const script = workflow.jobs.promote.steps.find(
    (step) => step.env?.EXPECTED_LATEST
  ).run
  for (const [latest, arrayResults] of [
    ["5.3.1", false],
    ["5.3.1", true],
    [manifest.version, true],
    ["5.4.0", true],
    [[], false],
    [["5.3.1", "5.3.2"], false],
    [[["5.3.1"]], false],
    [{ error: { code: "E404" } }, false],
  ]) {
    const fixture = stepFixture(
      t,
      script,
      {},
      { latest, arrayResults },
      { VERSION: manifest.version, EXPECTED_LATEST: "5.3.1" }
    )
    const result = fixture.run()
    assert.equal(
      result.status === 0,
      latest === "5.3.1" || latest === manifest.version,
      result.stderr
    )
    assert.deepEqual(
      fixture.state().latest,
      latest === "5.3.1" ? manifest.version : latest
    )
    const promotions = fixture
      .state()
      .calls.filter((args) => args[0] === "dist-tag")
    assert.equal(promotions.length, latest === "5.3.1" ? 1 : 0)
  }
  for (const failure of [{ fail: true }, { failAfterPromotion: true }]) {
    const fixture = stepFixture(
      t,
      script,
      {},
      { latest: "5.3.1", arrayResults: true, ...failure },
      { VERSION: manifest.version, EXPECTED_LATEST: "5.3.1" }
    )
    assert.notEqual(fixture.run().status, 0)
  }
})

test("a promotion retry after a lost response leaves the moved tag alone", (t) => {
  const script = workflow.jobs.promote.steps.find(
    (step) => step.env?.EXPECTED_LATEST
  ).run
  const fixture = stepFixture(
    t,
    script,
    {},
    { latest: "5.3.1", arrayResults: true, failAfterPromotion: true },
    { VERSION: manifest.version, EXPECTED_LATEST: "5.3.1" }
  )
  assert.notEqual(fixture.run().status, 0)
  const state = fixture.state()
  assert.equal(state.latest, manifest.version)
  writeFileSync(
    join(fixture.directory, "npm.json"),
    JSON.stringify({ ...state, failAfterPromotion: false })
  )
  const retry = fixture.run()
  assert.equal(retry.status, 0, retry.stderr)
  assert.equal(
    fixture.state().calls.filter((args) => args[0] === "dist-tag").length,
    1
  )
})

test("docs deployment waits for the public version and does not hide registry failures", (t) => {
  const docs = parse(
    readFileSync(
      new URL("../.github/workflows/docs.yml", import.meta.url),
      "utf8"
    )
  )
  assert.equal(
    docs.jobs.deploy.if,
    "needs.build.outputs.is-production == 'true' && needs.build.outputs.published == 'true'"
  )
  assert.deepEqual(docs.on.workflow_run.workflows, ["Release Library"])
  // A release run can fail after npm accepted the version (e.g. a lost
  // staging response); the npm check below decides about the deployment.
  assert.equal(docs.jobs.build.if, undefined)
  // A release completion builds the current main (GITHUB_SHA of the
  // workflow_run event), not the older release commit.
  const checkout = docs.jobs.build.steps.find((step) =>
    step.uses?.startsWith("actions/checkout@")
  )
  assert.equal(checkout.with.ref, undefined)
  const script = docs.jobs.build.steps.find((step) => step.id === "npm").run
  for (const state of [
    { versions: [manifest.version] },
    { versions: ["5.3.1"] },
    { fail: true },
  ]) {
    const fixture = stepFixture(
      t,
      script,
      { "library/package.json": JSON.stringify(manifest) },
      state
    )
    const result = fixture.run()
    if (state.fail) assert.notEqual(result.status, 0)
    else {
      assert.equal(result.status, 0, result.stderr)
      assert.equal(
        fixture.output(),
        `published=${state.versions.includes(manifest.version)}\n`
      )
    }
  }
})

test("automatic staging ignores manifest-only edits and compares the whole push", (t) => {
  const gitDirectory = spawnSync("git", ["rev-parse", "--absolute-git-dir"], {
    encoding: "utf8",
  }).stdout.trim()
  const before = spawnSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).stdout.trim()
  const previous = JSON.parse(
    spawnSync("git", ["show", `${before}:library/package.json`], {
      encoding: "utf8",
    }).stdout
  )
  const script = workflow.jobs.check.steps.find(
    (step) => step.id === "version"
  ).run
  for (const [event, version, changed] of [
    ["push", previous.version, false],
    ["push", semver.inc(previous.version, "patch"), true],
    ["workflow_dispatch", previous.version, true],
  ]) {
    const fixture = stepFixture(
      t,
      script,
      {
        "library/package.json": JSON.stringify({
          ...previous,
          version,
          description: "Manifest edit",
        }),
      },
      {},
      {
        GIT_DIR: gitDirectory,
        BEFORE_SHA: before,
        GITHUB_EVENT_NAME: event,
      }
    )
    const result = fixture.run()
    assert.equal(result.status, 0, result.stderr)
    assert.equal(fixture.output(), `changed=${changed}\n`)
  }
})
