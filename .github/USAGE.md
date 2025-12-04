# GitHub Actions

Since we operate with multiple architectures, we need to build and publish the images for each architecture.
We also need to maintain architecture specific caches of the images to prevent the workflow from using the cache of the wrong architecture - notably affects hardhat cache.

We use the `reusable-publish-docker.yaml` workflow to build and publish the images for each architecture.

We use the `reusable-test.yaml` workflow to test the images for each architecture.

Under each workflow, we have a matrix that includes the architecture and the runner.

Runners as of the last change (2025-02-11):

- ubuntu-latest-16xlarge for amd64
- ubuntu-latest-16xlarge-arm for arm64

This generates an entire workflow run for each architecture.

This also means we need to select the right image for the user's architecture.

We can do this by using the `matrix` keyword in the workflow.

Original image: <https://github.com/LayerZero-Labs/devtools/pkgs/container/devtools-dev-base/304693620>

# Docker images guide (base and node images)

- **When to use**: Any time you modify a stage in `Dockerfile` that produces an image used in CI:
  - `base` → `ghcr.io/layerzero-labs/devtools-dev-base`
  - `node-evm-hardhat` → `ghcr.io/layerzero-labs/devtools-dev-node-evm-hardhat`
  - `node-ton-my-local-ton` → `ghcr.io/layerzero-labs/devtools-dev-node-ton-my-local-ton`
  - `node-aptos-local-testnet` → `ghcr.io/layerzero-labs/devtools-dev-node-aptos-local-testnet`
  - `node-initia-localnet` → `ghcr.io/layerzero-labs/devtools-dev-node-initia-localnet`
  - `node-solana-test-validator` → `ghcr.io/layerzero-labs/devtools-dev-node-solana-test-validator`

- **Overview**: Build and publish the changed image(s) from your branch, temporarily point CI to those branch tags, merge, then repoint CI back to `:main`.

## Step-by-step

1. **Edit the Dockerfile**
   - Update the relevant stage(s) inside `Dockerfile` for the image(s) you’re changing.

2. **Push changes to a feature branch**
   - Open a PR as usual.

3. **Build image(s) for your branch**
   - In GitHub Actions, run the workflow "Build base development images" against your branch (file: `.github/workflows/reusable-publish-docker.yaml`).
   - This builds all images (base and nodes) for both `linux/amd64` and `linux/arm64` and publishes a multi-arch manifest with tags:
     - **branch tag** (normalized from your branch name)
     - **commit SHA**
     - **latest** (only on default branch)

4. **Temporarily point CI to your branch image(s)**
   - Replace `:main` with your branch tag only for the image(s) you changed.
   - Files to update:
     - `.github/workflows/reusable-publish.yaml`
       - If you changed the `base` image: `jobs.publish.container.image`
     - `.github/workflows/reusable-test.yaml`
       - If you changed the `base` image:
         - `jobs.build.container.image`
         - `jobs.test.env.DEVTOOLS_BASE_IMAGE`
         - `jobs.test-user.env.DEVTOOLS_BASE_IMAGE`
       - If you changed node image(s), update the matching env var(s):
         - `DEVTOOLS_EVM_NODE_IMAGE`
         - `DEVTOOLS_TON_NODE_IMAGE`
         - `DEVTOOLS_APTOS_NODE_IMAGE`
         - `DEVTOOLS_INITIA_NODE_IMAGE`
         - `DEVTOOLS_SOLANA_NODE_IMAGE`
   - Example replacement:
     - From: `ghcr.io/layerzero-labs/devtools-dev-base:main`
     - To:   `ghcr.io/layerzero-labs/devtools-dev-base:<your-branch-tag>`
   - Note: the branch tag is derived from your branch name (slashes and unsafe chars are normalized). If unsure, confirm the exact tag in the GHCR package page or in the "Inspect image" step of the publish workflow.

5. **Validate CI on the PR**
   - Ensure all checks pass while using the branch-tagged base image.

6. **Merge to `main`**
   - After merge, re-run "Build base development images" on `main` to publish updated `:main` (and `:latest`) multi-arch image(s) for all affected targets.

7. **Revert workflow image references to `:main`**
   - Open a small follow-up PR that restores all temporary replacements back to `:main` for every image you switched in Step 4.

## Tips

- You can quickly locate references with a search for `ghcr.io/layerzero-labs/devtools-dev-`.
- Switch only the images you changed; leave the rest on `:main`.

