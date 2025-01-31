# We will alow consumers to specify the node version in case we want
# to test under different versions (since we cannot control users environment)
# 
# There is nothing wrong with 18.16.0 except for a tiny issue
# in docker compose - a segmentation fault that happens
# when we try to use a dynamic import in our tests (affecting both mocha & jest)
# 
# The issue has been described here https://github.com/jestjs/jest/issues/12286
# And relates to this node issue here https://github.com/nodejs/node/issues/43205
# 
# This issue does not affect users, it's only related to the test runner
# so the code will still work on node 18.16.0
ARG NODE_VERSION=20.11.0

# We will allow consumers to override build stages with prebuilt images
# 
# This will allow CI environments to supply the prebuilt images
# while not breaking the flow for local development
# 
# Local development does not by default have access to GHCR and would require
# an additional step (docker login). While this step is easy, it is still nicer 
# to provide a transiton period during which the local flow remains unchanged 
# and the base image is built locally
# 
# The CI environment will use base images from https://github.com/LayerZero-Labs/devtools/pkgs/container/devtools-dev-base
# e.g. ghcr.io/layerzero-labs/devtools-dev-base:main
ARG BASE_IMAGE=base

# We will provide a way for consumers to override the default EVM node image
# 
# This will allow CI environments to supply the prebuilt EVM node image
# while not breaking the flow for local development
ARG EVM_NODE_IMAGE=node-evm-hardhat

#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#          Base machine image with system packages
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM node:$NODE_VERSION AS machine

ENV PATH="/root/.cargo/bin:$PATH"

# Update package lists
RUN apt update

# Update the system packages
RUN apt-get update

# Add required packages
RUN apt-get install --yes \
    # expect is a utility that can be used to test CLI scripts
    # 
    # See a tutorial here https://www.baeldung.com/linux/bash-interactive-prompts
    expect \
    # Parallel is a utilit we use to parallelize the BATS (user) tests
    parallel

# Install rust
ARG RUST_TOOLCHAIN_VERSION=1.75.0
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain ${RUST_TOOLCHAIN_VERSION}

# Install docker
RUN curl -sSL https://get.docker.com/ | sh

#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#          Image that builds EVM developer tooling
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM machine AS evm

ARG CARGO_BUILD_JOBS=default
ENV CARGO_BUILD_JOBS=$CARGO_BUILD_JOBS

# Install foundry
ENV PATH="/root/.foundry/bin:$PATH"
RUN curl -L https://foundry.paradigm.xyz | bash
RUN foundryup

# Install SVM, Solidity version manager
ARG SVM_RS_VERSION=0.5.4
RUN cargo install svm-rs@${SVM_RS_VERSION}

# Install solc 0.8.22
ARG SOLC_VERSION=0.8.22
RUN svm install ${SOLC_VERSION}

# Make sure we can execute the binaries
RUN forge --version
RUN anvil --version
RUN chisel --version
RUN cast --version

#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#          Base node image with just the build tools
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM machine AS base

WORKDIR /app

# We'll add an empty NPM_TOKEN to suppress any warnings
ENV NPM_TOKEN=
ENV NPM_CONFIG_STORE_DIR=/pnpm
ENV PATH="/root/.foundry/bin:$PATH"

# Get EVM tooling
COPY --from=evm /root/.cargo/bin/solc /root/.cargo/bin/solc
COPY --from=evm /root/.cargo/bin/svm /root/.cargo/bin/svm
COPY --from=evm /root/.foundry /root/.foundry
COPY --from=evm /root/.svm /root/.svm

# Enable corepack, new node package manager manager
# 
# See more here https://nodejs.org/api/corepack.html
RUN corepack enable

# Output versions
RUN node -v
RUN pnpm --version
RUN git --version
RUN forge --version
RUN anvil --version
RUN chisel --version
RUN cast --version
RUN solc --version
RUN docker compose version

#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#        Image that prepares the project for development
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM $BASE_IMAGE AS development

ENV NPM_CONFIG_STORE_DIR=/pnpm
ENV NPM_CONFIG_PACKAGE_IMPORT_METHOD=copy

WORKDIR /app

COPY pnpm-*.yaml .npmrc package.json ./

RUN \
    #  Mount pnpm store
    --mount=type=cache,id=pnpm-store,target=/pnpm \
    # Fetch dependencies to the pnpm store based on the lockfile
    pnpm fetch --prefer-offline --frozen-lockfile

COPY . .

RUN \
    #  Mount pnpm store
    --mount=type=cache,id=pnpm-store,target=/pnpm \
    # Install dependencies (fail if we forgot to update the lockfile)
    pnpm install --recursive --offline --frozen-lockfile

#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#              Image that builds a hardhat EVM node
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM development AS node-evm-hardhat-builder

# Build the node
RUN pnpm build --filter @layerzerolabs/test-evm-node

# Isolate the project
RUN --mount=type=cache,id=pnpm-store,target=/pnpm \
    pnpm --filter @layerzerolabs/test-evm-node deploy --prod /build

#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#              Image that runs a hardhat EVM node
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM node:$NODE_VERSION-alpine AS node-evm-hardhat

WORKDIR /app

# Update system packages
RUN apk update
# Install curl for healthcheck
RUN apk add curl --no-cache

# Get the built code
# 
# By default we'll get it from the dist folder
# but for e.g. next we want to grab it from dist/.next/standalone
COPY --from=node-evm-hardhat-builder /build /app

# Enable corepack, new node package manager manager
# 
# See more here https://nodejs.org/api/corepack.html
RUN corepack enable

# We want to keep the internals of the EVM node images encapsulated so we supply the healthcheck as a part of the definition
HEALTHCHECK --interval=2s --retries=20 CMD curl -f http://0.0.0.0:8545 || exit 1

# Run
ENTRYPOINT pnpm start

#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#              Image that runs a hardhat EVM node
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM $EVM_NODE_IMAGE AS node-evm

#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#              Image that represents a user machine
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM $BASE_IMAGE AS user
