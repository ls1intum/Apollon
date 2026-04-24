Privacy Statement for Apollon in accordance with Art. 13 GDPR.

*Last updated: 2026-04-24.*

## In plain language

Apollon is a free UML modelling editor hosted by TUM. **No accounts, no logins, no cookies, no tracking, no ads, no third parties.** Diagrams you choose to share live on TUM servers and are deleted automatically 120 days after your last edit. By design, the service keeps no per-request access logs: your IP address and browser identifier are not persistently recorded. Only operational events about the service itself (startups, certificate renewals, critical errors) are captured, and they contain no personal data.

Please do not type personal data of identifiable third parties into diagram labels.

Read on for the legal detail.

## 1. What Apollon is and how data flows

Apollon is a browser-based UML modelling editor. You open it in your browser, draw diagrams, and — if you choose — share a diagram via a link. Diagram data is stored on TUM infrastructure in a Redis database hosted in Germany, and is removed automatically **120 days** after the last write. Real-time collaborative edits are relayed over a WebSocket connection while the diagram is open; the relay holds messages in memory only and writes nothing beyond the Redis record.

Apollon has **no user accounts, no login, no cookies, and no analytics**. You are not asked to identify yourself. By design, per-request access logs (client IP, user-agent, URL) are not recorded in the reverse proxy or the web server. Your IP address is still visible to TUM's servers while the request is being processed — the response has to reach you — but it is not persistently stored.

## 2. What personal data is processed

| What | Where it lives | Why |
|---|---|---|
| Diagram content you author, including any free text in labels | Redis (TUM-operated, Germany); automatically deleted 120 days after the last write | Store your diagram so you and people with the share link can keep editing and viewing it |
| WebSocket connection metadata while a diagram session is open | Server process memory only; never written to disk | Relay live collaborative edits to other participants |
| Operational events about the service itself — startups, Let's Encrypt certificate renewals, critical errors | On TUM-operated servers in Germany; size-bounded ring buffer via Docker's built-in log driver | Operate the service reliably and securely; support incident response |
| Theme preference (light/dark) | Your own browser (localStorage key `theme-storage`); never sent to TUM | Remember your chosen appearance |

*Legal basis for the Redis, WebSocket, and operational-log processing: Art. 6(1)(e) GDPR in conjunction with Art. 4 Abs. 1 BayDSG and Art. 2, 4 BayHIG (performance of TUM's statutory teaching and research tasks, including the secure operation of the IT services needed to carry them out). Legal basis for the theme preference: § 25 Abs. 2 Nr. 2 TDDDG (Telekommunikation-Digitale-Dienste-Datenschutz-Gesetz) — strictly necessary for a service you have explicitly requested; no consent is required.*

Apollon deliberately does not run per-request access logging: the reverse proxy (Traefik) and the web server (nginx) are configured with access logs disabled, nginx error logs are restricted to critical-level events, and the Express server runs silently in production. The remaining log stream consists of operational events about the service itself and contains no personal data by design.

**No special categories of data.** Apollon does not process special categories of data under Art. 9 GDPR (health, biometric, genetic, political, religious, trade-union, or sexual-orientation data). It also does not process criminal-conviction data (Art. 10 GDPR).

> **Please note — diagram labels are free text.** Apollon does not inspect the contents of what you type. If you enter personal data of identifiable third parties, TUM remains controller for the storage and transport of that data, and you may additionally become controller for the decision to collect it. To stay within Art. 5(1)(c) GDPR (data minimisation), please enter only the minimum data needed for your modelling purpose.

## 3. Cookies and local storage

Apollon sets **no cookies**. The only data Apollon stores on your device is a single localStorage entry (`theme-storage`) that remembers your chosen light/dark theme. It is strictly necessary to deliver the interface you asked for and is never transmitted to TUM.

*Legal basis: § 25 Abs. 2 Nr. 2 TDDDG. No consent is required.*

Apollon uses no third-party scripts, no fingerprinting, no advertising technology, and no analytics.

## 4. Recipients

Your data is processed by TUM and TUM's operational units only. Apollon does not share data with external recipients, does not sell it, does not use it for advertising, and does not transfer it to third countries. There is no processor (Art. 28 GDPR) chain outside TUM.

Anyone with a diagram's share link can view and edit that diagram. This is the intended collaboration behaviour of the service. Diagram IDs are cryptographically random (UUIDv4, ~122 bits of entropy), so access without knowledge of the link is practically impossible.

## 5. Retention

| Category | Retention |
|---|---|
| Diagram content in Redis | Deleted 120 days after the last write, enforced by the Redis native TTL |
| WebSocket session data | Only while the session is open; never persisted |
| Operational events about the service | Held in a size-bounded ring buffer by the Docker log driver (≤ 250 MB per container, rotated on size). No time-based retention cap is necessary because these events contain no personal data by design; they are not merged with other sources and are accessed only to resolve operational incidents |
| Theme preference in localStorage | Remains on your device until you clear your browser storage |
| Backups containing personal data | None. Only source code, configuration, and container images are backed up (via Git and GHCR); these contain no personal data |

## 6. Your rights

Subject to the conditions in each article, you have the right to:

- **See what personal data TUM holds about you** (Art. 15 GDPR).
- **Have inaccurate data corrected** (Art. 16 GDPR).
- **Have your data erased** (Art. 17 GDPR).
- **Restrict processing** (Art. 18 GDPR).
- **Receive your data in a portable format** (Art. 20 GDPR).

> **Right to object (Art. 21 GDPR).** You have the right, on grounds relating to your particular situation, to object at any time to processing of your personal data based on Art. 6(1)(e) GDPR. If you object, TUM will stop processing the data unless it can show compelling legitimate grounds that override your interests, rights, and freedoms.

TUM responds to requests without undue delay, in any case within one month of receipt (Art. 12(3) GDPR). Complex requests may be extended by up to two further months; you will be informed if this applies.

**To delete a specific diagram**, please send us its share link or diagram ID. Because Apollon stores no user identifier alongside diagrams, the link or ID is the only way to locate the record (Art. 12(6) and Art. 11 GDPR — processing not requiring identification). Regardless, every diagram is automatically deleted 120 days after its last write.

**Contact for data-subject rights:**

- Primary: TUM Data Protection Officer — [beauftragter@datenschutz.tum.de](mailto:beauftragter@datenschutz.tum.de)
- Operational: AET team at TUM — [ls1.admin@in.tum.de](mailto:ls1.admin@in.tum.de)

## 7. Right to lodge a complaint

You can lodge a complaint with a supervisory authority, in particular the authority competent for TUM:

Bayerischer Landesbeauftragter für den Datenschutz (BayLfD)
Wagmüllerstraße 18, 80538 Munich, Germany
Website: [datenschutz-bayern.de](https://www.datenschutz-bayern.de)

## 8. Automated decision-making

Apollon performs no automated decision-making, including profiling, within the meaning of Art. 22 GDPR.

## 9. Obligation to provide data

Use of Apollon is voluntary. You are under no statutory or contractual obligation to provide data, and declining to use the service has no consequences. Your IP address and user-agent are transmitted automatically by your browser on every web request; this is technically unavoidable for any website.

## 10. Who is responsible

**Controller** under Art. 4(7) GDPR:

Technical University of Munich (Technische Universität München)
Arcisstraße 21, 80333 Munich, Germany
Represented by its President, Prof. Dr. Thomas F. Hofmann.

Operational responsibility for Apollon lies with the Research Group for Applied Education Technologies (AET), TUM School of Computation, Information and Technology, Department of Computer Science, Boltzmannstraße 3, 85748 Garching bei München, Germany — [ls1.admin@in.tum.de](mailto:ls1.admin@in.tum.de).

**Data Protection Officer:**

Technical University of Munich — Office of the Data Protection Officer
Arcisstraße 21, 80333 Munich, Germany (attn. Data Protection Officer)
Email: [beauftragter@datenschutz.tum.de](mailto:beauftragter@datenschutz.tum.de)

## 11. Changes to this statement

TUM updates this statement when the way personal data is processed changes. The "Last updated" date at the top reflects the most recent revision.
