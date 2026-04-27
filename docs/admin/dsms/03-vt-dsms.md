# Apollon — DSMS Verarbeitungstätigkeit (VT)

Copy-paste ready. Ordered to match the DSMS "Create new PA" form and follow-up questionnaire. Submit at: <https://dsms.datenschutz.tum.de/>.

*Stand: 2026-04-24 · Version 1.0*

---

## Step 1 — "Create a new processing activity"

### Title

```
Apollon – Browser-hosted UML Modelling Editor for Teaching
```

### Description and Purpose (min. 200 characters)

```
Apollon is a browser-hosted UML modelling editor operated by the Research Group for Applied Education Technologies (AET, Prof. Krusche) at the Technical University of Munich. It is used in software-engineering courses and student projects to author and share UML diagrams. The service has no user accounts, no login, no cookies, and no analytics. A diagram the user chooses to share is stored in a TUM-hosted Redis instance with a 120-day native TTL; collaborative edits are relayed over a WebSocket connection while the diagram session is open, with no persistence beyond Redis. The platform is self-hosted on AET servers at TUM. Personal data is processed only to provide the service, ensure reliable and secure operation, and troubleshoot incidents.
```

(length check: ≥ 200 chars ✓)

### Category

Select: **Lehre** (Teaching).

### Tags

- `Webdienst`
- `Lehre`

(Tag `pot. verallgemeinerbar` is a BayLfD-internal concept; only add it if the TUM DSB confirms it is a valid DSMS tag during precheck.)

---

## Step 2 — Follow-up questions

### 1. Name & contact of the responsible unit (Art. 30(1)(a))

```
Responsible unit:   Research Group for Applied Education Technologies (AET)
                    TUM School of Computation, Information and Technology
                    Department of Computer Science
                    Boltzmannstraße 3, 85748 Garching bei München

Head of unit:       Prof. Dr. Stephan Krusche
Apollon support:    Via GitHub Issues at https://github.com/ls1intum/Apollon/issues
                    Operational contact: ls1.admin@in.tum.de
                    Data-protection requests: beauftragter@datenschutz.tum.de (TUM DPO)
```

### 2. Joint controllers (Art. 26 GDPR)

None.

### 3. Processors (Art. 28 GDPR) — each with AVV status

**None.** Apollon is self-hosted entirely on TUM/AET infrastructure. Components (Express server, Redis, nginx/Traefik, WebSocket relay) run in-house on AET servers at TUM. No external service receives personal data.

See `05-avv-checklist.md`.

### 4. Data Protection Officer

Pre-populated by DSMS. Verify:

- TUM DPO office: **<beauftragter@datenschutz.tum.de>**.

### 5. Purposes of processing (Art. 30(1)(b))

1. Provide the UML modelling editor (load and render the web app).
2. Store and relay user-authored diagrams that the user chooses to share, so the user and any collaborators can continue editing and viewing them for up to 120 days.
3. Operate the service reliably and securely (operational event logging on the application stack).
4. Troubleshoot incidents using operational log data.

### 6. Name of IT system / procedure

```
Apollon (https://apollon.aet.cit.tum.de)
Stack: Browser-hosted React webapp (TypeScript, Vite, MUI); Express 5
server with WebSocket relay; Redis 7 (RedisJSON) with 120-day native TTL;
Traefik v3 reverse proxy with Let's Encrypt; Docker Compose deployment on
AET servers at TUM.
Source (MIT): github.com/ls1intum/Apollon
```

**Data flow (high level):**

```
Browser ──TLS (HTTPS/WSS)──▶ Traefik v3 (reverse proxy) ──▶ Express 5 + WebSocket relay
                                                               │
                                                               ▼
                                                       Redis 7 (120-day TTL)

All components run on the internal Docker bridge of the same AET-operated host.
Redis is not exposed to any external network. No third-party egress occurs
during normal request processing.
```

### 7. Legal basis (cite GDPR article + national norm)

| Processing | Rechtsgrundlage |
|---|---|
| Bereitstellung des Editors; Speicherung und Relay der vom Nutzer geteilten Diagramme | Art. 6 Abs. 1 UAbs. 1 lit. e DSGVO i.V.m. Art. 4 Abs. 1 BayDSG und Art. 2, 4 BayHIG (Wahrnehmung der gesetzlichen Aufgaben der Hochschule in Lehre und Forschung einschließlich des Betriebs der hierfür erforderlichen IT-Dienste) |
| Operative Logs zum zuverlässigen und sicheren Betrieb | Art. 6 Abs. 1 UAbs. 1 lit. e DSGVO i.V.m. Art. 4 Abs. 1 BayDSG und Art. 4 BayHIG (Betrieb und IT-Sicherheit universitärer Dienste) |
| Theme-Preference im LocalStorage des Nutzergeräts | § 25 Abs. 2 Nr. 2 TDDDG (unbedingt erforderlich für den vom Nutzer ausdrücklich angeforderten Dienst); keine serverseitige Verarbeitung |

Einheitliche Rechtsgrundlage für alle Nutzergruppen (TUM-Angehörige und externe Teilnehmende): Art. 6 Abs. 1 UAbs. 1 lit. e DSGVO. Öffentliche Stellen stützen sich bei der Wahrnehmung ihrer öffentlichen Aufgaben nicht auf Art. 6 Abs. 1 lit. b DSGVO (vgl. Erwägungsgrund 45 DSGVO).

### 8. Categories of data subjects (Art. 30(1)(c))

Tick in DSMS:

- Students (TUM)
- Employees (TUM) — lecturers, tutors, AET staff
- Students (extern) — from partner universities contributing to open courses
- Other Website Visitors — unauthenticated visitors of public pages

### 9. Categories of personal data

- **Diagram content (Redis):** user-authored UML diagram data. Labels are free text and may contain personal data entered by the user. The platform does not require, validate, or inspect diagram content. Stored with a 120-day native Redis TTL from the last write.
- **WebSocket session data (in-memory only):** source IP from the TCP socket, session ID, and the relayed edit messages while the session is open. No authentication token. Not logged, not persisted outside Redis.
- **Operational events about the service (not about users):** startup messages, Let's Encrypt certificate renewals, Traefik service-level errors, Redis engine events (persistence, AOF rewrites), and crit-level nginx errors. By design these contain no personal data: nginx sets `access_log off;` and `error_log /dev/stderr crit;`; Traefik runs with `--accesslog=false`; the Express server runs at log level `silent` in production. Container output is captured by the Docker `json-file` driver as a size-bounded ring buffer (see §13). If a log line is ever observed to contain personal data, it is handled as an Art. 33 GDPR incident (see §14 / `04-toms.md` §7).
- **Browser-side storage:** single localStorage key `theme-storage` (theme preference). No identifying data; never transmitted to the server.

### 10. Special categories (Art. 9 / Art. 10)

**None.** Apollon does not process health, biometric, genetic, racial, religious, political, trade-union, sex-life, sexual-orientation, or criminal-conviction data. Users are informed in the privacy statement not to enter personal data of identifiable third parties into diagram labels.

### 11. Categories of recipients (Art. 30(1)(d))

- **Internal:** AET administrators / developers (operation, maintenance, incident response).
- **Internal (other users):** anyone with a diagram's share link can view and edit that diagram — this is the intended sharing behaviour of the service. Diagram IDs are cryptographically random (UUIDv4, ~122 bits of entropy); access without knowledge of the link is practically impossible.
- **No external processor, no external recipient, no sale, no advertising recipient, no data broker.**

### 12. Third-country transfers (Art. 30(1)(e))

**None.** All processing takes place on TUM/AET infrastructure in Germany. No Schrems-II or SCC analysis applies.

### 13. Retention periods per data category (Art. 30(1)(f))

| Category | Frist | Mechanismus | Verantwortlich |
|---|---|---|---|
| Diagramminhalte (Redis) | 120 Tage ab letzter Schreibaktion | Redis-native TTL (`EX 10368000`), code-enforced in `standalone/server/src/database/models/Diagram.ts` (`DIAGRAM_TTL_SECONDS`) | AET-Betrieb |
| Per-Request-Zugriffslogs (Client-IP, URL, User-Agent) | — | Nicht erhoben. nginx: `access_log off;`. Traefik: `--accesslog=false`. Express-Server: Log-Level `silent` in Produktion. nginx-Fehlerlog auf `crit` begrenzt, damit das Standard-Fehlerformat (enthält die Client-IP) keine personenbezogenen Daten emittiert. | — |
| Operative Ereignisse (Service-Start, Let's-Encrypt-Renewals, Traefik-Service-Fehler, Redis-Engine-Events, nginx `crit`-Fehler) | keine zeitbasierte Löschfrist erforderlich | Enthalten per Konstruktion keine personenbezogenen Daten, daher keine Aufbewahrungspflicht nach Art. 5 Abs. 1 lit. e DSGVO. Volumen-Deckelung als Defense-in-Depth durch Docker `json-file`-Treiber (`max-size=50m`, `max-file=5` — ≤ 250 MB pro Container, Rotation nach Größe). Das Ringpuffer-Verhalten ist vollständig in `docker/compose.*.yml` versioniert und wird über den bestehenden GitHub-Deployment-Workflow ausgerollt. | AET-Betrieb |
| Incident-Fallback | unverzüglich | Wird in einer operativen Log-Zeile dennoch personenbezogenes Datum beobachtet, wird dies als Vorfall nach Art. 33 DSGVO behandelt: Meldung an den/die TUM-DPB innerhalb von 72 h, Löschung des betroffenen Log-Segments, Korrektur der Konfiguration/des Codes zur Verhinderung der Wiederholung. | AET-Betrieb + TUM-DPB |
| WebSocket-Session-Daten | nur während offener Session | flüchtig im Server-Prozess; keine Persistenz | — |
| Backups mit personenbezogenen Daten | keine | Es existieren keine Backups, die personenbezogene Daten enthalten. Gesichert werden ausschließlich Quellcode (Git), Konfiguration und Container-Images (GHCR); diese enthalten keine Nutzerdaten. | AET-Betrieb |
| Host-OS-Logs (`/var/log/syslog`, `/var/log/auth.log`, systemd journal) | gemäß AET-Standard-Baseline | `rsyslog` / `journald` nach Ubuntu-Default. Enthalten keine Apollon-spezifischen Zugriffsdaten; werden von AET für den Gesamtbetrieb verwaltet. | AET-Betrieb |

**Note on log retention.** Apollon's design is to not emit personal data into operational logs at all (data minimisation at source per Art. 5 Abs. 1 lit. c und Art. 25 DSGVO). Because there is no personal data to retain, Art. 5 Abs. 1 lit. e DSGVO imposes no time-based retention requirement. The size-bounded Docker ring buffer (~250 MB per container) serves as a defense-in-depth volume cap and to preserve operational-debugging capability; it is not a legal retention period. The configuration lives in `docker/compose.*.yml` and is deployed through the existing GitHub Actions workflow — no additional host-level setup is required.

### 14. Technical and Organizational Measures (Art. 30(1)(g) + Art. 32)

See `04-toms.md`. Paste into the DSMS TOMs field or upload as an attachment.

### 15. Information-duty fulfilled (Art. 13/14)

Privacy statement at: <https://apollon.aet.cit.tum.de/privacy>
Imprint at: <https://apollon.aet.cit.tum.de/imprint>

Both are versioned in the repository under `standalone/webapp/public/legal/profiles/tumaet/`.

### 16. Automated decision-making / profiling (Art. 22)

**None.**

### 17. DPIA pre-check (Art. 35 GDPR)

See `02-dsfa-prescreen.md`. Conclusion: **DPIA not required.** No AI, no special-category data, no employee monitoring, no third-country transfers, narrow technical surface.

### 18. Personalrat involvement (Art. 75 BayPVG)

**Not triggered.** Apollon is not objectively suitable for monitoring employee performance or behaviour under Art. 75a BayPVG: no user accounts, no personalised attribution of actions, no content scanning, no evaluation logic. Staff use the editor on the same anonymous footing as any other user. Mitbestimmung is therefore not triggered.

### 19. IT-Sicherheitsformular (TUM wiki)

Not applicable as a separate upload; Apollon is self-hosted by AET on TUM infrastructure under the AET operational baseline. See `04-toms.md`. Confirm with the TUM DSB during precheck whether a separate IT-Sicherheitsformular is still required for this deployment class.

### 20. Source of data

- Directly from the data subject: diagram content entered into the editor, theme preference.
- From the underlying HTTP connection: IP address, user-agent (standard web-server logging).

### 21. Data-subject rights contact

Primary: <beauftragter@datenschutz.tum.de> (TUM DPO). Operational queries: <ls1.admin@in.tum.de> (AET admins).

### 22. Attachments to upload in DSMS

- Privacy statement snapshot (export of <https://apollon.aet.cit.tum.de/privacy>, PDF).
- `02-dsfa-prescreen.md` (DPIA pre-check).
- `04-toms.md` (TOMs).
- `05-avv-checklist.md` (Art. 28 checklist; confirms no external processors).

### 23. Status

Set to **Submitted** after all fields are filled and attachments uploaded.

---

## Open items that require confirmation before submission

- **Redis TTL = 120 days.** Code-verified 2026-04-24 (`standalone/server/src/database/models/Diagram.ts`, `DIAGRAM_TTL_SECONDS`).
- **No authentication, no cookies beyond `theme-storage`, no analytics.** Code-verified 2026-04-24.
- **No personal data in operational logs.** Code-verified 2026-04-24: nginx sets `access_log off;` and `error_log /dev/stderr crit;` (`nginx.conf`); Traefik sets `--accesslog=false` (`docker/compose.proxy.yml`); the Express logger is `silent` in production (`standalone/server/src/logger.ts`). The Docker `json-file` log driver applies a size-based ring buffer (max-size=50m, max-file=5) as defense-in-depth. All of this is versioned in the repo and deploys through the existing GitHub workflow — no additional host-level setup is required.
- **No backups containing personal data.** Confirm with AET ops that no additional backup job copies Redis, container volumes, or host log directories to external storage. If such a backup exists, add a row to §13 with its concrete retention.
- **Host-OS log retention.** Confirm the AET standard baseline for `/var/log/syslog`, `/var/log/auth.log`, and systemd journal matches the row added to §13; adjust if it diverges.
