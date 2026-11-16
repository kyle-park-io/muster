**English** | [한국어](README.ko.md)

# Muster

A dashboard for viewing and controlling the jobs that run repeatedly on your local computer.
It detects whether you are on Windows, WSL, macOS or Linux and shows the current environment.
When run on WSL, it lists both Windows Task Scheduler and the systemd and cron inside WSL.
Environment and source filters are separate, so the same agent can be told apart by
environment, as in `Windows · Codex` and `WSL · Codex`.

## Current support

| Source | View | Enable and disable | Run now | Logs |
| --- | --- | --- | --- | --- |
| Windows Task Scheduler | Supported | User-owned tasks | User-owned tasks | Coming soon |
| User systemd timer | Supported | Supported | Supported | Supported |
| System systemd timer | Supported | View only | View only | Supported |
| User crontab | Supported | Supported | Supported | No separate standard log |
| Codex automations | Detected from local files on Windows and the current environment | View only | View only | Coming soon |
| Claude scheduled tasks | Detected from the install state on Windows and the current environment | View only | View only | Coming soon |

Control at system scope needs administrator privileges, so it is read-only for now. Muster
reads the local storage formats of Codex and Claude only where a public control contract has
been confirmed.

## Getting started

Node.js 24 or later is recommended.

```bash
pnpm install
pnpm dev
```

Open `http://127.0.0.1:4317` in your browser. The local API runs at
`http://127.0.0.1:4318`.

To build and run for production:

```bash
pnpm build
pnpm start
```

## Safeguards

- The server binds only to `127.0.0.1`.
- APIs that change state accept only JSON requests and a local Origin.
- `enable --now`, `disable --now` and `start` run only on user systemd timers.
- On Windows, only ordinary tasks owned by the current user are controlled.
- Microsoft and system Windows tasks are view only.
- When a cron entry is disabled, the original line is preserved under a Muster marker that encodes it.
- Every state change goes through a confirmation dialog that shows the target and the actual job.
- System systemd timers and agent schedules are view only for now.

## Commands

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

The frontend uses React, Vite, TypeScript and Tailwind CSS. The local API is built with
Fastify and per-source adapters. Body text is set in Pretendard Variable, and commands and
times in Geist Mono.
