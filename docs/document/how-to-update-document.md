# Updating the docs

The docs are plain Markdown under [`docs/`](../). GitHub renders them directly, so any change you push to `main` is live on the file browser view. The site is migrating to [Docusaurus](https://docusaurus.io/); see [`docs/README.md`](../README.md) for the Sphinx build that still works in the interim.

## Change anything

1. Edit the relevant `.md` file.
2. Prefer relative links (`../getting-started/setup.md`) over absolute URLs so they survive the Docusaurus move.
3. Use fenced code blocks with language tags (`` ```sh ``, `` ```ts ``) so syntax highlighting inherits cleanly.
4. Open a PR with a `docs:` commit prefix.

## Build the Sphinx site locally (optional)

```sh
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
make html
```

Output lands in `_build/html/`. A live preview is available via `make livehtml`.
