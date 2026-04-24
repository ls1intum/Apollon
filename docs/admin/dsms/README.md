# Apollon — DSMS Submission Package

This directory is the complete record-of-processing (Art. 30 GDPR / "Verarbeitungstätigkeit") package for the TUM-operated Apollon deployment at `https://apollon.aet.cit.tum.de`. Submit it through the TUM DSMS at **<https://dsms.datenschutz.tum.de/>** (reachable from MWN / eduVPN with TUM login).

*Stand: 2026-04-24 · Version 1.0*

## Scope

Apollon is a browser-hosted UML modelling editor with an Express + Redis + WebSocket backend, operated by the Research Group for Applied Education Technologies (AET, Prof. Krusche). No authentication, no cookies (beyond a single `theme-storage` localStorage key on the user's device), no analytics, no third-party services. Redis stores user-authored diagrams with a 120-day native TTL. Per-request access logs are disabled by design at every layer of the stack (Traefik, nginx, Express); the remaining operational-event stream contains no personal data and is held in a size-bounded Docker ring buffer.

## Contents

| File | Purpose |
|---|---|
| [`README.md`](./README.md) | This file |
| [`SUBMISSION-GUIDE.md`](./SUBMISSION-GUIDE.md) | Ordered submission procedure |
| [`02-dsfa-prescreen.md`](./02-dsfa-prescreen.md) | DPIA pre-check (Art. 35 GDPR) — concludes DPIA not required |
| [`03-vt-dsms.md`](./03-vt-dsms.md) | Copy-paste VT answers for the DSMS form |
| [`04-toms.md`](./04-toms.md) | Technical and Organizational Measures (Art. 32 GDPR) |
| [`05-avv-checklist.md`](./05-avv-checklist.md) | Art. 28 processor checklist — confirms no external processors |

The live imprint and privacy pages are served at:

- <https://apollon.aet.cit.tum.de/imprint>
- <https://apollon.aet.cit.tum.de/privacy>

Markdown source lives under [`standalone/webapp/public/legal/profiles/tumaet/`](../../../standalone/webapp/public/legal/profiles/tumaet/).

## Why a DPIA is not required

Apollon is a narrow, unauthenticated modelling editor without AI, without special-category data, without employee monitoring, and without third-country transfers. The full reasoning (Art. 35(3) threshold check, BayLfD Muss-Liste, DSK Muss-Liste, residual-risk analysis) is in [`02-dsfa-prescreen.md`](./02-dsfa-prescreen.md).

## Annual refresh

Re-review the VT once per year:

- Has the deployed stack changed? (new processor, new data category, new retention?)
- Has the code added authentication, cookies beyond `theme-storage`, or analytics? Any of these requires an amended VT and an amended privacy page.
- Are the retention figures in [`03-vt-dsms.md`](./03-vt-dsms.md) §13 still matching the deployed configuration?
- Is the AVV checklist still accurate?

## Emergency — DSB rejection

The DSB may comment in DSMS. Typical follow-ups and responses:

- *"Rechtsgrundlage zu konkretisieren"* → §7 of the VT cites Art. 6 Abs. 1 lit. e DSGVO i.V.m. Art. 4 Abs. 1 BayDSG und Art. 2, 4 BayHIG. Point them there.
- *"Löschkonzept fehlt"* → §13 of the VT is the concept: 120-day Redis TTL for diagram content (code-enforced); operational events contain no personal data by design (data-minimisation at source per Art. 5 Abs. 1 lit. c / Art. 25 DSGVO), so no time-based retention cap is required for them.
- *"AVV fehlt für X"* → there are no Art. 28 processors; see [`05-avv-checklist.md`](./05-avv-checklist.md).

Export DSB comments, update the relevant file, and re-submit.

## Contacts

- TUM DPO: [beauftragter@datenschutz.tum.de](mailto:beauftragter@datenschutz.tum.de)
- DSMS tool support: [support@datenschutz.tum.de](mailto:support@datenschutz.tum.de)
- TUM DSMS overview: <https://www.datenschutz.tum.de/datenschutz/verarbeitungstaetigkeit/>
- Apollon operational contact: [ls1.admin@in.tum.de](mailto:ls1.admin@in.tum.de)
