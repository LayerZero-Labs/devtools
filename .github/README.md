# GitHub Actions

Since we operate with multiple architectures, we need to build and publish the images for each architecture.
We also need to maintain architecture specific caches of the images to prevent the workflow from using the cache of the wrong architecture - notably affects hardhat cache.

We use the `reusable-publish-docker.yaml` workflow to build and publish the images for each architecture.

We use the `reusable-test.yaml` workflow to test the images for each architecture.

Under each workflow, we have a matrix that includes the architecture and the runner.

Runners as of the last change (2025-02-12):

- ubuntu-latest-16xlarge for amd64
- ubuntu-latest-16xlarge-arm for arm64

This generates an entire workflow run for each architecture.

This also means we need to select the right image for the user's architecture.

We can do this by using the `matrix` keyword in the workflow.

Original image: <https://github.com/LayerZero-Labs/devtools/pkgs/container/devtools-dev-base/304693620>