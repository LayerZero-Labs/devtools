This document is intended for the maintainers of the examples that are in `/examples` in this repo. It is also meant as a guide for coding agents for the purposes of reviewing or editing.

Currently, this document will only detail the structure for the READMEs of the examples.

## Structure for examples' READMEs

1. **Header**
   - Goal: Branding + promote docs site + entrypoint
   - Contents: LayerZero logo + links to docs and dev portal

2. **Example Title**
   - Goal: What the example will teach
   - Contents: Title + 1–2 sentence description (goal-oriented preferred)

3. **Table of Contents**
   - Goal: Allow user to easily navigate the README
   - Contents: TOC of all headings

4. **Prerequisite Knowledge**
   - Goal: What to understand before running the example
   - Contents: e.g., What is an OApp? What is an OFT?

5. **Introduction** _(optional)_
   - Goal: What is this example about
   - Contents: Brief explanation if needed; otherwise rely on title + prerequisites

6. **Requirements**
   - Goal: What needs to be installed
   - Contents: List tools + version numbers; consider noting testnet token needs

7. **Scaffold this example**
   - Goal: How to init the example
   - Contents: `pnpm dlx create-lz-oapp@latest --example <name>`

8. **Helper Tasks (inline notice)**
   - Goal: Know that helper tasks exist
   - Contents: Single line pointing to the detailed section

9. **Setup**
   - Goal: What to configure before running
   - Contents: `.env` instructions, deployer account setup

10. **Build**
    - Goal: How to build contracts/programs/modules
    - Contents: Build command(s)

11. **Deploy**
    - Goal: How to deploy contracts/programs/modules
    - Contents: Deploy command + minting instructions (if applicable)

12. **Enable Messaging**
    - Goal: How to set up OApps for use
    - Contents: LZ config, init step, wiring step

13. **Sending Message/OFT/ONFT**
    - Goal: How to trigger cross-chain actions
    - Contents: Send command(s) for both/all directions

14. **Next Steps**
    - Goal: What to know after basic deployment
    - Contents: Production Checklist + links to Security Stack, Message Options

15. **Production Deployment Checklist**
    - Goal: Prepare for production
    - Contents: Gas profiling, DVNs, confirmations

16. **Appendix**
    - Goal: Mark end of main build steps
    - Contents: Additional configuration, testing, and advanced info

    16.1. **Running tests**
       - Goal: How to test contracts/programs
       - Contents: Test command(s)

    16.2. **Adding other chains**
       - Goal: Support more networks
       - Contents: Add chain logic; update `hardhat.config.ts`

    16.3. **Using Multisigs**
       - Goal: Deploy using multisig
       - Contents: Command param diffs; multi-VM notes

    16.4. **LayerZero Hardhat Helper Tasks (detailed)**
       - Goal: Know all available helpers
       - Contents: Link to docs + built-in + local tasks

    16.5. **Contract/Program Verification**
       - Goal: How to verify deployments
       - Contents: Per-VM verification doc links

    16.6. **Troubleshooting**
       - Goal: Solve common issues
       - Contents: Link to global troubleshooting + local fixes





Any sections that don't appear in the above list should be considered for removal.