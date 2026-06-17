---
id: conversion-api
title: Conversion API (REST)
description: Self-hosted HTTP endpoints that turn an Apollon model into SVG, PNG, or PDF — request/response shapes, the PNG scale option, status codes, and limits.
---

# Conversion API (REST)

The standalone Apollon **server** (`@tumaet/server`) exposes the
[headless renderer](./headless-rendering) over HTTP. POST a model, get a
picture back — no browser, no client-side editor, nothing to build yourself.
This is the path for integrators (an LMS, a grading pipeline, a batch job) that
already have models on disk and just want files.

Under the hood every request runs `ApollonEditor.exportModelAsSvg` in a worker
thread; PNG and PDF are rasterised from that SVG. The fidelity notes in
[Headless rendering](./headless-rendering#fidelity-for-grading) apply verbatim.

## Endpoints

All routes are mounted under `/api`. The examples assume the server runs on its
default `http://localhost:8000`.

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

The PNG is rasterised at `scale` × the diagram's natural size. Set `scale` via
query string or body; it defaults to `2` and is clamped to `[1, 4]`.

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

| Status | When                                                                      |
| ------ | ------------------------------------------------------------------------- |
| `200`  | success — the body is the rendered file                                   |
| `400`  | no model in the request body                                              |
| `413`  | request body exceeds the size limit (`BODY_TOO_LARGE`)                    |
| `422`  | a node is missing valid geometry, e.g. width/height (`INVALID_PARAMS`)    |
| `500`  | the model could not be rendered, e.g. an unrecognised format (`INTERNAL`) |
| `503`  | the conversion queue is full — retry with backoff                         |

Most errors return the server's standard JSON body —
`{ "error": "<CODE>", "message": "…", "requestId": "…" }`. The two exceptions are
`400` and `503`, which the converter sends directly as a short
`{ "error": "<message>" }`.

## Limits & tuning

Requests are serialised through a single render worker with a bounded queue, so
one slow diagram can't exhaust the process. Defaults (override via environment):

| Variable                     | Default           | Meaning                      |
| ---------------------------- | ----------------- | ---------------------------- |
| `MAX_SNAPSHOT_BYTES`         | `5242880` (5 MiB) | max request body size        |
| `CONVERTER_MAX_QUEUE_LENGTH` | `20`              | queued requests before `503` |
| `CONVERTER_TIMEOUT_MS`       | `30000`           | per-conversion timeout       |

## See also

- **[Headless rendering](./headless-rendering)** — the engine behind these
  endpoints, and how to run it in-process instead.
- **[Export](./export)** — the full `ExportOptions` reference.
- **[Model JSON contract](./model-contract)** — the shape of the model you POST.
