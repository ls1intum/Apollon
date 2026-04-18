# Apollon — Art. 28 Processor Checklist

Documents every external entity that might qualify as a processor (Art. 28 GDPR) and the status of the required contract (Auftragsverarbeitungsvertrag, AVV).

## Summary

**No external processors.** Apollon is self-hosted on TUM / AET infrastructure; no personal data leaves TUM.

## Detailed check

| Component | Role | AVV required? | Status |
|---|---|---|---|
| AET servers at TUM (container host) | Own infrastructure | No (Art. 4(7) GDPR — controller's own equipment) | — |
| Redis 7 (in-house container) | Data store | No (self-hosted) | — |
| Express 5 + WebSocket server (in-house container) | Application | No (self-hosted) | — |
| Traefik v3 reverse proxy (in-house container) | TLS termination, routing | No (self-hosted) | — |
| Let's Encrypt ACME endpoint | Domain-validation certificates | No — Let's Encrypt receives no personal data; it only checks control over the domain | — |
| GitHub, Inc. / Microsoft (hosting the source code and CI/CD pipeline) | Not a processor for the **running** service. Receives repo commits and CI logs from AET employees acting in their employment role. | No (Art. 4(7) GDPR — they process employment data of AET staff, not end-user data of the Apollon service) | — |
| GHCR (GitHub Container Registry) | Stores Docker images; images are pulled at deploy time. No user data in images. | No | — |

## Why no external recipient qualifies as a processor

An Art. 28 processor receives **personal data** to carry out processing instructed by the controller. In Apollon, the only place end-user personal data lives is:

- TUM-operated AET VMs (controller's own infrastructure).
- The user's own browser (where diagram state is edited locally).

No personal data is sent to GitHub, GHCR, Let's Encrypt, or any other external service as part of the service's operation.

GitHub / GHCR do receive data from AET staff — commits, CI logs, image uploads — but that is an employment-related processing covered by TUM's general agreements with GitHub Enterprise, not by Apollon's VT.

## Follow-up if the VT surface changes

If a future Apollon deployment adds any of the following, amend this file **and** the VT and **and** the privacy notice before deploying:

- Any authentication provider (Keycloak, GitHub OAuth, SAML, etc.) — would make the IdP a recipient and possibly a processor.
- Any analytics or error telemetry (Sentry, PostHog, Matomo) — would make the vendor a processor.
- Any email delivery (SMTP) — would list the SMTP operator as a processor.
- Any AI provider (OpenAI, Anthropic, Azure OpenAI) — would list the provider as a processor and likely require a DPIA.
- Any external storage (S3, CDN) — would require an AVV.
- Any third-party font, script, image, or embed — would expose the user's IP to the provider.
