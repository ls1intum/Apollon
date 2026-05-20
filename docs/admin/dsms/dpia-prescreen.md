---
id: dpia-prescreen
title: DPIA pre-screen
description: Documents whether a full Data Protection Impact Assessment (Art. 35 GDPR) is required for the TUM-AET Apollon deployment.
---

# Apollon — DPIA pre-screen (Art. 35 GDPR)

Documents whether a full Data Protection Impact Assessment (Datenschutz-Folgenabschätzung) is required. The pre-screen uses the BayLfD "Muss-/Soll-Liste" for Bavarian public bodies and the DSK lists.

## 1. Threshold check against Art. 35(3) GDPR

| Trigger | Present? | Reasoning |
|---|---|---|
| Systematic and extensive evaluation based on automated processing, including profiling, with legal or similarly significant effects | **No** | Apollon stores diagrams; it does not evaluate users. No scoring, no profiling, no decision logic operating on user data. |
| Large-scale processing of Art. 9 (special categories) or Art. 10 (criminal convictions) data | **No** | No special-category data is processed. The privacy statement expressly asks users not to enter personal data of third parties into diagram labels. |
| Systematic monitoring of a publicly accessible area on a large scale | **No** | Apollon is a modelling editor, not a monitoring system. |

## 2. Check against the BayLfD "Muss-Liste"

| Criterion | Present? | Reasoning |
|---|---|---|
| Vulnerable data subjects on a large scale | **No** (substantive) | BayLfD treats students as vulnerable primarily where a university processes their performance, examination, attendance, or behaviour data. Apollon processes none of these: no accounts, no user-attributed actions, no content scanning, no evaluation. Use is voluntary and declining has no consequences. |
| Employee performance / behaviour monitoring | **No** | Apollon does not observe employment performance. No employee is identifiable to the system, and no activity is tied to an employment relationship. Art. 75a BayPVG is not triggered. |
| Innovative technology with unclear DP impact | **No** (substantive) | Apollon uses a standard stack (Express, Redis, Traefik, nginx, WebSocket). No AI/ML, biometric, or fingerprinting components. |
| Dataset-matching from different sources | **No** | Apollon does not combine data from multiple sources. Server logs are not correlated with diagram content or with any external dataset. |
| Third-country transfer outside an adequacy decision | **No** | All processing takes place on TUM/AET infrastructure in Germany. |
| Scoring / profiling affecting service access | **No** | No profiling, no scoring. |
| Biometric / genetic data | **No** | Not processed. |
| Surveillance of publicly accessible areas | **No** | Not applicable. |

## 3. Check against the DSK Muss-Liste

The DSK publishes a Muss-Liste of processing types requiring a DPIA, but no Positivliste. Apollon's processing profile matches no entry on the Muss-Liste. The DPIA exclusion rests on sections 1 and 2 above; the absent whitelist is not a positive finding.

## 4. Residual risk analysis

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Free-text diagram labels contain personal data of third parties | Low–medium | Low (no stable identifier links labels to data subjects) | Privacy statement explicitly informs users of the data-minimisation expectation; the service does not actively request third-party data; Art. 11 GDPR applies to erasure; 120-day TTL bounds exposure. |
| Server-log IP addresses retained too long | Very low | Low | Per-request access logs are not produced at any layer; remaining operational events contain no personal data by design (see TOMs in `record-of-processing.md`). |
| Redis compromise leaking diagram content | Low | Low | Redis is not exposed to the internet; traffic only flows between containers on the internal Docker bridge. The Redis container runs with no-new-privileges (see TOMs in `record-of-processing.md`). No secret material is stored. 120-day TTL bounds the exposure window. |
| WebSocket relay leaking messages | Very low | Low | The relay is in-memory only; no persistence beyond Redis. Only participants holding the diagram link can join a session. |

## 5. Conclusion

**No DPIA required.** Apollon is an unauthenticated modelling editor without AI, special-category data, employee monitoring, third-country transfers, or automated decision-making. Residual risk is low and is mitigated by the technical and organisational measures in `record-of-processing.md`.
