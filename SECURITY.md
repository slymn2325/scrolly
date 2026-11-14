# Security Policy

## Supported Versions

Security fixes and dependency updates are actively applied to the current production branch of **Scrolly** (`scrolly.live`).

| Release / Branch | Supported          |
| ---------------- | ------------------ |
| `main` (`1.x`)   | :white_check_mark: |
| Older snapshots  | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability (for example in API routes, PostgreSQL queries, rate limiting, environment secret handling, or CSP/header configuration), please report it privately before opening a public issue:

- **Email:** `contact@scrolly.live`
- **Include:** steps to reproduce, affected route or file path, and potential impact.

We aim to acknowledge reports within **48 hours** and provide a remediation timeline or patch update promptly once verified.

## Secret & Privacy Hygiene

- Never commit `.env`, `.env*.local`, database credentials (`DATABASE_URL`), or AI/media API keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `GIPHY_API_KEY`, `TENOR_API_KEY`).
- Server-only secrets must never use the `NEXT_PUBLIC_` prefix.
