# Security Policy

## Reporting a vulnerability

Please report security issues privately via [GitHub Security Advisories](https://github.com/ls1intum/Apollon/security/advisories/new). Do not open public GitHub issues for vulnerabilities.

We aim to acknowledge reports within 5 working days and to coordinate a fix and disclosure timeline with you.

## Supported versions

Only the latest minor of each major is supported with security fixes.

| Package                                                 | Supported        |
| ------------------------------------------------------- | ---------------- |
| `@tumaet/apollon` (npm)                                 | `4.x`            |
| Standalone Docker images (server + webapp)              | latest `vX.Y.Z`  |
| `aet-tum.apollon-extension` (VS Marketplace / Open VSX) | latest published |

Older majors are end-of-life and will not receive backports.

## Scope

In scope:

- `@tumaet/apollon` library code and its public API.
- The standalone server (`standalone/server`) and webapp (`standalone/webapp`).
- The VS Code extension (`vscode-extension`).

Out of scope:

- Third-party services the deployment connects to (e.g., Artemis instances).
- Self-XSS that requires a privileged user to paste an attacker-controlled payload into a diagram body inside the same browser session.
