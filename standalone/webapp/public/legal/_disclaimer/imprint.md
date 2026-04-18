# Imprint not configured

This Apollon instance has been deployed without a legal profile.

The operator of this deployment is legally required under § 5 DDG (Digitale-Dienste-Gesetz, Germany) to identify itself directly, and cannot rely on this placeholder.

## What this means for you

- The operator of this deployment is **not** the Technical University of Munich (TUM).
- No imprint has been configured for the deployment you are looking at.
- Request imprint information directly from the party that deployed this instance.

## What the operator must do

See the [legal pages operator guide](https://github.com/ls1intum/Apollon/blob/main/docs/admin/legal-pages.md):

1. Set `LEGAL_PROFILE` to a bundled profile, **or**
2. Mount a Markdown override directory at `/usr/share/nginx/html/legal-overrides`, **or**
3. Author deployment-specific imprint content and rebuild the image.

---

*This page is the default fallback shipped with the Apollon source code. It is intentionally not a valid imprint for any deployment.*
