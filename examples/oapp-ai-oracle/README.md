<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="width: 400px" src="https://docs.layerzero.network/img/LayerZero_Logo_Black.svg"/>
  </a>
</p>

<p align="center">
  <a href="https://docs.layerzero.network/" style="color: #a77dff">LayerZero Docs</a> · <a href="https://ark.honeyhughub.world/neo-oracle/">Live Demo</a>
</p>

<h1 align="center">AI Evidence Oracle (OApp) — Procedural Proof</h1>

<p align="center">
  A new trust primitive for the AI era.<br/>
  Oracle verifies AI <em>process compliance</em>, not data correctness — then dispatches verified decisions cross-chain via LayerZero V2.
</p>

## The Problem

AI outputs are non-deterministic. Every existing trust primitive fails for them:

| Primitive | Why it fails for AI |
|-----------|-------------------|
| PoW | Can't prove AI "did work" — inference isn't hashable |
| PoS | Stake doesn't grant cognitive authority |
| ZK Proof | AI reasoning isn't a deterministic circuit |
| Consensus | Re-running same prompt ≠ same output |
| Multisig | Signers judge conclusion, not process |

## The Solution: Procedural Proof

Don't verify the conclusion. Verify the process.

```
Trust nothing. Verify process. Challenge freely.
```

The AI follows a public SOP (Standard Operating Procedure). It submits an evidence package proving every step was followed. Independent verifiers audit the process — not the data, not the conclusion, just "was the SOP followed?"

Anyone can replay the verification. Fraud is always detectable.

## Architecture — Four Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: EVIDENCE         AI executes SOP → evidence → IPFS │
│                           Hash committed on-chain            │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: VERIFICATION     Verifiers audit evidence vs SOP   │
│                           Threshold signatures (2-of-3)      │
├─────────────────────────────────────────────────────────────┤
│ Layer 3: DISTRIBUTION     LayerZero V2 cross-chain dispatch │
│                           One judgment → multiple chains      │
├─────────────────────────────────────────────────────────────┤
│ Layer 4: EXECUTION        Target chain receives & acts       │
│                           _lzReceive() triggers logic        │
└─────────────────────────────────────────────────────────────┘
```

## Isomorphic to LayerZero DVN

The trust model is structurally identical to how DVN secures cross-chain messages:

| | LayerZero DVN | Evidence Oracle |
|--|--------------|-----------------|
| **Verifies** | Message transport integrity | AI SOP compliance |
| **Method** | Hash comparison (source ↔ destination) | Evidence replay (package ↔ SOP rules) |
| **Trust source** | Not the verifier — the replayability | Not the verifier — the replayability |
| **Fraud proof** | Anyone reads source chain hash | Anyone fetches IPFS evidence + SOP |
| **Selection** | OApp chooses DVN set | Agent chooses Verifier set |

## Prerequisite Knowledge

- [What is an OApp?](https://docs.layerzero.network/v2/concepts/applications/oapp-standard)
- [How does LayerZero work?](https://docs.layerzero.network/v2/concepts/protocol/core-concepts)

## Requirements

- `Node.js` >= 18.16.0
- `pnpm` (recommended)

## Setup

```bash
# Clone
git clone https://github.com/fmdd123123-create/neo-oracle.git
cd neo-oracle

# Install
pnpm install

# Configure
cp .env.example .env
# Edit .env with your private key (needs testnet ETH + BNB)
```

## Build

```bash
pnpm compile
```

## Deploy

```bash
# Deploy to both testnets
pnpm deploy --network eth-sepolia
pnpm deploy --network bsc-testnet
```

## Wire (Set Peers)

```bash
pnpm wire
```

## Usage — Full Flow

### 1. AI submits decision with evidence

```bash
pnpm hardhat ai:submit --network eth-sepolia --sop rainfall-trigger-v1
```

### 2. Verifier audits SOP compliance

```bash
pnpm hardhat verify:decision --network eth-sepolia --id 0
```

### 3. Dispatch verified decision cross-chain

```bash
pnpm hardhat dispatch:decision --network eth-sepolia --id 0 --dst-eid 40102
```

### 4. (Optional) Challenge a fraudulent decision

```bash
pnpm hardhat challenge:decision --network eth-sepolia --id 0 --reason "Source not in whitelist"
```

## Live Deployment

| Network | Contract | EID |
|---------|----------|-----|
| Eth Sepolia | `0xaa24CC417EC7ae219F52C400E64E600AAfD3f45d` | 40161 |
| BSC Testnet | `0xc7FFF00d2c2C6B0aC5D726d3E6e317cCae638214` | 40102 |

Cross-chain message dispatched and verified on [LayerZeroScan](https://testnet.layerzeroscan.com).

## SOP Example

See [`sop/rainfall-trigger-v1.json`](./sop/rainfall-trigger-v1.json) — a complete Standard Operating Procedure for rainfall-triggered insurance. Each step defines required evidence, allowed sources, and verification criteria.

## Why This Matters

Every existing Oracle (Chainlink, Band, API3) answers: **"Is this DATA correct?"**

Evidence Oracle answers: **"Was this PROCESS followed?"**

For AI outputs — where correctness is undecidable but process compliance is verifiable — this is the only viable trust model.

## Roadmap

- [x] Core contract with four-layer architecture
- [x] LayerZero V2 OApp integration
- [x] Cross-chain dispatch (Sepolia → BSC Testnet)
- [x] SOP framework with verification checklist
- [x] Hardhat tasks for full flow demo
- [ ] IPFS integration (Pinata/web3.storage)
- [ ] EIP-712 typed verifier signatures
- [ ] Slashing mechanism for fraudulent verifiers
- [ ] Multi-chain scatter (1 decision → N chains)
- [ ] SOP governance (who writes/modifies SOPs)

## Acknowledgments

Built on [LayerZero V2](https://layerzero.network). The DVN architecture provided both the infrastructure for cross-chain distribution and the conceptual model for our trust design — the isomorphism between DVN transport verification and SOP compliance verification is the foundation of Procedural Proof.

## License

[MIT](./LICENSE)

---

*NEO Oracle — Trust nothing. Verify process. Challenge freely.*

Built by [NEOscript](https://ark.honeyhughub.world/neo-oracle/)
