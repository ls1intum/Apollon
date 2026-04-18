# Apollon — DSMS Verarbeitungstätigkeit (VT)

Copy-paste ready. Ordered to match the DSMS "Create new PA" form and follow-up questionnaire. Submit at: <https://dsms.datenschutz.tum.de/>.

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

Select: **Administration / Teaching / Other** (`other`).

### Tags

- `Webdienst`
- `Lehre`
- `pot. verallgemeinerbar`

---

## Step 2 — Follow-up questions

### 1. Name & contact of the responsible unit (Art. 30(1)(a))

```
Responsible unit:   Research Group for Applied Education Technologies (AET)
                    TUM School of Computation, Information and Technology
                    Department of Computer Science
                    Boltzmannstraße 3, 85748 Garching bei München

Head of unit:       Prof. Dr. Stephan Krusche  <krusche@tum.de>
Apollon support:    Via GitHub Issues at https://github.com/ls1intum/Apollon/issues
                    Data-protection requests: krusche@tum.de
                    or beauftragter@datenschutz.tum.de (TUM DPO)
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
3. Operate the service reliably and securely: reverse-proxy logs, server logs, backups.
4. Troubleshoot incidents using log data.

### 6. Name of IT system / procedure

```
Apollon (https://apollon.aet.cit.tum.de)
Stack: Browser-hosted React webapp (TypeScript, Vite, MUI); Express 5
server with WebSocket relay; Redis 7 (RedisJSON) with 120-day native TTL;
Traefik v3 reverse proxy with Let's Encrypt; Docker Compose deployment on
AET servers at TUM.
Source (MIT): github.com/ls1intum/Apollon
```

### 7. Legal basis (cite GDPR article + national norm)

| Processing | Legal basis |
|---|---|
| Core service (provide editor, store and relay diagrams) for TUM members | **Art. 6(1)(e) GDPR** i.V.m. **Art. 4 BayHIG** and **Art. 25 BayDSG** (public-interest task: teaching and operation of university IT services) |
| Core service for non-TUM users (external collaborators or open courses) | **Art. 6(1)(b) GDPR** (performance of the service the user requested by using it) |
| Server logs & reverse-proxy logs | **Art. 6(1)(e) GDPR** (operation and security of a university IT service) |
| Theme-preference in browser local storage | **§ 25(2) Nr. 2 TDDDG** (strictly necessary for a service explicitly requested by the user) + Art. 6(1)(e) GDPR |

### 8. Categories of data subjects (Art. 30(1)(c))

Tick in DSMS:

- Students (TUM)
- Employees (TUM) — lecturers, tutors, AET staff
- Students (extern) — from partner universities contributing to open courses
- Other Website Visitors — unauthenticated visitors of public pages

### 9. Categories of personal data

- **Server logs:** IP address, timestamp, HTTP method, URL, status code, bytes transferred, user-agent, referrer.
- **Reverse-proxy logs (Traefik):** same shape as server logs; retained per standard rotation.
- **Diagram content (Redis):** user-authored UML diagram data. Labels are free text and may contain personal data entered by the user (first-person or third-party). The platform does not require, validate, or inspect diagram content. 120-day native Redis TTL.
- **WebSocket session data (in-memory only):** ephemeral connection metadata and relayed edits while a session is open; not logged, not persisted outside Redis.
- **Browser-side storage:** theme preference (localStorage). No identifying data.

### 10. Special categories (Art. 9 / Art. 10)

**None.** Apollon does not process health, biometric, genetic, racial, religious, political, trade-union, sex-life, sexual-orientation, or criminal-conviction data. Users are warned in the privacy statement not to enter third-party personal data into diagram labels.

### 11. Categories of recipients (Art. 30(1)(d))

- **Internal:** AET administrators / developers (operation, maintenance, support).
- **Internal (other users):** anyone with a diagram's share link can view and edit that diagram — this is the intended sharing behaviour of the service.
- **No external processor, no external recipient, no sale, no advertising recipients, no brokers.**

### 12. Third-country transfers (Art. 30(1)(e))

**None.** All data processing takes place on TUM/AET infrastructure in Germany. No Schrems-II or SCC analysis applies.

### 13. Retention periods per data category (Art. 30(1)(f))

| Category | Retention |
|---|---|
| Diagram content in Redis | **120 days** from creation (enforced by Redis native TTL) |
| Server access logs | Per TUM/AET operational baseline; rotation on a days–weeks timescale, not merged with other sources |
| Reverse-proxy (Traefik) logs | Same as server logs |
| WebSocket session data | Only while the session is open; not persisted |
| Backups | Per TUM/AET operational baseline |

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

**Not triggered.** Apollon does not monitor TUM staff performance or behaviour. Staff who use the editor do so on the same footing as any other user.

### 19. IT-Sicherheitsformular (TUM wiki)

Not applicable as a separate upload; Apollon is self-hosted by AET on TUM infrastructure under the AET operational baseline. See `04-toms.md`.

### 20. Source of data

- Directly from the data subject: diagram content entered into the editor, theme preference.
- From the underlying HTTP connection: IP address, user-agent (standard web-server logging).

### 21. Data-subject rights contact

Primary: <krusche@tum.de>. Secondary: TUM DPO <beauftragter@datenschutz.tum.de>.

### 22. Attachments to upload in DSMS

- Privacy statement snapshot (export of <https://apollon.aet.cit.tum.de/privacy>, PDF).
- `02-dsfa-prescreen.md` (DPIA pre-check).
- `04-toms.md` (TOMs).
- `05-avv-checklist.md` (Art. 28 checklist; confirms no external processors).

### 23. Status

Set to **Submitted** after all fields are filled and attachments uploaded.

---

## Open items that require confirmation before submission

- Confirm that the deployed Redis TTL matches **120 days** (`standalone/server/src/diagramRepository.ts`).
- Confirm the current server + reverse-proxy log rotation (days vs weeks) with AET ops. Adjust §13 to match reality.
- Confirm the backup schedule and retention for the Apollon VMs with AET ops. Add a row to §13 if backups exist and retain personal data.
- Re-verify there is still no authentication, no cookies (beyond the theme preference), and no analytics in the deployed build.
