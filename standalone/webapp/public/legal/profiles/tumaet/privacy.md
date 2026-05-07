Privacy Statement for Apollon in accordance with Art. 13 GDPR.

*Last updated: 2026-05-04.*

## In plain language

Apollon is a free UML modelling editor hosted by TUM. **No accounts, no cookies, no tracking, no third parties.** Diagrams you choose to share live on TUM servers and are deleted automatically 120 days after your last edit. If you choose to collaborate live, you pick a display name that your collaborators see while you are connected; it is discarded when you close the tab. By design, the service keeps no per-request access logs: your IP address and user-agent are not persistently recorded. Only operational events about the service itself (certificate renewals, critical errors) are captured, and they contain no personal data.

Diagram labels are free text. Do not type personal data about identifiable third parties into them. The server does not inspect label contents. **If you do enter such data, you may yourself become a controller for that data within the meaning of Art. 4(7) GDPR.** TUM remains controller only for storing and transporting your diagram.

## 1. What Apollon is and how data flows

Apollon is a browser-based UML modelling editor. You open it in your browser, draw diagrams, and optionally share them via a link. Shared diagrams are stored on TUM infrastructure in a database hosted in Germany and are removed automatically **120 days** after the last write. Real-time collaborative edits are relayed over a WebSocket connection while the diagram is open; the server holds those messages in memory only and writes nothing beyond the database record.

If you open the *Collaborate* dialog and enter a display name, the server holds a small per-diagram record in memory. The record contains each connected collaborator's display name, cursor position, and current selection. The server uses it to forward live updates to the other participants. Your entry is removed the moment your connection closes. The whole record is destroyed when the last collaborator disconnects. Nothing in it is written to disk.

Apollon has **no user accounts, no login, no cookies, and no analytics**. You are not asked to identify yourself. By design, per-request access logs (client IP, user-agent, URL) are not recorded in the reverse proxy or the application server. Your IP address is visible to TUM's servers while a request is being processed but is not persistently stored.

## 2. What personal data is processed

**Diagram content.** The UML data you author, including any free text you type into labels. Stored in a TUM-operated Redis database in Germany and deleted automatically 120 days after the last write.

**WebSocket session data.** While a diagram session is open, the server keeps a pointer to your WebSocket connection (so it can route messages back to you) and the message bodies in transit. Both are dropped from memory when the connection closes; neither is written to disk or extracted to a log line.

**Live-collaboration data.** Only if you have entered a display name in the *Collaborate* dialog: your display name, cursor position, and current selection. As described in §1, the server holds these in a per-diagram in-memory record while you are connected and forwards them to your collaborators in real time. Nothing is written to disk.

**Request metadata (IP address and user-agent).** Transmitted automatically by your browser on every HTTP request and visible to TUM's servers only for the duration of the request, so the response can be routed back to your client. Not persistently stored, never used for tracking, profiling, or correlating individuals.

**Operational events about the service itself.** Certificate renewals, critical errors from the reverse proxy or database engine, and unhandled-exception stack traces from the application server. Captured on TUM-operated servers in Germany. These events concern the service, not end users, and contain no personal data by design.

*Legal basis — server-side processing (database, WebSocket, operational events, request metadata): Art. 6(1)(e) GDPR, read with Art. 4(1) of the Bavarian Data Protection Act (BayDSG) and Art. 2 of the Bavarian Higher Education Innovation Act (BayHIG). TUM processes this data to perform its statutory teaching and research tasks, which require operating the IT services that support them.*

*Legal basis — browser-side storage (theme, draft diagrams, optional collaboration name; see §3): § 25(2) no. 2 of the German Telecommunications Digital Services Data Protection Act (TDDDG). Each entry is strictly necessary for a service you have explicitly requested, so no consent is required.*

**No special categories of data.** Apollon does not process special categories of data under Art. 9 GDPR (health, biometric, genetic, political, religious, trade-union, or sexual-orientation data). It also does not process criminal-conviction data (Art. 10 GDPR).

> **Reminder — diagram labels are free text.** To stay within Art. 5(1)(c) GDPR (data minimisation), please enter only the minimum data needed for your modelling purpose. The plain-language section above explains the controller consequences of typing third-party personal data into a label.

## 3. Cookies and local storage

Apollon sets **no cookies**. The data Apollon keeps in your own browser is strictly necessary to deliver the interface you asked for:

- **Your theme preference** (`localStorage["theme-storage"]`) — light or dark mode. Never transmitted to TUM. Persists until you clear browser storage.
- **Your locally drafted diagrams** (`localStorage["persistenceModelStore"]`) — the diagrams you are currently authoring. Kept on your own device so you do not lose your work between visits. Sent to TUM only when you actively click *Share*. Persists until you delete the diagram or clear browser storage.
- **Your collaboration display name** (`sessionStorage["apollon-collab-name"]`) — only set if you have opened the *Collaborate* dialog. Discarded automatically by your browser when you close the tab. The name itself is also sent to TUM and shown to your collaborators while a session is open (see §1 and §2).

You can inspect and remove these entries at any time using your browser's developer tools.

*Legal basis: § 25(2) no. 2 TDDDG. Each entry is unconditionally necessary to deliver the service you have requested; no consent is required.*

## 4. Recipients

Your data is processed by TUM and TUM's operational units only. Apollon does not share data with external recipients, does not sell it, does not use it for advertising, and does not transfer it to third countries. There is no processor (Art. 28 GDPR) chain outside TUM.

**Other end users — diagram sharing.** Anyone in possession of a diagram's share link can view and edit that diagram. This is the intended collaboration behaviour of the service. Diagram IDs generated by the Apollon web client are cryptographically random (UUIDv4, ~122 bits of entropy); guessing one is practically impossible.

**Other end users — live collaboration.** If you have opened the *Collaborate* dialog and entered a display name, the other Apollon users who have joined the same diagram and entered a display name see your name, cursor position, and current selection in real time while you are connected. They are end users of the same TUM-operated service, not external recipients.

## 5. Retention

| What | How long | Where |
|---|---|---|
| Shared diagrams | 120 days after the last write (native database TTL) | TUM database (Germany) |
| WebSocket session and live-collaboration data | While you are connected; dropped on disconnect | Server memory only |
| Request metadata (IP address, user-agent) | Visible to the server only for the duration of an HTTP request; not persistently stored | TUM server (transient) |
| Operational events about the service (no personal data by design) | Size-bounded ring buffer (~250 MB per container) | TUM-operated server |
| Theme preference and locally drafted diagrams | Until you delete them or clear browser storage | Your own device |
| Optional collaboration display name | Until you close the browser tab | Your own device (and server memory while connected) |

No backups containing personal data exist. Source code (Git) and container images (GHCR) are backed up as part of the development lifecycle and contain no user data.

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

## 9. Obligation to provide data (Art. 13(2)(e) GDPR)

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

TUM updates this statement when the way personal data is processed changes.
