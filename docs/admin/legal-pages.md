# Legal pages (Imprint & Privacy)

Apollon ships routes at `/imprint` and `/privacy`. Their content comes from Markdown files resolved at runtime through a three-layer cascade — the operator chooses which layer wins.

> **Compliance note.** If your deployment serves the built-in disclaimer, you are violating § 5 DDG (imprint duty) and Art. 13 GDPR (privacy notice duty). Configure a profile or mount overrides before going to production.

## Resolution cascade

For each page (`imprint`, `privacy`) the webapp tries, in order:

| # | Path | Layer | When to use |
|---|---|---|---|
| 1 | `/legal-overrides/<page>.md` | Operator bind-mount (runtime-editable) | Forks, staging edits, anything you want to change without rebuilding the image |
| 2 | `/legal/profiles/<LEGAL_PROFILE>/<page>.md` | Bundled profile (baked into the image) | Canonical deployments — e.g., `apollon-tum` for TUM |
| 3 | `/legal/_disclaimer/<page>.md` | Safety fallback (shipped with the code) | Not valid for production; shows a red "not configured" banner |

The first layer that responds with a non-empty, non-HTML body wins. Each page renders independently; `imprint` and `privacy` can come from different layers.

## Configuration

### Mode A — canonical TUM deployment

Set `LEGAL_PROFILE=apollon-tum` in your environment. The bundled profile at `webapp/public/legal/profiles/apollon-tum/` is used as-is. Do **not** use this value if you are not TUM — the content identifies TUM as the operator.

### Mode B — your own operator identity (fork)

Author two Markdown files on the deploy host:

```
./legal-overrides/imprint.md
./legal-overrides/privacy.md
```

Mount them into the container at `/usr/share/nginx/html/legal-overrides`. Compose snippet:

```yaml
services:
  webapp:
    volumes:
      - ./legal-overrides:/usr/share/nginx/html/legal-overrides:ro
```

Leave `LEGAL_PROFILE` empty. Overrides take priority anyway, but keeping the profile unset makes the intent explicit.

Kubernetes:

```yaml
volumes:
  - name: legal-overrides
    configMap:
      name: apollon-legal-overrides   # keys: imprint.md, privacy.md
volumeMounts:
  - name: legal-overrides
    mountPath: /usr/share/nginx/html/legal-overrides
    readOnly: true
```

Edits to override files take effect immediately (nginx serves them with `Cache-Control: no-cache, must-revalidate`). Profile files are cached for 5 minutes.

### Mode C — disclaimer fallback

Leave `LEGAL_PROFILE` unset and mount nothing. The webapp shows a red banner plus a placeholder page explaining the operator is unknown. **Not legal for production.** Intended only for local development against a clean checkout.

## Authoring guidelines

Apollon's privacy notice must cover, at minimum:

1. **Controller** (Art. 4(7) GDPR) — your legal identity and contact.
2. **DPO** — name or office, per Art. 37 GDPR.
3. **Processings** — list each, with purpose, legal basis (cite GDPR article + any national law), data categories, retention. For Apollon this minimally includes: server access logs, WebSocket relay metadata, Redis-stored diagram content (120-day TTL).
4. **Recipients** — who else sees the data; "none" is a valid answer.
5. **Third-country transfers** — state "none" if you host in the EU; otherwise cite adequacy (Art. 45 GDPR) or safeguards (Art. 46 GDPR).
6. **Retention** — concrete time frames per category.
7. **Rights** — Art. 15, 16, 17, 18, 20, 21 GDPR.
8. **Right to complain** — your competent supervisory authority.
9. **Automated decisions** — state "none" (Apollon has none by default).
10. **Voluntariness** — state that use is voluntary.

The TUM profile (`apollon-tum`) is a concrete, audit-reviewed reference.

### Markdown safety

Operator Markdown is untrusted by the renderer:

- Raw HTML tags (`<script>`, `<iframe>`, `<img onerror>`) are escaped as text. Do not rely on HTML in your Markdown.
- Only `http`, `https`, `mailto`, `tel`, `#` and `/` (absolute-path) URLs are allowed. `javascript:`, `data:`, `vbscript:` and unknown schemes are silently stripped.
- Link `title` attributes are dropped (UI-spoof prevention).
- External links open in a new tab with `rel="noopener noreferrer"`.
- Images must use `https://` or an absolute path; `data:` images are rejected.

## Verification

After deployment, run:

```sh
curl -sI https://YOUR_HOST/legal/profiles/apollon-tum/imprint.md | head
# Expect: HTTP/1.1 200, Content-Type: text/markdown; charset=utf-8
```

Open `https://YOUR_HOST/imprint` and `https://YOUR_HOST/privacy` in a browser. Confirm there is **no red disclaimer banner** and the operator identity matches your deployment. Open the browser console and check for `[legal] Disclaimer fallback served for page=…` warnings — if you see one, your configuration is wrong.

## Related

- DSMS (Verarbeitungstätigkeit) submission package — [docs/admin/dsms/](./dsms/README.md)
