
<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<p align="center">
  <a href="https://layerzero.network" style="color: #a77dff">Homepage</a> | <a href="https://docs.layerzero.network/" style="color: #a77dff">Docs</a> | <a href="https://layerzero.network/developers" style="color: #a77dff">Developers</a>
</p>

<h1 align="center">LayerZero DevTools Principles</h1>


## Overview

These **LayerZero DevTools Principles** serve as a foundational guide to ensure a high standard of developer experience when using LayerZero's developer tooling. These principles provide a structured approach to CLI design, error handling, debugging, and documentation, aligning all DevTools efforts with a shared vision of usability, efficiency, and consistency. By adhering to these principles when developing LayerZero developer tooling, we aim to make developer interactions with LayerZero seamless, reducing friction and improving productivity. These in turn will help reduce time to deployment and wiring, reduce developer churn and reduce blockers caused by insufficient documentation or unhelpful error messages.

## Principles

### CLI Design Principles

1. Deployments must generate a deployment file.

2. Successful deployments should print to terminal the deployed contract/account addresses.

3. CLI commands that depend on existing deployments should reference values via deployment files instead of requiring manual input.

### Error Handling and Debugging

1. Manually specified values should be validated where possible (e.g., reject EOAs when an EVM contract address is expected). Validation should aim to intercept bad values early to prioritize context-specific error messages over generic ones.

2. Caught errors should suggest a fix or link to relevant docs.

3. Provide a debug command for required partner instructions, ensuring issues can be diagnosed through debug output.

### Documentation and README’s

1. Example READMEs should focus on required commands, with elaborations linked to docs.

2. Example READMEs: Avoid duplicating explanations of general concepts (e.g., OFTs) in READMEs—link to docs instead.

3. Every README should invite partners to provide feedback to drive improvements.


## Appendix

### Definitions

Example READMEs - README for example repos.
