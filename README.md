# RWA Vault _(working name)_

> One original, one token. Turn single-original documents and real assets into one NFT that can't be lost, faked, or pledged twice.

Built at **U-Hackathon 2026 · Flow Summit Bangkok** (Web3 track, theme "future of finance and community") on **Avalanche**.

| | |
|---|---|
| 🌐 Live demo | _add Vercel link_ |
| ⛓️ Contracts (Avalanche Fuji) | _add addresses + Snowtrace links_ |
| 🎞️ Pitch deck | _add link_ |
| 🎥 Demo video | _add link_ |

## The problem

Some documents work on one rule: **whoever holds the original has the right.** The paper is worthless; the right it stands for (to collect goods, to receive money) is not. Because the only proof is one piece of paper, and there is no shared record everyone can see:

1. **Lost or destroyed:** flood, fire, misplaced.
2. **Forged:** the receiver can't check if it's real.
3. **Slow to transfer:** the original has to be physically handed over.
4. **Nobody knows who holds it:** the same document gets pledged or sold to several lenders at once (double financing).

**Demo scope:** 🏞️ **Land title deeds**. The partner (e.g. a bank that already holds deeds as loan collateral) checks the paper deed and the owner's ID, keeps the paper, and issues one token for it. The contracts accept any asset type, so other single-original assets can follow.

## Our solution

The **original issuer** (our partner) issues **one NFT** in place of the paper. The owner keeps it in their wallet. Anyone can verify who issued it, there is exactly one, everyone sees the same ownership history, and it can be sent to someone else under conditions.

**Flow 1: Tokenize**
1. A connects a wallet and requests to tokenize an asset (type, name, serial/document no., photo).
2. A partner checks the real item/document off-chain and approves. The NFT is minted to A (1:1). The same serial can never be minted twice.

**Flow 2: Transfer with conditions**
1. A picks an asset, picks receiver B and sets the condition: **unlock time**.
2. The NFT is locked in the vault contract. Nobody, including A, can sell or pledge it elsewhere meanwhile.
3. When the time is reached, the NFT goes straight to B's wallet.
4. A can cancel before the unlock time and get the NFT back.

**Redeem:** the holder requests the real item back; the NFT is parked in the contract; the issuing partner hands the item over and confirms, which burns the NFT. The holder can cancel before that.

**Automatic release:** the vault exposes `checkUpkeep` / `performUpkeep` (Chainlink Automation interface). In the demo our keeper (`/api/keeper`) releases due transfers on its own; in production Chainlink Automation would.

## Why on-chain

| Check | On-chain? |
|---|---|
| This token was issued by the real issuer | ✅ issuer recorded per token, only approved partners can issue |
| Who holds it now, and there is only one | ✅ ERC-721 + unique serial |
| Every transfer is recorded and visible to all parties | ✅ `Transfer` events |
| Locked while pledged/promised, so it can't be pledged twice | ✅ held by `ConditionalVault` |
| Paper original matches the token | ❌ off-chain: the issuer mints the token and voids/stamps the paper |
| The underlying right still exists (goods still in the warehouse) | ❌ off-chain: partner responsibility |

A normal database run by one company would let that company edit ownership. Here no single party, including us, can rewrite who holds what.

## How it works

```
User ──► Next.js app ──► Wallet (sign) ──► Avalanche Fuji
                                            ├── RWAToken         (NFT, partners, requests, redeem)
                                            └── ConditionalVault (lock until time, release, cancel)
```

| Contract | Key functions |
|---|---|
| `RWAToken` | `requestTokenize`, `approveRequest`, `rejectRequest`, `issue`, `requestRedeem`, `confirmRedeem`, `cancelRedeem`, `setPartner`, `getAsset`, `tokensOf`, `getAllRequests` |
| `ConditionalVault` | `createDeal`, `release`, `cancel`, `checkUpkeep`, `performUpkeep`, `getAllDeals`, `canRelease` |

| Layer | Tech |
|---|---|
| Smart contracts | Solidity, Foundry, OpenZeppelin |
| Chain | Avalanche Fuji C-Chain |
| Frontend | Next.js (App Router), RainbowKit, wagmi, viem, DaisyUI |
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

## Legal note

The token's legal effect comes from the **issuer accepting it in place of the paper**, not from the blockchain itself. Transfer rules differ by document type (delivery, endorsement, or assignment of claims under Thai CCC s.306). Partners shown in the pitch are **target partners**, not signed deals.

## Repository layout

```
packages/
├── foundry/          Smart contracts, tests, deploy scripts
└── nextjs/           Web app
.claude/agents/       AI agents used by the team (writer + reviewer roles)
.github/workflows/    CI checks
docs/                 Team workflow
```

## Team

| Name | Role |
|---|---|
| | Smart contracts |
| | Frontend |
| | Frontend / integration |
| | Product, UX/UI, pitch |

## Acknowledgements
Built with [Scaffold-ETH 2](https://scaffoldeth.io). Thanks to the U-Hackathon organizers, mentors and partners.
