# Apollon — DPIA Pre-Screen (Art. 35 GDPR)

Documents whether a full Data Protection Impact Assessment (Datenschutz-Folgenabschätzung) is required. Pre-screen uses the BayLfD "Muss-/Soll-Liste" for Bavarian public bodies and the DSK lists.

## 1. Threshold check against Art. 35(3) GDPR

| Trigger | Present? | Reason |
|---|---|---|
| Systematic and extensive evaluation based on automated processing, including profiling, with legal or similarly significant effects | **No** | Apollon stores diagrams; it does not evaluate users. |
| Large-scale processing of Art. 9 (special categories) or Art. 10 (criminal convictions) data | **No** | No special-category data processed. |
| Systematic monitoring of a publicly accessible area on a large scale | **No** | |

## 2. Check against the BayLfD "Muss-Liste"

| Criterion | Present? | Reasoning |
|---|---|---|
| Vulnerable data subjects on a large scale | **No** | Users are primarily university members; no BayLfD-vulnerable group. |
| Employee performance / behaviour monitoring | **No** | Apollon does not observe employment performance. |
| Innovative technology with unclear DP impact | **No** | Standard browser-hosted editor + Redis store. No AI. |
| Dataset-matching from different sources | **No** | No cross-source matching. |
| Third-country transfer outside adequacy decision | **No** | No third-country transfers. |
| Scoring / profiling affecting service access | **No** | |
| Biometric / genetic data | **No** | |
| Surveillance of publicly accessible areas | **No** | |

## 3. Check against the DSK white-list

Activity fits the profile of a "standard university IT service (unauthenticated modelling editor)", which the DSK does not expect a DPIA for.

## 4. Residual risk analysis

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Free-text diagram labels contain personal data of third parties | Low-medium | Low (no identifiers link labels to data subjects) | Privacy notice explicitly warns users not to enter third-party personal data; Art. 11 GDPR applies to erasure. |
| Server log IPs retained too long | Low | Low (pseudonymous, AET-only access) | Standard TUM rotation; not aggregated with other sources. |
| Redis compromise leaking diagram content | Low | Low | Redis is not exposed to the internet; traffic is only between the webapp container, server container, and Redis on the internal Docker network. No secret material stored. 120-day TTL bounds exposure window. |
| WebSocket relay leaking messages | Very low | Low | Relay is in-memory; no persistence beyond Redis. Only participants with the diagram link can receive messages. |

## 5. Conclusion

**No DPIA required.** Apollon is a narrow, unauthenticated modelling editor without AI, without special-category data, without employee monitoring, without third-country transfers, and without automated decision-making. Residual risk is low.

Submit the VT without a DPIA attachment. If the DSB disagrees, upgrade to the BayLfD DPIA template and expand §5 with concrete technical evidence (pen-test report, dependency-scan summary) as the residual-risk section.
