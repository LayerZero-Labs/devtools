This document is intended for the maintainers of the examples that are in `/examples` in this repo. It is also meant as a guide for coding agents for the purposes of reviewing or editing.

Currently, this document will only detail the structure for the READMEs of the examples.

## Structure for examples' READMEs

1. **Header**
   - Goal: Branding + promote docs site + entrypoint
   - Contents: LayerZero logo + links to docs and dev site

2. **Example Title**
   - Goal: What the example will teach
   - Contents: Title and 1–2 sentence description (possibly goal-oriented)

3. **Prerequisite Knowledge**
   - Goal: What to understand before running the example
   - Contents: Short list (≤3 items) like OApp, OFT

4. **Requirements**
   - Goal: What needs to be installed
   - Contents: Tools + exact versions

5. **Scaffold this example**
   - Goal: How to init the example
   - Contents: `npx create-lz-oapp@latest --example <example>`

6. **Helper Tasks (inline notice)**
   - Goal: Know that helper tasks exist
   - Contents: Statement + link to helper section

7. **Setup**
   - Goal: What to configure before running
   - Contents: .env instructions, deployer account setup

8. **Build**
   - Goal: How to build contracts/programs/modules
   - Contents: Build command(s)

9. **Deploy**
   - Goal: How to deploy contracts/programs/modules
   - Contents: Deploy command + minting instructions (if needed)

10. **Wiring / Configuring OApps**
    - Goal: How to wire OApps for cross-chain use
    - Contents: LZ config, init step, wiring step

11. **Sending Message/OFT/ONFT**
    - Goal: How to trigger cross-chain action
    - Contents: Command to send message/OFT/ONFT, both/all directions

12. **Next Steps**
    - Goal: What to know after initial deployment
    - Contents: Links to Production Checklist, Security Stack, Message Options

13. **Production Deployment Checklist**
    - Goal: What’s needed for production readiness
    - Contents: Gas profiling, DVN config, confirmation count

14. **Appendix**
    - Goal: Mark end of main build steps
    - Contents: Supplementary instructions and optional configurations

    14.1. **Running tests**
       - Goal: How to test the contracts/programs
       - Contents: Test commands

    14.2. **Adding other chains**
       - Goal: How to add additional networks
       - Contents: How to add chains + example config (e.g. modify `hardhat.config.ts`)

    14.3. **Using Multisigs**
       - Goal: How to deploy if using a multisig
       - Contents: Command param diffs + multi-VM notes

    14.4. **LayerZero Hardhat Helper Tasks (detailed)**
       - Goal: Know all available helpers
       - Contents: Link to docs + list of built-in and local helper tasks

    14.5. **Contract/Program Verification**
       - Goal: How to verify
       - Contents: Links to verification docs (per VM)

    14.6. **Troubleshooting**
       - Goal: How to debug errors/issues
       - Contents: Link to global page + example-specific fixes




Any sections that don't appear in the above list should be considered for removal.