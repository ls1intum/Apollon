# Apollon — DSMS Submission Guide

Follow these steps in order. Target: <https://dsms.datenschutz.tum.de/> (log in via Shibboleth on MWN / eduVPN).

## Phase 0 — Prep (10 min)

1. Open `03-vt-dsms.md` alongside this guide.
2. Confirm the deployment-dependent figures match reality:
   - Redis TTL for diagrams (code-enforced; default 120 d — verify `standalone/server/src/diagramRepository.ts`).
   - Server / reverse-proxy log retention on the VM (`apollon-prod.aet.cit.tum.de`). Adjust if different from "days–weeks rotation".
   - Backup schedule and retention — verify against the actual backup jobs configured on AET infra; update §13 if different.
3. Have at hand: TUM login + edit access on the Apollon repo (for privacy-page updates).

## Phase 1 — Ship the privacy page (done, but re-verify)

The live privacy page is at <https://apollon.aet.cit.tum.de/privacy>. Open it and confirm:

- Controller identified as **TUM + Prof. Krusche (AET)**.
- DPO: **<beauftragter@datenschutz.tum.de>**.
- Processings table lists: server access logs, WebSocket relay, Redis diagram content (120-day TTL).
- Legal basis: **Art. 6(1)(e) GDPR + Art. 4 BayHIG + Art. 25 BayDSG**.
- Cookies section states no cookies / localStorage-tracking, cites **§ 25(2) Nr. 2 TDDDG**.
- Complaint authority: **Bayerischer Landesbeauftragter für den Datenschutz (BayLfD)**.
- **No** Schrems-II / SCC boilerplate — we make no third-country transfers.
- **No** cookie banner on the site (not required for the current config).

If any of the above is wrong, fix the Markdown source in `standalone/webapp/public/legal/profiles/apollon-tum/privacy.md` first.

## Phase 2 — Create the VT in DSMS (30 min)

1. Log in at <https://dsms.datenschutz.tum.de/>.
2. Click **Create new PA**.
3. Copy **Title** and **Description and Purpose** from `03-vt-dsms.md` ("Step 1" block).
4. Select **Category**: `Administration / Teaching / Other`.
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
8. Set **Tags**: `Webdienst`, `Lehre`, `pot. verallgemeinerbar`.
9. Review the DSMS-generated PDF preview if offered.
10. Set **Status → Submitted**.

## Phase 3 — After submission (async, 1–3 weeks)

The DSB reviews and may leave comments. Typical follow-ups:

- *"Rechtsgrundlage zu konkretisieren"* — §7 already cites Art. 6(1)(e) GDPR + BayHIG. Point reviewer there.
- *"Löschkonzept fehlt"* — §13 plus the 120-day Redis TTL are the concept.
- *"Ist § 25 TDDDG relevant?"* — the privacy page already states the only device-stored value is the theme preference under § 25(2) Nr. 2.

Status progression: Draft → Submitted → Precheck Done → Ready for DPO approval → Approved.

## Phase 4 — Annual refresh

Check yearly:

- Re-read this package; does anything match-up with deployed reality?
- Has the app gained authentication, cookies, or analytics? If yes, amend VT + privacy page before re-submitting.
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
