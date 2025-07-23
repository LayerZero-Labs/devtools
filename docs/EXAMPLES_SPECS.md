# Example Specs

## Table of Contents

- [Audience](#audience)
- [README Structure](#readme-structure)
- [Example README Principles](#example-readme-principles)
- [Example Code Principles](#example-code-principles)

## Audience

This guide is intended for both:
- **Developers** maintaining or contributing to `/examples`
- **Coding agents** (e.g. Cursor, Copilot, GPT) that assist with editing, reviewing, or scaffolding examples

AI agents should be pointed to this file via `AGENTS.md` or `.cursor/rules`.

Currently, this document will only detail the structure for the READMEs of the examples.

## README Structure

1. **Header**
   - Goal: Branding + promote docs site + entrypoint
   - Contents: LayerZero logo + links to docs and dev portal

2. **Example Title**
   - Goal: What the example will teach
   - Contents: Title + 1–2 sentence goal-style description

3. **Table of Contents**
   - Goal: Allow user to easily navigate the README
   - Contents: TOC of all headings

4. **Prerequisite Knowledge**
   - Goal: What to understand before running the example
   - Contents: e.g., What is an OApp? What is an OFT?

5. **Introduction** _(optional)_
   - Goal: High-level context on what this example covers
   - Contents: Brief explanation; skip if title + prerequisites suffice

6. **Requirements**
   - Goal: What needs to be installed
   - Contents: Tools + versions; optionally call out testnet funding needs

7. **Scaffold this example**
   - Goal: How to initialize the example
   - Contents: `pnpm dlx create-lz-oapp@latest --example <name>` (Some examples require a feature flag. Refer to `packages/create-lz-oapp/src/config.ts` to verify)

8. **Helper Tasks (inline notice)**
   - Goal: Let users know helpers exist
   - Contents: Single-line pointer to helper tasks section

9. **Setup**
   - Goal: What to configure before building
   - Contents: `.env` setup, deployer account prep

10. **Build**
    - Goal: How to compile contracts/programs/modules
    - Contents: Build commands

11. **Deploy**
    - Goal: How to deploy contracts/programs/modules
    - Contents: Deploy command + minting instructions (if applicable)

12. **Enable Messaging**
    - Goal: How to wire/configure OApps for messaging
    - Contents: LZ config, init, and wiring steps

13. **Sending Message/OFT/ONFT**
    - Goal: Trigger a cross-chain action
    - Contents: CLI command to triffer send, both/all directions. E.g. for examples/oft, it is `pnpm hardhat lz:oft:send --src-eid 40232 --dst-eid 40231 --amount 1 --to <EVM_ADDRESS>`

14. **Next Steps**
    - Goal: What to know after completing the deployment
    - Contents: Production Deployment Checklist + links (Security Stack, Message Options)

15. **Production Deployment Checklist**
    - Goal: Prep for production usage
    - Contents: Gas profiling, DVN config, confirmation settings

16. **Appendix**
    - Goal: Mark end of core deployment steps
    - Contents: Additional topics and configuration

    16.1. **Running tests**
       - Goal: How to test contracts/programs
       - Contents: Test commands

    16.2. **Adding other chains**
       - Goal: Expand the example to more networks
       - Contents: Add logic, update `hardhat.config.ts`

    16.3. **Using Multisigs**
       - Goal: Deploy using a multisig wallet
       - Contents: Command param diffs, multi-VM notes

    16.4. **LayerZero Hardhat Helper Tasks (detailed)**
       - Goal: Understand all helper tasks
       - Contents:
         - Link to docs for the built-in tasks (after the page has been created in docs)
         - local tasks (defined in src/tasks/index.ts) should have their params listed (manual style)

    16.5. **Contract/Program Verification**
       - Goal: Verify deployments
       - Contents: VM-specific verification docs

    16.6. **Troubleshooting**
       - Goal: Resolve errors and setup issues
       - Contents: Link to general troubleshooting + local fixes

Any sections that don't appear in the above list should be considered for removal. Before removing, ask the user for confirmation.


---

## Example README Principles

1. Example READMEs should focus on required commands, with elaborations linked to docs.
2. Avoid duplicating explanations of general concepts (e.g., OFTs)—link to docs instead.
3. The first mention of concepts like Endpoint IDs, Wiring, etc. should link to the glossary: https://docs.layerzero.network/v2/home/glossary
4. TODO: Every README should invite partners to provide feedback to drive improvements.

---

## Example Code Principles

1. **Options-first**: Enforced Options implementation and instructions should be included by default (e.g. in `layerzero.config.ts`).
2. **Two chains only**: Examples should use only 2 chains by default to reduce testnet setup friction; use “Add other chains” section to scale up if needed. For EVM, prefer using the following in the following order: Optimism Sepolia, Arbitrum Sepolia.
