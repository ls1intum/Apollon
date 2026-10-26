import assert from "node:assert/strict"
import semver from "semver"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

export function normalizeNpmView(value) {
  if (Array.isArray(value)) {
    assert.equal(value.length, 1, "npm view must return exactly one result")
    value = value[0]
  }
  assert.ok(
    typeof value === "string" ||
      (value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        !Object.hasOwn(value, "error")),
    "npm view must return a version or package metadata"
  )
  return value
}

export function validateVersion(version) {
  assert.equal(typeof version, "string", "Version must be a string")
  assert.equal(semver.valid(version), version, "Use canonical SemVer")
  assert.equal(semver.prerelease(version), null, "Use a stable release version")
  return version
}

export function validateNextVersion(version, latest) {
  validateVersion(version)
  validateVersion(latest)
  assert.ok(
    semver.gt(version, latest),
    "Stage only a version newer than npm latest"
  )
}

export function integrity(bytes) {
  return `sha512-${createHash("sha512").update(bytes).digest("base64")}`
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
    published = normalizeNpmView(published)
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
