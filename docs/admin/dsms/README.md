# Apollon — Data-Protection Documentation

The data-protection documentation for the TUM-AET-operated Apollon deployment at <https://apollon.aet.cit.tum.de>. The directory carries the Art. 30 GDPR record of processing, the Art. 35 DPIA threshold analysis, and the Art. 28 processor checklist. The directory is named `dsms` after the TUM data-protection portal where this content is filed (<https://dsms.datenschutz.tum.de/>); the portal has its own field-level prompts and is not redocumented here.

A fork running its own Apollon deployment must amend the package for its own controller, contact, and infrastructure. At minimum, edit the controller block in the privacy notice (§10), the contact emails throughout, the controller and storage sections of `record-of-processing.md`, and the rows of `processor-checklist.md` if its hosting differs from AET.

## Files

| File | Purpose |
|---|---|
| [`record-of-processing.md`](./record-of-processing.md) | The Art. 30 GDPR record of processing (Verzeichnis von Verarbeitungstätigkeiten) |
| [`dpia-prescreen.md`](./dpia-prescreen.md) | DPIA threshold check (Art. 35 GDPR) — concludes DPIA not required |
| [`processor-checklist.md`](./processor-checklist.md) | Art. 28 GDPR processor checklist — confirms no external processors |

The live imprint and privacy pages are at <https://apollon.aet.cit.tum.de/imprint> and <https://apollon.aet.cit.tum.de/privacy>; their markdown source is in [`standalone/webapp/public/legal/profiles/tumaet/`](../../../standalone/webapp/public/legal/profiles/tumaet/).

## Contacts

- TUM Data Protection Officer: <beauftragter@datenschutz.tum.de>
- Apollon operational contact: <ls1.admin@in.tum.de>
- TUM data-protection portal: <https://www.datenschutz.tum.de/>
