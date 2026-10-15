# Project Name

> One-line pitch: who it helps and what changes for them.

Built in 24 hours at **U-Hackathon 2026 · Flow Summit Bangkok** (Web3 track) on **Avalanche**.

| | |
|---|---|
| 🌐 Live demo | _add Vercel link_ |
| ⛓️ Contract (Avalanche Fuji) | _add address + Snowtrace link_ |
| 🎞️ Pitch deck | _add link_ |
| 🎥 Demo video | _add link_ |

## The problem
_Who has this problem, a real example, and why existing solutions fail. 3–5 sentences._

## Our solution
_What the user does, step by step, in plain words._

## Why on-chain
_What would break if this ran on a normal database instead. Be specific: custody of funds, trust in an intermediary, verifiable history, etc._

## How it works

```
User ──► Next.js app ──► Wallet (sign) ──► Smart contract on Avalanche Fuji
              │
              └──► API routes (AI / ElevenLabs)
```

| Layer | Tech |
|---|---|
| Smart contracts | Solidity, Foundry, OpenZeppelin |
| Chain | Avalanche Fuji C-Chain |
| Frontend | Next.js (App Router), RainbowKit, wagmi, viem, DaisyUI |
| Off-chain | Next.js API routes, ElevenLabs (if used) |
| CI | GitHub Actions: contract build + tests, lint, type check, secret scan |

## Run locally

Requirements: Node ≥ 20.18, Yarn (via `corepack enable`), Foundry.

```bash
yarn install
yarn chain     # terminal 1: local blockchain
yarn deploy    # terminal 2: deploy contracts + generate ABIs
yarn start     # terminal 3: app on http://localhost:3000
```

Run tests: `yarn test`

Deploy to Avalanche Fuji:

```bash
yarn generate                              # create a deployer keystore (once)
yarn deploy --network avalancheFuji
```

Then set `targetNetworks: [chains.avalancheFuji]` in `packages/nextjs/scaffold.config.ts`.

## Repository layout

```
packages/
├── foundry/          Smart contracts, tests, deploy scripts
└── nextjs/           Web app and API routes
.claude/agents/       AI agents used by the team (writer + reviewer roles)
.github/workflows/    CI checks
docs/                 Team workflow
```

## Team

| Name | Role |
|---|---|
| | Smart contracts |
| | Frontend |
| | API / AI / integration |
| | Product, UX/UI, pitch |

## Acknowledgements
Built with [Scaffold-ETH 2](https://scaffoldeth.io). Thanks to the U-Hackathon organizers, mentors and partners.
