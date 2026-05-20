---
id: overview
title: DSMS Overview
description: Data-protection management records for the standalone Apollon deployment.
---

# Apollon — data-protection documentation

The data-protection documentation for the TUM-AET-operated Apollon deployment at <https://apollon.aet.cit.tum.de>: the Art. 30 GDPR record of processing, the Art. 35 DPIA threshold analysis, and the Art. 28 processor checklist. The directory is named after the TUM data-protection portal (<https://dsms.datenschutz.tum.de/>) where this content is filed.

A fork running its own Apollon deployment must amend the package for its own controller, contact, and infrastructure. At minimum, edit the controller block in the privacy notice (§10), the contact emails throughout, the controller and storage sections of `record-of-processing`, and the first row of `processor-checklist` if its hosting differs from AET.

| Record                                       | What it documents                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [Record of processing](record-of-processing) | The Art. 30 GDPR record (Verzeichnis von Verarbeitungstätigkeiten) for the standalone deployment |
| [DPIA pre-screen](dpia-prescreen)            | DPIA threshold check (Art. 35 GDPR). Concludes a DPIA is not required for the documented setup   |
| [Processor checklist](processor-checklist)   | Art. 28 GDPR processor checklist. Confirms no external processors                                |

Embedded Apollon (the npm library inside a third-party host) is **out of scope** for these records — the host operator owns the DSMS for their own deployment.
