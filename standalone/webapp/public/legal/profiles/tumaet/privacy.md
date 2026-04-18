Privacy Statement for Apollon in accordance with Art. 13 GDPR.

*Last updated: 2026-04-18.*

## 1. Controller

Technical University of Munich (Technische Universität München)
Arcisstraße 21, 80333 Munich, Germany
represented by its President, Prof. Dr. Thomas F. Hofmann.

Operational responsibility for Apollon lies with:

Research Group for Applied Education Technologies (AET)
TUM School of Computation, Information and Technology
Department of Computer Science
Boltzmannstraße 3, 85748 Garching bei München, Germany
Email: [ls1.admin@in.tum.de](mailto:ls1.admin@in.tum.de)

## 2. Data Protection Officer

Technical University of Munich — Office of the Data Protection Officer
Arcisstraße 21, 80333 Munich, Germany
Email: [beauftragter@datenschutz.tum.de](mailto:beauftragter@datenschutz.tum.de)

## 3. What Apollon is and how data flows

Apollon is a browser-based UML modeling editor. You open it in your browser, draw diagrams, and — if you choose — share a diagram via a link. Diagram data is stored on TUM infrastructure in an in-memory Redis database and removed automatically after **120 days**. Real-time collaborative edits are relayed over a WebSocket connection while the diagram is open; nothing persists beyond the Redis record.

Apollon has **no user accounts, no login, no cookies, and no analytics or tracking**. You are not asked to identify yourself. The only personal data that reaches us is what an ordinary web request carries (IP, user-agent) and whatever text you type into diagram labels.

## 4. What personal data we process

| Category | What | Where | Basis |
|---|---|---|---|
| Server access logs | IP address, timestamp, HTTP method, URL, status code, user-agent, referrer | Reverse-proxy and application logs on TUM infrastructure | Art. 6(1)(e) GDPR + Art. 4 BayHIG + Art. 25 BayDSG — operation and security of a university IT service |
| WebSocket relay | Connection metadata while a diagram session is open; messages are forwarded in memory and not logged | Server process memory only | Art. 6(1)(e) GDPR + Art. 4 BayHIG |
| Diagram content | The diagram data you author, including any free text you enter into labels | Redis (TUM-hosted), per-diagram TTL of 120 days | Art. 6(1)(e) GDPR + Art. 4 BayHIG |

**We do not process special categories of data** within the meaning of Art. 9 GDPR and do not intentionally collect any identifying personal data beyond the above.

**Free-text warning.** Diagram labels are free text. The platform does not inspect their contents. *Do not enter personal data of identifiable third parties into diagrams.* This notice exists to satisfy Art. 5(1)(c) GDPR data minimization — the choice is yours.

## 5. Cookies and local storage

Apollon sets no cookies and uses no localStorage-based tracking. A preference-only key may be used to remember your chosen theme on your device; this falls under § 25(2) Nr. 2 TDDDG (Telekommunikation-Digitale-Dienste-Datenschutz-Gesetz) as strictly necessary for delivering the service you requested and does not require consent.

No third-party scripts, no fingerprinting, no ad tech, no analytics.

## 6. Recipients

Your data is processed by TUM and TUM's operational units only. We do not share it with external recipients, do not sell it, do not use it for advertising, and do not transfer it to third countries. There is no processor (Art. 28 GDPR) chain outside TUM.

## 7. Retention

| Category | Retention |
|---|---|
| Diagram content in Redis | 120 days from creation, enforced by Redis native TTL |
| Server logs | Per the TUM/AET operational baseline; rotated on a days-to-weeks timescale, not merged with other sources |
| WebSocket session data | Held only while the session is open; not persisted |

## 8. Your rights

You have the right, subject to the conditions in the respective article, to:

- request information on the personal data we process about you (Art. 15 GDPR),
- have inaccurate data corrected (Art. 16 GDPR),
- have your data erased (Art. 17 GDPR),
- restrict processing (Art. 18 GDPR),
- receive your data in a portable format (Art. 20 GDPR),
- object to processing based on Art. 6(1)(e) or (f) GDPR (Art. 21 GDPR).

**Note on erasure of diagram content.** Diagrams are stored without any stable user identifier; to exercise Art. 17 GDPR against a specific diagram, we need the diagram link or identifier from you — Art. 11 GDPR applies.

Contact us via the channels in sections 1 and 2.

## 9. Right to lodge a complaint

You can lodge a complaint with a supervisory authority, in particular the authority competent for TUM:

Bayerischer Landesbeauftragter für den Datenschutz (BayLfD)
Wagmüllerstraße 18, 80538 Munich, Germany
[datenschutz-bayern.de](https://www.datenschutz-bayern.de)

## 10. Automated decision-making

Apollon performs no automated decision-making, including profiling, within the meaning of Art. 22 GDPR.

## 11. Obligation to provide data

Use of Apollon is voluntary. You are under no statutory or contractual obligation to provide data, and declining to use the service has no consequences for you.

## 12. Changes to this statement

We update this statement when the way we process personal data changes. The "Last updated" date above reflects the most recent revision.
