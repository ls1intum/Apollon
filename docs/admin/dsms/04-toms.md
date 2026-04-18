# Apollon — Technical and Organizational Measures (TOMs)

Documents the measures taken per Art. 32 GDPR. Structured along the categories of BayLfD / DSK TOM-Leitfäden.

## 1. Confidentiality (Art. 32(1)(b))

### 1.1 Access control (Zutrittskontrolle)

- Apollon runs on AET-managed servers on TUM premises. Physical access is restricted to AET staff and TUM facility management.
- Data-centre-like conditions (power, cooling, fire-detection) are provided by the TUM / AET facility.

### 1.2 System access (Zugangskontrolle)

- The VMs are reachable via SSH only from authorised operators using SSH key pairs. Password authentication is disabled.
- The GitHub deployment pipeline uses `VM_SSH_PRIVATE_KEY` held as a per-environment GitHub secret and rotates only on demand.
- The Apollon webapp itself has **no authentication** — every user is anonymous — so there is no user-facing access-control surface to administer.

### 1.3 Data access (Zugriffskontrolle)

- Only AET operators with container-host SSH access can read Redis data directly. Redis is bound to the internal Docker network; no external port is exposed.
- The Traefik reverse proxy exposes only `/`, `/api`, and `/ws` externally. Every other path returns 404.
- The server process accepts anonymous POST/GET against `/api/...`; authorisation to access a specific diagram is enforced by holding the (unguessable) diagram ID in the share link.

### 1.4 Separation (Trennungskontrolle)

- Redis data is not co-located with other TUM services.
- Diagrams are keyed by an opaque diagram ID; no cross-service or cross-user linkage is performed.

## 2. Integrity (Art. 32(1)(b))

### 2.1 Data integrity (Weitergabekontrolle / Eingabekontrolle)

- All external traffic is TLS-terminated at Traefik (Let's Encrypt R12). HTTP redirects to HTTPS with HSTS `max-age=63072000; includeSubdomains; preload`.
- WebSocket traffic uses `wss://` (TLS) in production; the relay forwards messages in memory only.
- Server logs record HTTP requests and allow traceability of changes at the reverse-proxy level.

### 2.2 Input control (Eingabekontrolle)

- Git is the authoritative source for all application code; changes are traceable via signed commits + PR history.
- The GitHub Actions deployment pipeline pushes images tagged by the source commit SHA; cosign-signed images are the only artifacts allowed in production.

## 3. Availability + resilience (Art. 32(1)(b))

- Containers restart automatically on failure (`restart: unless-stopped`).
- Health checks run every 5–30 s per service; Docker marks unhealthy containers.
- Maintenance page (nginx fallback) is configured to serve when the app compose is down.
- Backups — per AET operational baseline; fill in the specific retention value in `03-vt-dsms.md` §13 before submission.

## 4. Testability + evaluation (Art. 32(1)(d))

- Privacy page and imprint source are versioned in the repository under `standalone/webapp/public/legal/profiles/apollon-tum/`. Every change is reviewable in PRs.
- End-to-end tests (Playwright) cover the public pages including legal pages and hostile-markdown sanitisation.
- Dependency scanning runs on CI (npm audit + Dependabot).
- Docker images are signed with cosign and pushed to GHCR. Image provenance is verifiable.

## 5. Pseudonymisation / encryption

- Diagrams have no linkage to an identifying user; the diagram ID itself is pseudonymous.
- Network traffic is TLS-encrypted end-to-end (browser → Traefik → internal services).
- Redis data at rest is not separately encrypted beyond disk-level protections provided by the host.

## 6. Deletion

- Redis TTL of 120 days is enforced natively by the Redis engine. No scheduled job is required.
- Log rotation is governed by the host OS / AET operational baseline.

## 7. Organisational measures

- Operators are TUM / AET employees or authorised contributors; they act under § 4 BayHIG public-duty and TUM-internal security policies.
- The DPO (<beauftragter@datenschutz.tum.de>) reviews incidents. Data-subject requests follow the process in `docs/admin/legal-pages.md` + the live `/privacy` page.
- Incidents are recorded in GitHub Issues against the `ls1intum/Apollon` repository and, if they affect personal data, reported to the TUM DPO within 72 h.

## 8. Sub-processors

None. All components run on TUM / AET infrastructure.
