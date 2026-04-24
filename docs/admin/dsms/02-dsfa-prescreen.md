# Apollon — DPIA Pre-Screen (Art. 35 GDPR)

Documents whether a full Data Protection Impact Assessment (Datenschutz-Folgenabschätzung) is required. The pre-screen uses the BayLfD "Muss-/Soll-Liste" for Bavarian public bodies and the DSK lists.

*Stand: 2026-04-24 · Version 1.0*

## 1. Threshold check against Art. 35(3) GDPR

| Trigger | Present? | Reasoning |
|---|---|---|
| Systematic and extensive evaluation based on automated processing, including profiling, with legal or similarly significant effects | **No** | Apollon stores diagrams; it does not evaluate users. No scoring, no profiling, no decision logic operating on user data. |
| Large-scale processing of Art. 9 (special categories) or Art. 10 (criminal convictions) data | **No** | No special-category data is processed. The privacy statement expressly asks users not to enter personal data of third parties into diagram labels. |
| Systematic monitoring of a publicly accessible area on a large scale | **No** | Apollon is a modelling editor, not a monitoring system. |

## 2. Check against the BayLfD "Muss-Liste"

| Criterion | Present? | Reasoning |
|---|---|---|
| Vulnerable data subjects on a large scale | **No** (substantive) | BayLfD treats students as vulnerable primarily where a university processes their performance, examination, attendance, or behaviour data. Apollon processes none of these: no accounts, no user-attributed actions, no content scanning, no evaluation. Use is voluntary (privacy statement §9) and declining has no consequences. The power-asymmetry trigger is therefore not engaged. |
| Employee performance / behaviour monitoring | **No** | Apollon does not observe employment performance. No employee is identifiable to the system, and no activity is tied to an employment relationship. Art. 75a BayPVG is not triggered (see `03-vt-dsms.md` §18). |
| Innovative technology with unclear DP impact | **No** (substantive) | Apollon uses an established, unremarkable stack: Express (Node.js), Redis with native TTL, Traefik, nginx, WebSocket — all pre-GDPR, widely deployed components. It does not use AI, LLMs, biometrics, fingerprinting, or device-identifier tracking. |
| Dataset-matching from different sources | **No** | Apollon does not combine data from multiple sources. Server logs are not correlated with diagram content or with any external dataset. |
| Third-country transfer outside an adequacy decision | **No** | All processing takes place on TUM/AET infrastructure in Germany. |
| Scoring / profiling affecting service access | **No** | No profiling, no scoring. |
| Biometric / genetic data | **No** | Not processed. |
| Surveillance of publicly accessible areas | **No** | Not applicable. |

## 3. Check against the DSK Muss-Liste

The Konferenz der unabhängigen Datenschutzaufsichtsbehörden des Bundes und der Länder (DSK) publishes a Muss-Liste of processing activities for which a DPIA is mandatory; it does **not** publish a corresponding Positivliste (whitelist). Apollon's processing profile — unauthenticated modelling editor, no special-category data, no AI, no monitoring, no scoring, no profiling — does not match any of the processing types on the DSK Muss-Liste. The DPIA exclusion therefore rests on the Art. 35(3) GDPR threshold check in §1 and the BayLfD Muss-Liste check in §2; the absence of a DSK whitelist is not itself a positive finding.

## 4. Residual risk analysis

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Free-text diagram labels contain personal data of third parties | Low–medium | Low (no stable identifier links labels to data subjects) | Privacy statement explicitly informs users of the data-minimisation expectation; the service does not actively request third-party data; Art. 11 GDPR applies to erasure; 120-day TTL bounds exposure. |
| Server-log IP addresses retained too long | Very low | Low | Per-request access logs are not produced (nginx `access_log off;`, nginx `error_log /dev/stderr crit;`, Traefik `--accesslog=false`, Express `silent` in production). Remaining operational events contain no personal data by design, so Art. 5 Abs. 1 lit. e DSGVO storage limitation does not apply; the Docker `json-file` driver provides a size-bounded ring buffer as defense-in-depth. Any discovery of personal data in logs is handled as an Art. 33 incident (`04-toms.md` §6.4). |
| Redis compromise leaking diagram content | Low | Low | Redis is not exposed to the internet; traffic only flows between webapp, server, and Redis containers on the internal Docker bridge. No secret material is stored. 120-day TTL bounds the exposure window. |
| WebSocket relay leaking messages | Very low | Low | The relay is in-memory only; no persistence beyond Redis. Only participants holding the diagram link can join a session. |

## 5. Conclusion

**No DPIA required.** Apollon is a narrow, unauthenticated modelling editor without AI, without special-category data, without employee monitoring, without third-country transfers, and without automated decision-making. Residual risk is low and is mitigated by the technical and organisational measures documented in `04-toms.md`.

The VT is submitted without a DPIA attachment. If the DSB requests a full DPIA, this document is upgraded to the BayLfD DPIA template and §4 is expanded with concrete technical evidence (dependency-scan summary, pen-test report if available) as the residual-risk section.
