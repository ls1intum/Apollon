#!/bin/sh
# Runtime entrypoint for the Apollon webapp container.
#
# - Writes /usr/share/nginx/html/env.js with a window.__APOLLON_ENV__ object
#   so the immutable nginx image can pick up runtime env (LEGAL_PROFILE)
#   without a rebuild.
# - Validates LEGAL_PROFILE and emits a loud WARN when a misconfigured value
#   would silently fall through to the compliance-violating disclaimer.

set -eu

HTML_DIR="/usr/share/nginx/html"
ENV_FILE="${HTML_DIR}/env.js"
PROFILES_DIR="${HTML_DIR}/legal/profiles"

log() { printf '[apollon-entrypoint] %s\n' "$*" >&2; }

# JSON-escape only the characters that would actually break a JS string literal.
js_escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/</\\u003C/g' -e 's/>/\\u003E/g' -e "s/'/\\\\'/g"
}

LEGAL_PROFILE_VALUE="${LEGAL_PROFILE:-}"

if [ -n "$LEGAL_PROFILE_VALUE" ]; then
  if ! printf '%s' "$LEGAL_PROFILE_VALUE" | grep -Eq '^[a-z0-9][a-z0-9_-]{0,31}$'; then
    log "WARN: LEGAL_PROFILE='${LEGAL_PROFILE_VALUE}' is not a valid profile name (lowercase [a-z0-9_-], max 32 chars). Falling back to the built-in disclaimer. See docs/admin/legal-pages.md."
    LEGAL_PROFILE_VALUE=""
  elif [ ! -d "${PROFILES_DIR}/${LEGAL_PROFILE_VALUE}" ]; then
    available=""
    if [ -d "$PROFILES_DIR" ]; then
      available=$(ls -1 "$PROFILES_DIR" 2>/dev/null | tr '\n' ' ')
    fi
    log "WARN: LEGAL_PROFILE='${LEGAL_PROFILE_VALUE}' has no bundled profile at ${PROFILES_DIR}/${LEGAL_PROFILE_VALUE}. Available: ${available:-none}. Falling back to disclaimer unless /legal-overrides/ is mounted. See docs/admin/legal-pages.md."
  else
    log "Legal profile '${LEGAL_PROFILE_VALUE}' resolved to ${PROFILES_DIR}/${LEGAL_PROFILE_VALUE}."
  fi
fi

escaped_profile=$(js_escape "$LEGAL_PROFILE_VALUE")

cat > "$ENV_FILE" <<EOF
window.__APOLLON_ENV__ = {
  LEGAL_PROFILE: "${escaped_profile}"
};
EOF

log "Wrote runtime env to ${ENV_FILE}."
