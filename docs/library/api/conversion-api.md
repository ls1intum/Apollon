---
id: conversion-api
title: Conversion API (REST)
description: Self-hosted HTTP endpoints that turn an Apollon model into SVG, PNG, or PDF — request/response shapes, the PNG scale option, status codes, and limits.
---

# Conversion API (REST)

The standalone Apollon server (`@tumaet/server`) renders a saved diagram to an
image over HTTP: send it a model, get back an SVG, PNG, or PDF. You don't run a
browser or the editor yourself, so it's a good fit when you already store models
somewhere (an LMS, a grading pipeline) and just need a file.

Each request renders the model with the same
[headless renderer](./headless-rendering) the library uses, in a background
worker; the PNG and PDF are drawn from that SVG. Its
[fidelity notes](./headless-rendering#fidelity-for-grading) apply here too.

## Endpoints

All routes are mounted under `/api`. The examples use a local server at its
default `http://localhost:8000`. TUM also runs a public instance at
**`https://apollon.aet.cit.tum.de`**; swap that base URL into any example to try
the API without self-hosting.

| Method | Path                    | Response `Content-Type` | Body                 |
| ------ | ----------------------- | ----------------------- | -------------------- |
| `GET`  | `/api/converter/status` | —                       | `200 OK` healthcheck |
| `POST` | `/api/converter/svg`    | `image/svg+xml`         | the SVG document     |
| `POST` | `/api/converter/png`    | `image/png`             | the PNG bytes        |
| `POST` | `/api/converter/pdf`    | `application/pdf`       | a one-page PDF       |

## Request

`Content-Type: application/json` is required. Send the
[Apollon model](./model-contract) either as the whole body or wrapped under a
`model` key — both are accepted:

```jsonc
{ "id": "…", "version": "4.0.0", "type": "ClassDiagram", "nodes": [], "edges": [] }
// or
{ "model": { "id": "…", "version": "4.0.0", "…": "…" } }
```

Models in the v2 / v3 format are normalised to v4 automatically, and an empty
diagram (`nodes: []`) renders to an empty image rather than an error. The
endpoints require **no authentication**; cross-origin access is governed by the
server's `CORS_ORIGIN` setting.

### SVG

```bash
curl -X POST http://localhost:8000/api/converter/svg \
  -H 'Content-Type: application/json' \
  --data-binary @diagram.json \
  -o diagram.svg
```

### PNG

The PNG is rasterised at `scale` × the diagram's natural size and has a white
background (not transparent). Set `scale` via query string or body; it defaults
to `2` and is clamped to `[1, 4]`.

```bash
curl -X POST 'http://localhost:8000/api/converter/png?scale=3' \
  -H 'Content-Type: application/json' \
  --data-binary @diagram.json \
  -o diagram.png
```

### PDF

```bash
curl -X POST http://localhost:8000/api/converter/pdf \
  -H 'Content-Type: application/json' \
  --data-binary @diagram.json \
  -o diagram.pdf
```

## Status codes

| Status | When                                                                            |
| ------ | ------------------------------------------------------------------------------- |
| `200`  | success — the body is the rendered file                                         |
| `400`  | no model in the request body                                                    |
| `413`  | request body exceeds the size limit (`BODY_TOO_LARGE`)                          |
| `422`  | a node is missing valid geometry, e.g. width/height (`INVALID_PARAMS`)          |
| `500`  | the worker could not render the model, e.g. an unsupported format (`INTERNAL`)  |
| `503`  | the render pipeline is busy / queue full (`RENDERER_BUSY`) — retry with backoff |

Most errors return the server's standard JSON body —
`{ "error": "<CODE>", "message": "…", "requestId": "…" }`. A `503` additionally
carries a `Retry-After` header (and `retryAfterSeconds` in the body) plus
`Cache-Control: no-store`. The one exception to the standard body is `400` (no
model), which the converter sends directly as a short `{ "error": "<message>" }`.

## Limits & tuning

Renders run on a **self-calibrating worker pool** that sizes itself to the
machine — no tuning required. The pool grows from one warm worker up to a
ceiling derived from `min(CPU, memory)` (`availableParallelism − 1`, bounded by
~60% of system memory ÷ per-worker footprint), reaps idle workers back to one,
sheds excess load with `503` + `Retry-After`, and recycles workers to bound
memory. Every value below has a derived default; override only to constrain a
shared host.

| Variable                             | Default                 | Meaning                                          |
| ------------------------------------ | ----------------------- | ------------------------------------------------ |
| `MAX_SNAPSHOT_BYTES`                 | `5242880` (5 MiB)       | max request body size                            |
| `CONVERTER_POOL_MAX`                 | _calibrated_            | max render workers (`min(cores−1, memBudget)`)   |
| `CONVERTER_POOL_MIN`                 | `1`                     | always-warm workers                              |
| `CONVERTER_MAX_QUEUE_LENGTH`         | `8 × poolMax`           | queued requests before `503`                     |
| `CONVERTER_MAX_QUEUE_WAIT_MS`        | `10000`                 | drop a job that has waited longer (it's a ghost) |
| `CONVERTER_TIMEOUT_{SVG,PNG,PDF}_MS` | `10000`/`15000`/`30000` | per-format render deadline                       |

The embed surface additionally serves identical revisions from an in-process
render cache with single-flight, so a fan-out of viewers (e.g. GitHub Camo)
collapses to one render per save.

## See also

- **[Headless rendering](./headless-rendering)** — the engine behind these
  endpoints, and how to run it in-process instead.
- **[Export](./export)** — the full `ExportOptions` reference.
- **[Model JSON contract](./model-contract)** — the shape of the model you POST.
