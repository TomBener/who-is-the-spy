# 谁是卧底 / Who is the Spy

A multi-device party game for playing **谁是卧底 (Who is the Spy)** face-to-face — **each player joins from their own phone**. Bilingual (中文 / English), mobile-first, installable as a PWA.

## How it works

- One player **creates a room** and shares a 4-letter code / QR.
- Everyone **joins from their own phone** and enters a name.
- The host configures the game (player count is automatic, number of **undercover** spies, optional **白板 / Mr.White**, word category) and starts.
- Each phone privately receives **only its own secret word** — the server never sends the full identity map, so opening devtools can't reveal the spy.
- Players describe their word out loud in turn, then **vote** in-app. The app reveals the eliminated player's role and checks win conditions.

## Architecture

A single self-hosted Node service + a React SPA, sharing one TypeScript contract.

```
who-is-the-spy/
├─ shared/   @spy/shared — types + socket event contract + category metadata (no answers)
├─ server/   @spy/server — Node + socket.io: room manager, server-authoritative word dealing, game state machine, word bank
└─ client/   @spy/client — React + Vite + TS + Tailwind + i18next: mobile-first UI, PWA
```

**Design rule:** role/word assignment is *server-authoritative*. The server emits each socket only its own `you:secret`; `room:state` never contains roles or words (until the game ends).

## Develop

```sh
npm install            # installs all workspaces
npm run dev            # server on :3001, client (Vite) on :5173 with /socket.io proxied
```

Open http://localhost:5173 on several devices/tabs on the same network.

## Production

```sh
npm run build          # builds the client into client/dist
npm start              # serves client/dist + socket.io from the Node server
```

## Status

v1 scope: create/join room · private per-phone word · in-app voting + auto win-detection · 白板/Mr.White role · built-in bilingual word bank.
Deferred: AI-generated word pairs (Claude) — the intended differentiator, added later behind a server endpoint.
