# Apollon — DSMS Submission Guide

Follow these steps in order. Target: <https://dsms.datenschutz.tum.de/> (log in via Shibboleth on MWN / eduVPN).

*Stand: 2026-04-24 · Version 1.0*

## Phase 0 — Prep (10 min)

1. Open `03-vt-dsms.md` alongside this guide.
2. Confirm the code-level facts (all verified against the tree on 2026-04-24):
   - Redis TTL = 120 days (`standalone/server/src/database/models/Diagram.ts`, `DIAGRAM_TTL_SECONDS`).
   - nginx: `access_log off;` and `error_log /dev/stderr crit;` (`nginx.conf`).
   - Traefik: `--accesslog=false` (`docker/compose.proxy.yml`).
   - Express logger: `silent` in production (`standalone/server/src/logger.ts`).
   - Docker log driver: `json-file`, `max-size=50m`, `max-file=5` on every service (all `docker/compose.*.yml`).

   All of this is committed to the repo and deployed through the existing GitHub Actions workflow (`.github/workflows/deploy-prod.yml`, which calls `ls1intum/.github/.github/workflows/deploy-docker-compose.yml`). **No additional host-level setup on the AET VM is required** — no `/etc/logrotate.d/` drop-in, no cron job, no log shipper.
3. Confirm with AET ops:
   - No scheduled backup job copies Redis, container volumes, or host log directories to external storage. (Expected answer: none.)
   - Host-OS log retention (rsyslog, journald) matches the row in VT §13, or update the row to match.
4. Have at hand: TUM login + edit access on the Apollon repo (for privacy-page updates).

## Phase 1 — Ship the privacy page (done, but re-verify)

The live privacy page is at <https://apollon.aet.cit.tum.de/privacy>. Open it and confirm:

- TL;DR block is present at the top.
- Controller identified as **TUM + Prof. Krusche (AET)**.
- DPO: **<beauftragter@datenschutz.tum.de>**.
- Processings table lists: Redis diagram content (120-day TTL), WebSocket relay, operational events (no personal data, size-bounded ring buffer), theme-preference localStorage key.
- The page explicitly states that **no per-request access logs are produced** (neither at nginx nor at Traefik) and that the remaining operational-event stream contains no personal data by design.
- Legal basis: **Art. 6(1)(e) GDPR + Art. 4 Abs. 1 BayDSG + Art. 2, 4 BayHIG**.
- Cookies section states: no cookies; single `theme-storage` localStorage key under **§ 25 Abs. 2 Nr. 2 TDDDG**.
- Retention section makes clear the 120-day Redis TTL is the only time-based cap on personal data; the operational-event stream is size-bounded only.
- Right to object (Art. 21 GDPR) is highlighted in its own block.
- Complaint authority: **Bayerischer Landesbeauftragter für den Datenschutz (BayLfD)**.
- **No** Schrems-II / SCC boilerplate — no third-country transfers.
- **No** cookie banner on the site (not required for the current configuration).

If any of the above is wrong, fix the Markdown source in `standalone/webapp/public/legal/profiles/tumaet/privacy.md` first.

## Phase 2 — Create the VT in DSMS (30 min)

1. Log in at <https://dsms.datenschutz.tum.de/>.
2. Click **Create new PA**.
3. Copy **Title** and **Description and Purpose** from `03-vt-dsms.md` ("Step 1" block).
4. Select **Category**: `Lehre` (Teaching).
5. Click **Save**. DSMS redirects to the follow-up questionnaire.
6. Fill each follow-up field by copy-pasting from `03-vt-dsms.md` ("Step 2" block, §1 – §21). DSMS-label mapping:

   | DSMS field | VT section |
   |---|---|
   | Responsible unit / Fachabteilung | §1 |
   | Joint controllers | §2 |
   | Auftragsverarbeiter | §3 |
   | DPO | §4 |
   | Zwecke der Verarbeitung | §5 |
   | IT-System / Verfahren | §6 |
   | Rechtsgrundlage | §7 |
   | Kategorien Betroffener | §8 |
   | Kategorien personenbezogener Daten | §9 |
   | Besondere Kategorien | §10 |
   | Empfänger | §11 |
   | Drittländer | §12 |
   | Löschfristen | §13 |
   | TOMs | §14 (upload `04-toms.md`) |
   | Informationspflicht | §15 |
   | Automatisierte Entscheidung | §16 |
   | DSFA | §17 (upload `02-dsfa-prescreen.md`) |
   | Personalrat | §18 |
   | IT-Sicherheit | §19 |
   | Datenquelle | §20 |
   | Kontakt Betroffenenrechte | §21 |

7. Upload attachments listed in §22:
   - Privacy statement snapshot (export <https://apollon.aet.cit.tum.de/privacy> as PDF).
   - DPIA pre-screen — this repo: `02-dsfa-prescreen.md`.
   - TOMs — this repo: `04-toms.md`.
   - AVV checklist — this repo: `05-avv-checklist.md`.
8. Set **Tags**: `Webdienst`, `Lehre`. (Only add `pot. verallgemeinerbar` if the DSB confirms it is a valid DSMS tag during precheck.)
9. Review the DSMS-generated PDF preview if offered.
10. Set **Status → Submitted**.

## Phase 3 — After submission (async, 1–3 weeks)

The DSB reviews and may leave comments. Typical follow-ups:

- *"Rechtsgrundlage zu konkretisieren"* — §7 already cites Art. 6(1)(e) GDPR + Art. 4 Abs. 1 BayDSG + Art. 2, 4 BayHIG. Point the reviewer there.
- *"Löschkonzept fehlt"* — §13 is the concept. Diagram content has a 120-day Redis TTL (code-enforced). Operational logs contain no personal data by design (data-minimisation at source per Art. 5 Abs. 1 lit. c / Art. 25 DSGVO); a size-bounded Docker ring buffer supplies defense-in-depth without requiring a time-based retention cap.
- *"Ist § 25 TDDDG relevant?"* — the privacy page already states the only device-stored value is the `theme-storage` theme preference under § 25 Abs. 2 Nr. 2 TDDDG.

Status progression: Draft → Submitted → Precheck Done → Ready for DPO approval → Approved.

## Phase 4 — Annual refresh

Check yearly:

- Re-read this package; does everything still match deployed reality?
- Has the app gained authentication, cookies beyond `theme-storage`, or analytics? If yes, amend VT + privacy page before re-submitting.
- Has the Redis TTL or log-retention configuration changed?

## Emergency — DSB rejects

If the DSB rejects the VT:

1. Export their DSMS comments.
2. Update `03-vt-dsms.md` and — if the substance changed — the privacy-page Markdown.
3. Re-submit.

## Contacts

- Tool support: <support@datenschutz.tum.de>
- Substantive questions: <beauftragter@datenschutz.tum.de>
- TUM DSMS page: <https://www.datenschutz.tum.de/datenschutz/verarbeitungstaetigkeit/>
