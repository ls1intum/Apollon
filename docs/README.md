# Apollon documentation

Markdown sources for the Apollon documentation site.

> **Migration in progress.** The docs are moving from Sphinx to [Docusaurus](https://docusaurus.io/). Until the migration lands, the Sphinx toolchain below still builds a working static site.

## Browse the sources

Every page is a plain Markdown file; GitHub renders them directly:

- [`index.md`](./index.md) — overview and index.
- [`getting-started/`](./getting-started) — requirements and first-run setup.
- [`development/`](./development) — project structure, scripts, workflow.
- [`mobile/`](./mobile) — Capacitor setup for iOS and Android.
- [`deployment/`](./deployment) — GitHub Actions and Docker Compose.
- [`troubleshooting/`](./troubleshooting) — common issues.
- [`contributing.md`](./contributing.md) — contribution guidelines.

## Build locally (Sphinx)

```sh
python3 -m venv venv
source venv/bin/activate    # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

Live preview:

```sh
make livehtml
```

Static build:

```sh
make html
```

Output lands in `_build/html`.

## Writing

- Keep pages short and task-oriented; link between them rather than growing one monolith.
- Prefer fenced code blocks with language tags (` ```sh `, ` ```ts `) so future Docusaurus syntax highlighting inherits cleanly.
- Internal links use relative paths so they survive the move to Docusaurus.
