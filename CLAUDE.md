# CLAUDE.md

@AGENTS.md

Framework guidance (Scaffold-ETH 2, hooks, components) lives in `AGENTS.md`. The rules below are specific to our U-Hackathon 2026 team and take priority.

## Project context
- Event: U-Hackathon 2026 @ Flow Summit, Web3 track, theme "future of finance and community".
- Chain: **Avalanche Fuji testnet** (C-Chain, EVM, chainId 43113). Foundry network name: `avalancheFuji`.
- Submission deadline: **Friday 16 Oct, 14:00 (GMT+7)**: code, pitch deck, write-up, demo website.
- Team: 3 developers new to Web3 (strong in Web2/React) + 1 UX/business. Explain Web3 concepts briefly when you introduce them.

## What we are building: Phaendin
Single-original documents / real assets ("whoever holds the original has the right") become **one NFT, 1:1**, issued by a trusted partner. Full spec: `README.md`. Demo scope: **Land Title Deed** only (UI). Roles: admin (deployer) adds partners at `/admin`; partners approve at `/partner`; owners use Tokenize / My Vault / Transfers.

- **Flow 1 Tokenize:** A `requestTokenize(partner, …)` → partner `approveRequest` (or `rejectRequest`) → NFT minted to A. Same serial can never be minted twice.
- **Flow 2 Transfer with conditions:** A `approve(vault, id)` → `createDeal(id, B, unlockTime, deadline, price)` → NFT locked → anyone calls `release` once time is reached → NFT to B. A can `cancel` before unlock. **Sale mode** (`price > 0`, AVAX): B calls `pay(id)` (exact price, by `deadline`) and NFT + AVAX swap atomically once unlocked; unpaid after `deadline` → A calls `reclaim(id)`. Price 0 = free transfer (`deadline` 0). After release the deed waits for land-office registration (`RWAToken.confirmRegistration` by the issuer).
- **Redeem:** holder `requestRedeem(id)` → NFT parked in contract → issuing partner `confirmRedeem(rid)` after handover → burned. Holder can `cancelRedeem(rid)` before that.
- **Auto-release:** vault `checkUpkeep`/`performUpkeep` (Chainlink Automation interface); `components/rwa/AutoReleaser.tsx` calls `app/api/keeper` (key: `KEEPER_PRIVATE_KEY`, local chain falls back to Anvil test key).

| Contract (`packages/foundry/contracts`) | Purpose |
|---|---|
| `RWAToken.sol` | ERC-721, partners, tokenize requests, issue, redeem |
| `ConditionalVault.sol` | Locks NFTs until an unlock time; optional sale (pay in AVAX, atomic swap) |

Tests: `packages/foundry/test/RWAVault.t.sol`. Deploy: `script/DeployRWA.s.sol` (called from `Deploy.s.sol`; deployer is set as the demo partner).

Out of scope unless the team asks: stablecoins (native AVAX sale mode is in scope), condition types other than time, upgradeable contracts.

## Team rules
1. Scope is the two flows above, working end to end. Ask before adding features outside them.
2. No feature just to "look Web3": every feature must come from the problem.
3. Keep contracts small. Every contract change needs a test and a `yarn deploy` so the ABI file regenerates.
4. Never print, log, commit or ask for private keys or seed phrases. Secrets go in `.env` / `.env.local` only.
5. API keys are used only in server routes under `packages/nextjs/app/api/`.
6. Don't claim partnerships we don't have: UI and docs say "target partner".
7. Before saying a task is done, run the relevant checks: `yarn test`, `yarn next:lint`, `yarn next:check-types`.

## Team agents (`.claude/agents/`)
| Agent | Use it for |
|---|---|
| `contract-writer` | Writing Solidity contracts, tests and deploy scripts |
| `frontend-writer` | Pages/components that call the contracts with Scaffold-ETH hooks |
| `security-reviewer` | Read-only security review before deploying to Fuji |
| `pr-checker` | Running the CI checks locally before merging to `main` |
| `grumpy-carlos-code-reviewer` | Strict code-quality review (from Scaffold-ETH) |
