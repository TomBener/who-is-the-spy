# Product

## Register

product

## Users

Groups of 3–16 friends playing 谁是卧底 (Who is the Spy) face-to-face, each on their own phone. Mixed Chinese/English speakers, often at a dinner table or party; one person hosts, everyone else joins via a 4-letter code or QR scan. Sessions are short, social, and loud — the app is glanced at between conversation, not stared at.

## Product Purpose

Replace paper slips and a human moderator: deal each player a private secret word, run the describe → vote → reveal loop, and enforce fair rules (server-authoritative dealing, secret words never broadcast). Success is a round that starts in under a minute and never makes the group wait on the app.

## Brand Personality

Noir dossier / interrogation-room: classified files, redacted bars, case numbers, rubber stamps. Deadpan, playful-serious. Three words: covert, crisp, theatrical.

## Anti-references

- Generic SaaS card grids, gradients, glassmorphism — this is a case file, not a dashboard.
- Casual-cute party-game pastels (Kahoot/Jackbox brights) — the tension is the fun; keep it moody.
- Anything that slows the group down: splash screens, orchestrated page loads, confirmation modals for non-destructive actions.

## Design Principles

1. **The phone is a secret** — private information (your word, your role) must be deliberately revealed (tap-to-declassify) and easy to hide again.
2. **Never block the table** — every screen answers "what is the group waiting on right now" at a glance; host controls are one tap.
3. **Server holds the truth** — the client renders state, it never decides game outcomes; devtools can't leak the spy.
4. **Bilingual by default** — 中文 and English are equal citizens on every screen.
5. **Earned theatrics** — stamps, redactions, and flicker only at dramatic beats (reveal, elimination, case closed), never as ambient decoration.

## Accessibility & Inclusion

- Mobile-first, one-hand use; large tap targets (≥44px) for voting under time pressure.
- Dark theme only (party/evening context); amber accent on near-black must keep ≥4.5:1 for body text.
- Works on low-end phones over flaky venue Wi-Fi: reconnect must self-heal, payloads stay tiny.
- Respect `prefers-reduced-motion` for the stamp/flicker animations.
