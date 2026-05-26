# Operations & compliance (internal)

This directory holds **internal operational and data-protection documentation**
for the TUM-AET deployment of Apollon. It is intentionally **not** part of the
public Docusaurus docs site — it is not built, not search-indexed, and not in
the sitemap, because it contains deployment-specific runbook procedures and
GDPR records that name individuals and describe production weaknesses.

| File                                 | What it is                                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------- |
| [`operations.md`](./operations.md)   | Self-host deployment topology, environment variables, durability posture                |
| [`runbook.md`](./runbook.md)         | Production on-call procedures for the hosted instance                                   |
| [`legal-pages.md`](./legal-pages.md) | Configuring the in-app legal pages / `LEGAL_PROFILE`                                    |
| [`dsms/`](./dsms/overview.md)        | TUM DSMS data-protection records — Art. 30 record, DPIA pre-screen, processor checklist |

If you operate your **own** fork of Apollon, treat these as a starting
template, not a description of your deployment — the DSMS records in
particular are specific to the TUM instance and must be re-done for yours.
