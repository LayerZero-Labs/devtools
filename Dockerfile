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
ARG NODE_VERSION=20.10.0

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

# We will provide a way for consumers to override the default Aptos node image
# 
# This will allow CI environments to supply the prebuilt EVM node image
# while not breaking the flow for local development
ARG APTOS_NODE_IMAGE=node-aptos-local-testnet

# We will provide a way for consumers to override the default EVM node image
# 
# This will allow CI environments to supply the prebuilt EVM node image
# while not breaking the flow for local development
ARG EVM_NODE_IMAGE=node-evm-hardhat

# We will provide a way for consumers to override the default Solana node image
# 
# This will allow CI environments to supply the prebuilt Solana node image
# while not breaking the flow for local development
ARG SOLANA_NODE_IMAGE=node-solana-test-validator

# We will provide a way for consumers to override the default TON node image
# 
# This will allow CI environments to supply the prebuilt TON node image
# while not breaking the flow for local development
ARG TON_NODE_IMAGE=node-ton-my-local-ton

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
    parallel \
    # Utilities required to build solana
    pkg-config libudev-dev llvm libclang-dev protobuf-compiler \
    # Utilities required to build aptos CLI
    libssl-dev libdw-dev lld \
    # Required for TON to run
    libatomic1 libssl-dev

# Install rust
ARG RUST_TOOLCHAIN_VERSION=1.83.0
ENV RUSTUP_VERSION=1.83.0
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain ${RUST_TOOLCHAIN_VERSION}

# Install docker
RUN curl -sSL https://get.docker.com/ | sh

#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#          Image that builds Aptos developer tooling
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM machine AS aptos

WORKDIR /app/aptos

ARG APTOS_VERSION=6.0.1
RUN \
    (\
    # We download the source code and extract the archive
    curl -s -L https://github.com/aptos-labs/aptos-core/archive/refs/tags/aptos-cli-v${APTOS_VERSION}.tar.gz | tar -xz && \
    # Then rename the directory just for convenience
    mv ./aptos-core-aptos-cli-v${APTOS_VERSION} ./src \
    )

# Switch to the project
WORKDIR /app/aptos/src

# Configure cargo. We want to provide a way of limiting cargo resources
# on the github runner since it is not large enough to support multiple cargo builds
ARG CARGO_BUILD_JOBS=default
ENV CARGO_BUILD_JOBS=$CARGO_BUILD_JOBS

# Install aptos from source
RUN cargo build --package aptos --profile cli

# Copy the build artifacts
RUN mkdir -p /root/.aptos/bin/ && cp -R ./target/cli/aptos /root/.aptos/bin/

# Delete the source files
RUN rm -rf /app/aptos/aptos-core

# Make sure we can execute the binary
ENV PATH="/root/.aptos/bin:$PATH"
RUN aptos --version

#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#               Image that builds AVM & Anchor
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM machine AS avm

WORKDIR /app/avm

# Configure cargo. We want to provide a way of limiting cargo resources
# on the github runner since it is not large enough to support multiple cargo builds
ARG CARGO_BUILD_JOBS=default
ENV CARGO_BUILD_JOBS=$CARGO_BUILD_JOBS

RUN rustup default 1.78.0
# Install AVM - Anchor version manager for Solana
RUN cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 avm

# Install anchor
ARG ANCHOR_VERSION=0.29.0
RUN avm install ${ANCHOR_VERSION}
RUN avm use ${ANCHOR_VERSION}

ENV PATH="/root/.avm/bin:$PATH"
RUN anchor --version
RUN avm --version

#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#                 Image that builds Solana CLI
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM machine AS solana

WORKDIR /app/solana

# Configure cargo. We want to provide a way of limiting cargo resources
# on the github runner since it is not large enough to support multiple cargo builds
ARG CARGO_BUILD_JOBS=default
ENV CARGO_BUILD_JOBS=$CARGO_BUILD_JOBS

# Install Solana using a binary with a fallback to installing from source
ARG SOLANA_VERSION=1.18.26
RUN \
    # First we try to download prebuilt binaries for Solana
    (\
    curl --proto '=https' --tlsv1.2 -sSf https://release.anza.xyz/v${SOLANA_VERSION}/install | sh -s && \
    mkdir -p /root/.solana && \
    # Copy the active release directory into /root/.solana (using cp -L to dereference any symlinks)
    cp -LR /root/.local/share/solana/install/active_release/bin /root/.solana/bin \
    ) || \
    # If that doesn't work, we'll need to build Solana from source
    (\
    # We download the source code and extract the archive
    curl -s -L https://github.com/anza-xyz/agave/archive/refs/tags/v${SOLANA_VERSION}.tar.gz | tar -xz && \
    # Then run the installer
    # 
    # We set the rust version to our default toolchain (must be >= 1.76.0 to avoid problems compiling ptr_from_ref code)
    # See here https://github.com/inflation/jpegxl-rs/issues/60
    ./agave-${SOLANA_VERSION}/scripts/cargo-install-all.sh /root/.solana \
    )

# Make sure we can execute the binaries
ENV PATH="/root/.solana/bin:$PATH"
RUN solana --version

#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#          Image that builds TON developer tooling
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM machine AS ton

WORKDIR /app/ton

RUN apt-get install -y \
    curl \
    unzip

RUN <<-EOF
    case "$(uname -m)" in
        aarch64) TON_ARCH="arm64" ;;
        x86_64) TON_ARCH="x86_64" ;;
        *) exit 1 ;;
    esac

    curl -sSLf https://github.com/ton-blockchain/ton/releases/download/v2024.12-1/ton-linux-${TON_ARCH}.zip > ton.zip
    unzip -qq -d bin ton
    chmod a+x bin/*
EOF

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
ENV TON_PATH="/root/.ton/bin"
ENV PATH="/root/.aptos/bin:/root/.avm/bin:/root/.foundry/bin:/root/.solana/bin:$TON_PATH:$PATH"

# Get aptos CLI
COPY --from=aptos /root/.aptos/bin /root/.aptos/bin

# Get solana tooling
COPY --from=avm /root/.cargo/bin/anchor /root/.cargo/bin/anchor
COPY --from=avm /root/.cargo/bin/avm /root/.cargo/bin/avm
COPY --from=avm /root/.avm /root/.avm
COPY --from=solana /root/.solana/bin /root/.solana/bin

# Get TON tooling
COPY --from=ton /app/ton/bin /root/.ton/bin

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
RUN anchor --version
RUN avm --version
RUN aptos --version
RUN forge --version
RUN anvil --version
RUN chisel --version
RUN cast --version
RUN solc --version
RUN solana --version
RUN func -V
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
#              Image that builds an Aptos node
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM machine AS node-aptos-local-testnet

ENV PATH="/root/.aptos/bin:$PATH"

# Get aptos CLI
COPY --from=aptos /root/.aptos/bin /root/.aptos/bin

# We'll provide a default healthcheck by asking for the chain information
HEALTHCHECK --interval=2s --retries=20 CMD curl -f http://0.0.0.0:8080/v1 || exit 1

# By default, Aptos exposes the following ports:
# 
# Node API                          8080
# Transaction stream                50051
# Faucet is ready                   8081
ENTRYPOINT aptos

CMD ["node", "run-local-testnet", "--force-restart", "--assume-yes"]

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

# We want to keep the internals of the EVM node images encapsulated so we supply the healthcheckk as a part of the definition
HEALTHCHECK --interval=2s --retries=20 CMD curl -f http://0.0.0.0:8545 || exit 1

# Run the shit
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
#              Image that builds a MyLocalTON TON node
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM ubuntu:24.04 AS node-ton-my-local-ton

ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Update system packages
RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive TZ=Etc/UTC apt-get install --yes \
    curl \
    # Java
    openjdk-17-jdk \
    # Python
    python3-pip \
    # Build tools
    # 
    # gcc-13 and gcc-13-aarch64-linux-gnu are required for the arm64 platform
    # since without them glibc version incompatibility will prevent ton-http-api from running
    gcc-13 gcc-13-aarch64-linux-gnu libc6 libc6-dev \
    # TON complains about not having this
    lsb-release tzdata


# Install Ton HTTP API
# 
# Ubuntu 24 introduced a preventive measure that prevents installation of
# system wide pip packages. Unfortunately no workarounds (apt-get install python3-ton-http-api; pipx install ton-http-api)
# seem to be working in this case so we'll just add --break-system-packages and hope for the best
RUN pip install --user --break-system-packages ton-http-api

# Download MyLocalTon
# 
# The TON jars are separated by architecture, currently there is the x86-64 one and the arm64 one
# but unfortunately the release URLs don't match the output from uname so we need to do a bit of plumbing
# 
# TODO We might need to use the testnet version (not sure whether the mainnet one allows us to fund accounts)
RUN <<-EOF
    case "$(uname -m)" in
        aarch64) TON_ARCH="arm64" ;;
        x86_64) TON_ARCH="x86-64" ;;
        *) exit 1 ;;
    esac

    curl -sLf https://github.com/neodix42/MyLocalTon/releases/download/v120/MyLocalTon-${TON_ARCH}.jar --output MyLocalTon.jar
EOF

# We want to keep the internals of the EVM node images encapsulated so we supply the healthcheckk as a part of the definition
HEALTHCHECK --start-period=30s --interval=5s --retries=30 CMD curl -sSf http://127.0.0.1:8081

# Run the shit
ENTRYPOINT ["java", "-jar", "MyLocalTon.jar", "nogui", "ton-http-api"]

#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#              Image that runs a local Solana node
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM machine AS node-solana-test-validator

ENV PATH="/root/.solana/bin:$PATH"

COPY --from=solana /root/.solana/bin/solana-test-validator /root/.solana/bin/solana-test-validator

# Make sure the binary is there
RUN solana-test-validator --version

# By default the test validator will expose the following ports:
# 
# Gossip:                       1024
# TPU:                          1027
# JSON RPC:                     8899
# WebSocket:                    8900
ENTRYPOINT ["solana-test-validator"]

#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#              Image that runs an Aptos node
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM $APTOS_NODE_IMAGE AS node-aptos

#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#                   Image that runs a Solana node
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM $SOLANA_NODE_IMAGE AS node-solana

#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#              Image that runs a TON node
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM $TON_NODE_IMAGE AS node-ton

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
