# CLAUDE.md

@AGENTS.md

Framework guidance (Scaffold-ETH 2, hooks, components) lives in `AGENTS.md`. The rules below are specific to our U-Hackathon 2026 team and take priority.

## Project context
- Event: U-Hackathon 2026 @ Flow Summit, Web3 track, theme "future of finance and community".
- Chain: **Avalanche Fuji testnet** (C-Chain, EVM, chainId 43113). Foundry network name: `avalancheFuji`.
- Submission deadline: **Friday 16 Oct, 14:00 (GMT+7)** — code, pitch deck, write-up, demo website.
- Team: 3 developers new to Web3 (strong in Web2/React) + 1 UX/business. Explain Web3 concepts briefly when you introduce them.

## Team rules
1. Scope is one demo flow that works end to end. Ask before adding features outside it.
2. Keep contracts small. Every contract change needs a test and a `yarn deploy` so the ABI file regenerates.
3. Never print, log, commit or ask for private keys or seed phrases. Secrets go in `.env` / `.env.local` only.
4. API keys (ElevenLabs, AI) are used only in server routes under `packages/nextjs/app/api/`.
5. Before saying a task is done, run the relevant checks: `yarn test`, `yarn next:lint`, `yarn next:check-types`.

## Team agents (`.claude/agents/`)
| Agent | Use it for |
|---|---|
| `contract-writer` | Writing Solidity contracts, tests and deploy scripts |
| `frontend-writer` | Pages/components that call the contract with Scaffold-ETH hooks |
| `security-reviewer` | Read-only security review before deploying to Fuji |
| `pr-checker` | Running the CI checks locally before merging to `main` |
| `grumpy-carlos-code-reviewer` | Strict code-quality review (from Scaffold-ETH) |
