#!/bin/bash

set -euo pipefail

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
output_directory="${script_directory}/../fastlane/device-frames"
working_directory="$(mktemp -d)"
iphone_mount="${working_directory}/iphone"
ipad_mount="${working_directory}/ipad"
iphone_dmg="${working_directory}/iphone-17.dmg"
ipad_dmg="${working_directory}/ipad-pro-m5.dmg"

cleanup() {
    hdiutil detach "${iphone_mount}" >/dev/null 2>&1 || true
    hdiutil detach "${ipad_mount}" >/dev/null 2>&1 || true
    rm -rf "${working_directory}"
}
trap cleanup EXIT

mkdir -p "${iphone_mount}" "${ipad_mount}" "${output_directory}"

curl --fail --location --retry 3 \
    --output "${iphone_dmg}" \
    "https://devimages-cdn.apple.com/design/resources/download/Bezel-iPhone-17.dmg"
curl --fail --location --retry 3 \
    --output "${ipad_dmg}" \
    "https://devimages-cdn.apple.com/design/resources/download/Bezel-iPad-Pro-%28M5%29.dmg"

printf '%s  %s\n' \
    "d82865f755b94576a61ee29e306193de600b6a4aba81315f6651fd4b652ce222" \
    "${iphone_dmg}" \
    "ebde5f7249d416ad83d2d14881c31a0ae3ed8343643d26a0fbf61195aeb06f0f" \
    "${ipad_dmg}" |
    shasum -a 256 --check

APOLLON_DMG_PATH="${iphone_dmg}" \
    APOLLON_MOUNT_PATH="${iphone_mount}" \
    /usr/bin/expect \
    "${script_directory}/accept-and-mount-apple-design-resource.exp"
APOLLON_DMG_PATH="${ipad_dmg}" \
    APOLLON_MOUNT_PATH="${ipad_mount}" \
    /usr/bin/expect \
    "${script_directory}/accept-and-mount-apple-design-resource.exp"

cp \
    "${iphone_mount}/PNG/iPhone 17 Pro Max/iPhone 17 Pro Max - Deep Blue - Portrait.png" \
    "${output_directory}/iphone-17-pro-max-deep-blue.png"
cp \
    "${ipad_mount}/PNG/iPad Pro (M5) 13\" - Space Black - Landscape.png" \
    "${output_directory}/ipad-pro-m5-space-black-landscape.png"

printf '%s  %s\n' \
    "5201a518fd2d3c6f968ad522a195c24793d7583e1d011d618aa705383bdde4da" \
    "${output_directory}/iphone-17-pro-max-deep-blue.png" \
    "1baa558379ab9e0d7e43089927fe9c7f4a16cc020d0675bc21a8c1c898ca619e" \
    "${output_directory}/ipad-pro-m5-space-black-landscape.png" |
    shasum -a 256 --check

echo "Authorized Apple product bezels prepared in ${output_directory}"
