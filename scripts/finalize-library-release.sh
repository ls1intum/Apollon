#!/usr/bin/env bash
set -euo pipefail

artifact=$1
version=$2
source_sha=$3
gh=${GH_BIN:-gh}
tag="@tumaet/apollon@$version"
temporary=$(mktemp -d)
trap 'rm -rf "$temporary"' EXIT

if "$gh" api "repos/$GITHUB_REPOSITORY/git/ref/tags/$tag" > "$temporary/tag.json" 2> "$temporary/error"; then
  test "$(jq -r .object.sha "$temporary/tag.json")" = "$source_sha"
else
  grep -q 'HTTP 404' "$temporary/error" || { cat "$temporary/error" >&2; exit 1; }
  "$gh" api --method POST "repos/$GITHUB_REPOSITORY/git/refs" -f "ref=refs/tags/$tag" -f "sha=$source_sha"
fi

if "$gh" api "repos/$GITHUB_REPOSITORY/releases/tags/$tag" > "$temporary/release.json" 2> "$temporary/error"; then
  draft=$(jq -r .draft "$temporary/release.json")
  [[ "$draft" = true || "$draft" = false ]]
else
  grep -q 'HTTP 404' "$temporary/error" || { cat "$temporary/error" >&2; exit 1; }
  "$gh" release create "$tag" --draft --verify-tag --target "$source_sha" --title "$tag" --latest=false --notes-file "$artifact/notes.md"
  draft=true
fi

# Draft assets can be repaired; public releases must not be modified.
if [ "$draft" = true ]; then
  "$gh" release upload "$tag" "$artifact/package.tgz" --clobber
fi
"$gh" release download "$tag" --pattern package.tgz --dir "$temporary"
cmp "$artifact/package.tgz" "$temporary/package.tgz"
if [ "$draft" = true ]; then
  "$gh" release edit "$tag" --draft=false --latest=false --title "$tag" --notes-file "$artifact/notes.md"
fi
