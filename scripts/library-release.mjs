import assert from "node:assert/strict"
import semver from "semver"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

export function validateVersion(version) {
  assert.equal(typeof version, "string", "Version must be a string")
  assert.equal(semver.valid(version), version, "Use canonical SemVer")
  assert.equal(semver.prerelease(version), null, "Use a stable release version")
  return version
}

export function validateNextVersion(version, latest) {
  assert.ok(
    shouldPromote(version, latest),
    "Stage only a version newer than npm latest"
  )
}

export function shouldPromote(version, latest) {
  validateVersion(version)
  validateVersion(latest)
  return semver.gt(version, latest)
}

export function integrity(bytes) {
  return `sha512-${createHash("sha512").update(bytes).digest("base64")}`
}

export function validateStagingArtifact(artifact, run) {
  assert.match(artifact.name, /^library-release-[1-9][0-9]*$/)
  assert.equal(
    artifact.expired,
    false,
    "The original artifact must still be available"
  )
  assert.ok(Number.isSafeInteger(run.id) && run.id > 0)
  assert.equal(artifact.workflow_run?.id, run.id)
  assert.equal(artifact.workflow_run.head_sha, run.head_sha)
  assert.equal(artifact.workflow_run.head_branch, "main")
  assert.equal(run.path, ".github/workflows/release-library.yml")
  assert.equal(run.head_branch, "main")
  assert.equal(run.head_repository?.full_name, "ls1intum/Apollon")
  assert.ok(["push", "workflow_dispatch"].includes(run.event))
  assert.equal(run.status, "completed", "Wait for the staging run to finish")
  assert.match(run.head_sha, /^[a-f0-9]{40}$/)
  // A lost staging response can fail the run after npm accepted the upload.
  // Publication and byte identity, not run success, are the final authority.
}

export function verifyArtifact(manifest, bytes, sha, published) {
  assert.equal(manifest.name, "@tumaet/apollon")
  validateVersion(manifest.version)
  assert.match(sha, /^[a-f0-9]{40}$/)
  assert.equal(manifest.sha, sha, "Artifact must belong to the selected run")
  assert.equal(
    manifest.integrity,
    integrity(bytes),
    "Artifact integrity mismatch"
  )
  if (published !== undefined) {
    assert.equal(published.name, manifest.name)
    assert.equal(published.version, manifest.version)
    assert.equal(
      published.dist?.integrity,
      manifest.integrity,
      "npm must contain the exact tested tarball"
    )
  }
  return { version: manifest.version, integrity: manifest.integrity }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [directory, publishedFile] = process.argv.slice(2)
  const manifest = JSON.parse(
    readFileSync(`${directory}/manifest.json`, "utf8")
  )
  const published = publishedFile
    ? JSON.parse(readFileSync(publishedFile, "utf8"))
    : undefined
  console.log(
    JSON.stringify(
      verifyArtifact(
        manifest,
        readFileSync(`${directory}/package.tgz`),
        process.env.SOURCE_SHA,
        published
      )
    )
  )
}
