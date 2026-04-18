# Apollon — DSMS Submission Package

This directory is the complete record-of-processing (Art. 30 GDPR / "Verarbeitungstätigkeit") package for the TUM-operated Apollon deployment at `https://apollon.aet.cit.tum.de`. Submit it through the TUM DSMS at **<https://dsms.datenschutz.tum.de/>** (reachable from MWN / eduVPN with TUM login).

## Scope

Apollon is a browser-hosted UML modelling editor with an Express + Redis + WebSocket backend, operated by the Research Group for Applied Education Technologies (AET, Prof. Krusche). No authentication, no cookies, no analytics, no third-party services. Redis stores user-authored diagrams with a 120-day TTL. Access logs contain IP addresses.

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

Markdown source lives under [`standalone/webapp/public/legal/profiles/apollon-tum/`](../../../standalone/webapp/public/legal/profiles/apollon-tum/).

## Why Apollon is narrower than Hephaestus or Helios

| Concern | Apollon | Helios | Hephaestus |
|---|---|---|---|
| Authentication | none | GitHub OAuth | Keycloak (GitHub + LRZ) |
| Third-party processors | none | GitHub, Sentry (self-hosted) | GitHub, LLM providers, Slack |
| Special category data | none | none | none |
| AI / profiling | none | none | LLM-assisted guidance |
| Retention of user content | 120 d TTL | account lifetime | account lifetime |
| DPIA required? | **No** | No | DPIA-light (may upgrade) |

Apollon's surface is the smallest of the three. The VT is straightforward; the DPIA pre-check concludes DPIA is not required.

## Annual refresh

Re-review the VT once per year:

- Has the deployed stack changed? (new processor, new data category, new retention?)
- Has the code added authentication, cookies, or analytics? Any of these requires an amended VT and an amended privacy page.
- Are the retention figures in `03-vt-dsms.md` still matching the deployed config?
- Is the AVV checklist still accurate?

## Emergency — DSB rejection

The DSB may comment in DSMS. Typical follow-ups and responses:

- *"Rechtsgrundlage zu konkretisieren"* → §7 of the VT cites Art. 6(1)(e) GDPR + Art. 4 BayHIG + Art. 25 BayDSG. Point them there.
- *"Löschkonzept fehlt"* → §13 of the VT plus the 120-day Redis TTL are the deletion concept.
- *"AVV fehlt für X"* → there are no Art. 28 processors; see [`05-avv-checklist.md`](./05-avv-checklist.md).

Export DSB comments, update the relevant file, and re-submit.

## Contacts

- TUM DPO: [beauftragter@datenschutz.tum.de](mailto:beauftragter@datenschutz.tum.de)
- DSMS tool support: [support@datenschutz.tum.de](mailto:support@datenschutz.tum.de)
- TUM DSMS overview: <https://www.datenschutz.tum.de/datenschutz/verarbeitungstaetigkeit/>
- Apollon operational contact: [krusche@tum.de](mailto:krusche@tum.de)
