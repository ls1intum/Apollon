---
id: processor-checklist
title: Processor checklist
description: Art. 28 GDPR check — confirms no external processors for the TUM-AET Apollon deployment.
---

# Apollon — Art. 28 processor checklist

Documents whether any external recipient is a processor under Art. 28 GDPR and the status of the required contract (Auftragsverarbeitungsvertrag, AVV).

## Summary

**No external processors.** Apollon is self-hosted on TUM/AET infrastructure; no personal data leaves TUM.

## Detailed check

| Component                                                               | Role                                                                            | AVV required? |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------- |
| TUM/AET infrastructure (host, Redis, application server, reverse proxy) | Controller's own equipment under Art. 4(7) GDPR                                 | No            |
| Let's Encrypt ACME endpoint                                             | Domain-validation certificates; receives no personal data                       | No            |
| GitHub / GHCR                                                           | Source-code hosting, CI, container registry; receives no end-user personal data | No            |

## Why no external recipient qualifies as a processor

An Art. 28 processor receives **personal data** to carry out processing instructed by the controller. In Apollon, end-user personal data lives only on TUM/AET infrastructure (the controller's own equipment) and in the user's own browser. No personal data is sent to GitHub, GHCR, Let's Encrypt, or any other external service.
