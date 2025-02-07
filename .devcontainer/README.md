<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="width: 50%" src="https://layerzero.network/static/logo.svg"/>
  </a>
</p>

<p align="center">
  <a href="https://layerzero.network" style="color: #a77dff">Homepage</a> | <a href="https://docs.layerzero.network/" style="color: #a77dff">Docs</a> | <a href="https://layerzero.network/developers" style="color: #a77dff">Developers</a>
</p>

<h1 align="center">Devcontainer setup</h1>

## Usage

USE VS-CODE. CURSOR DOES NOT WORK.

### Prebuilt images (default)

By default, the devcontainer will use the prebuilt base images from [GHCR](https://github.com/LayerZero-Labs/devtools/pkgs/container/devtools-dev-base).
(temporary change: using "image": "ghcr.io/layerzero-labs/devtools-dev-base:shankar-fix_dual_arch_ghub_workflow")

### Local images

If the prebuilt images are not available or not accessible, or if work on the base images needs to be tested in a devcontainer, they can be built locally.

To do this, use the provided `devcontainer.local.json` instead of the `devcontainer.json`