---
id: record-of-processing
title: Record of processing
description: Art. 30 GDPR record of processing for the TUM-AET Apollon deployment.
---

# Apollon — Record of processing activities (Art. 30 GDPR)

The Art. 30 GDPR record of processing for the TUM-AET-operated Apollon deployment at <https://apollon.aet.cit.tum.de>. Each section corresponds to an Art. 30 element. Operators filing this record in TUM DSMS will find the same content under the portal's own field prompts.

## Identifier

- Title: **Apollon – UML Modelling Editor for Teaching**
- Tags: `Webdienst`, `Lehre`
- Not processed on behalf of another controller; no Art. 26 joint-controller arrangement.
- Relevant for subject-rights requests under Art. 15–22 GDPR (deletion fulfilled by share link or diagram ID under Art. 11 + Art. 12(6) GDPR).

## Controller and contact (Art. 30(1)(a))

Responsible department: TUM School of Computation, Information and Technology.

:::tip Paste-ready — DSMS "Contact info of the person in charge"

```
Prof. Dr. Stephan Krusche, Head of AET
Research Group for Applied Education Technologies
TUM School of Computation, Information and Technology
Department of Computer Science
Boltzmannstraße 3, 85748 Garching bei München, Germany

Operational technical contact: ls1.admin@in.tum.de
```

:::

TUM Org identifier: `TUS1322`.

## Purpose and description (Art. 30(1)(b))

:::tip Paste-ready — DSMS "Description and Purpose of Processing Activity"

```
Apollon is a UML modelling editor that runs in a web browser. The Research Group for Applied Education Technologies (AET, Prof. Krusche) at the Technical University of Munich operates a public instance at apollon.aet.cit.tum.de for software-engineering teaching, student project work, and public use. The purpose of the processing is to let users draw UML diagrams and share them with collaborators. Personal data is collected only when a user actively shares a diagram (the diagram content is sent to and stored on TUM servers) or opens the live-collaboration dialog and enters a display name (the name and the user's cursor position and current selection are then visible to other participants in the same diagram session). Data subjects are TUM students and staff, external collaborators, and members of the public.
```

:::

## Data subjects (Art. 30(1)(c))

Apollon is unauthenticated. The live-collaboration display name and the transient IP address transmitted with each HTTP request are the only per-individual identifiers.

- Students (TUM)
- Employees (TUM)
- Students (external)
- Employees (external)
- Other website visitors

## Categories of personal data

Structured categories processed: **Name(s)** (the user-chosen live-collaboration display name) and **IP address** (transmitted automatically with each HTTP request; visible to the server only for the duration of the request; not persistently stored). No contact data, identifiers, or special categories (Art. 9 / Art. 10).

:::tip Paste-ready — DSMS "Other data categories"

```
- Diagram content (free text): the UML diagram a user actively shares is stored on TUM servers. Labels are free text and may contain personal data the user types; the platform does not require, validate, or inspect their content.
- Live-collaboration cursor + selection: alongside the display name, the user's cursor position in the editor and the ID of the currently selected element are forwarded in real time to other participants in the same diagram session, while the user is connected.
- User-agent string: transmitted automatically by the browser on every HTTP request; visible to the server only for the duration of the request; not persistently stored.
```

:::

## Recipients (Art. 30(1)(d))

:::tip Paste-ready — DSMS "Recipient Categories"

```
None. Apollon has no external processors and transfers no personal data to external entities. Within the service, users who hold a diagram's share link can view and edit that diagram, and users who enter the live-collaboration dialog see one another's display name, cursor position, and current selection in real time. These are users of the same TUM/AET-operated Apollon, not external recipients.
```

:::

## Third-country transfers (Art. 30(1)(e))

None. All processing on TUM/AET infrastructure in Germany.

## Storage location and retention (Art. 30(1)(f))

**Where stored**

:::tip Paste-ready — DSMS "Where is this data located and how is it stored?"

```
On AET-operated VMs on TUM premises (Boltzmannstraße 3, 85748 Garching bei München, Germany).

- User-shared diagrams persist in a Redis instance with native time-based eviction.
- Live-collaboration data (display name, cursor, selection) is held only in the WebSocket relay's working memory while a participant is connected; never persisted.
- IP address and user-agent are visible to the reverse proxy only for the duration of an HTTP request; never persisted.

No off-host backups of personal data exist. No personal data leaves the EU.
```

:::

**Retention**

:::tip Paste-ready — DSMS "Custom Erasure Time"

```
- Diagram content (Redis): 120 days from the last access (opening, embedding, or editing the diagram), enforced by a native database TTL that is extended on each access.
- Live-collaboration data (display name, cursor, selection): held only while the user is connected; dropped from server memory on disconnect.
- IP address and user-agent: visible to the server only for the duration of an HTTP request; not persistently stored.
- Operational events about the service (no personal data by design): size-bounded ring buffer, ~250 MB per container.
```

:::

**Reasoning**

:::tip Paste-ready — DSMS "Reasoning for the erasure time"

```
Diagram data is retained for 120 days from the last access (opening, embedding, or editing the diagram) to support editing across teaching iterations and stable embeds in course materials. Each access resets the window; after 120 days of inactivity, deletion is performed automatically by the Redis engine. Operational events about the service are kept free of personal data by data minimisation at source (Art. 5(1)(c) + Art. 25 GDPR); a time-based retention period under Art. 5(1)(e) GDPR is therefore not required.
```

:::

**Deletion responsibility**

:::tip Paste-ready — DSMS "Who is responsible for the deletion?"

```
Day-to-day technical deletion: AET operations (ls1.admin@in.tum.de). Subject-rights deletion requests: Prof. Dr. Stephan Krusche as responsible PI, with technical execution by AET maintainers against the diagram ID provided by the data subject.
```

:::

**Deletion guarantee**

:::tip Paste-ready — DSMS "How is deletion guaranteed?"

```
- Diagram content: automatic via the database TTL once the 120-day window expires; no operator action required.
- Live-collaboration data: cleared from server memory automatically when the user disconnects.
- Subject-rights erasure (Art. 17 GDPR): AET maintainers delete the diagram against the diagram ID supplied by the data subject.
```

:::

## Technical and organisational measures (Art. 30(1)(g) + Art. 32)

:::tip Paste-ready — DSMS "Specific Technical and Organisational Measures"

```
Pseudonymisation and encryption (Art. 32(1)(a))
- Diagrams are stored under a cryptographically random diagram ID with no link to an identifying user.
- TLS in transit at the Traefik edge with HSTS; WebSocket via wss://.
- Redis at-rest encryption is not separately enabled by the application; compensating controls are the internal-only network binding and the host-level disk protection in the AET operational baseline.

Confidentiality (Art. 32(1)(b))
- Access to a shared diagram is gated by a UUIDv4 share link (~122 bits of entropy).
- Host access: SSH-only with key-based authentication; password auth disabled.
- Redis is bound to the internal Docker network; no external port.
- The application stack containers (webapp, server, db) run with no-new-privileges; webapp and server additionally drop all Linux capabilities, and the server runs with a read-only root filesystem and a small tmpfs.

Integrity (Art. 32(1)(b))
- Container images are pinned to the source-commit SHA at deploy time.
- All application code and Docker compose configuration is version-controlled; every change requires pull-request review before reaching production.

Availability and resilience (Art. 32(1)(b))
- Containers restart automatically on failure; service health checks run continuously.
- An nginx maintenance page is served when the application is down.
- Single-host deployment with no automated failover. Risk accepted: free public modelling editor, no special-category data, no employee-monitoring use case, 120-day retention window.

Recovery (Art. 32(1)(c))
- No off-host backup of personal data exists; if Redis is lost, current shared diagrams cannot be restored. The risk is accepted on the same grounds as above; users retain their share link and can re-author.

Testing and evaluation (Art. 32(1)(d))
- Dependency vulnerability scanning runs on CI.
- TOMs are reviewed ad hoc on material changes (new processor, significant new feature). No periodic review cadence.
```

:::

## Legal basis (Art. 6 GDPR + national norms)

Selected basis: **Art. 6(1)(e) GDPR** (public-interest task), in conjunction with Art. 4(1) BayDSG and Art. 2 BayHIG.

:::tip Paste-ready — DSMS "Other legal basis"

```
- Provision of the editor; storage and relay of diagrams the user has chosen to share; live collaboration (display name, cursor, selection): Art. 6(1)(e) GDPR in conjunction with Art. 4(1) of the Bavarian Data Protection Act (BayDSG) and Art. 2 of the Bavarian Higher Education Innovation Act (BayHIG) — performance of the university's statutory teaching and research tasks, including operation of the IT services required to carry them out.
- Operational events about the service (no personal data by design): Art. 6(1)(e) GDPR in conjunction with Art. 4(1) BayDSG and Art. 2 BayHIG — operation and IT security of university services as part of fulfilling those tasks.
- Browser-side storage on the user's own device (theme-storage, persistenceModelStore, apollon-collab-name): § 25(2) no. 2 TDDDG — each entry is strictly necessary for a service the user has expressly requested.

Single legal basis for all user groups (TUM members and external participants): Art. 6(1)(e) GDPR. Lit. (f) is excluded for public authorities by the second subparagraph of Art. 6(1) GDPR; lit. (b) does not apply because the service is offered free of charge as part of TUM's public mission, not under a contract. Recital 45 GDPR requires the public-interest basis to be supplied by Member-State law (here: Art. 4(1) BayDSG and Art. 2 BayHIG).
```

:::

No special categories of personal data (Art. 9(1) GDPR) and no criminal-conviction data (Art. 10 GDPR) are processed.

## Source of data

Directly from the data subject. Apollon receives no data from third parties or from TUM identity systems.

## Information duty (Art. 13)

Privacy notice: <https://apollon.aet.cit.tum.de/privacy>.
Imprint: <https://apollon.aet.cit.tum.de/imprint>.
