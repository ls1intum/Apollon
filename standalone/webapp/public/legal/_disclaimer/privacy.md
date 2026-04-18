# Privacy statement not configured

This Apollon instance has been deployed without a legal profile.

Apollon processes personal data (server logs, WebSocket connections, diagram content stored in Redis for up to 120 days). The operator of this deployment is the **controller** within the meaning of Art. 4(7) GDPR for that processing and is legally required to publish a transparent privacy statement under Art. 13 GDPR before you use the service.

## What this means for you

- The operator of this deployment is **not** the Technical University of Munich (TUM).
- No privacy statement has been configured for the deployment you are looking at.
- Do not assume that this deployment's processing follows the TUM/AET configuration described in the upstream documentation.
- Request a privacy statement directly from the party that deployed this instance before continuing to use it.

## What the operator must do

See the [legal pages operator guide](https://github.com/ls1intum/Apollon/blob/main/docs/admin/legal-pages.md):

1. Set `LEGAL_PROFILE` to a bundled profile, **or**
2. Mount a Markdown override directory at `/usr/share/nginx/html/legal-overrides`, **or**
3. Author deployment-specific privacy content and rebuild the image.

---

*This page is the default fallback shipped with the Apollon source code. It is intentionally not a valid privacy statement for any deployment.*
