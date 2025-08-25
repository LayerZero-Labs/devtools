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
# to provide a transition period during which the local flow remains unchanged 
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

# We will provide a way for consumers to override the default Initia node image
# 
# This will allow CI environments to supply the prebuilt Initia node image
# while not breaking the flow for local development
ARG INITIA_NODE_IMAGE=node-initia-localnet

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

ARG TARGETARCH
RUN echo "Building for $TARGETARCH"

# Update package lists
RUN apt update

# Update the system packages and fix missing dependencies
RUN apt-get update --fix-missing

# Add required packages
RUN apt-get install --yes \
    # expect is a utility that can be used to test CLI scripts
    # 
    # See a tutorial here https://www.baeldung.com/linux/bash-interactive-prompts
    expect \
    # Parallel is a utility we use to parallelize the BATS (user) tests
    parallel \
    # Utilities required to build solana - and cmake is required for building platform tools used by solana
    pkg-config libudev-dev llvm libclang-dev protobuf-compiler cmake \
    # Utilities required to build aptos CLI
    libssl-dev libdw-dev lld \
    # Required for TON to run
    libatomic1 libssl-dev \
    # Required to build the base image
    build-essential \
    # speed up llvm builds
    ninja-build


### Setup rust
# Install rust and set the default toolchain to 1.75.0
ARG RUST_TOOLCHAIN_VERSION=1.75.0
ENV RUSTUP_VERSION=${RUST_TOOLCHAIN_VERSION}
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain ${RUST_TOOLCHAIN_VERSION}
RUN rustc --version

### Setup go
ARG GO_VERSION=1.24.0
RUN curl -sL https://go.dev/dl/go${GO_VERSION}.linux-${TARGETARCH}.tar.gz | tar -C /usr/local -xzf -
ENV PATH="/usr/local/go/bin:$PATH"
# Configure go pathing
RUN mkdir -p /root/go/{bin,src,pkg}
ENV GOPATH=/root/go
ENV PATH=$PATH:$GOPATH/bin
RUN go version

# Install Aptos CLI Version Manager
RUN git clone https://github.com/LayerZero-Labs/aptosup
# RUN chmod +x ./aptosup/install
# RUN ./aptosup/install
RUN mkdir -p /root/.aptosup
RUN cp -R ./aptosup/aptosup /root/.aptosup/
RUN chmod +x /root/.aptosup/aptosup
RUN rm -rf ./aptosup
ENV PATH="/root/.aptosup:$PATH"

# RUN sed -i '/# Check if running with sudo/,+5d' /root/.aptosup/aptosup

RUN aptosup -l

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

ARG APTOS_VERSION=6.0.1
# Installing Aptos CLI for Aptos
RUN echo 'y' | aptosup -d ${APTOS_VERSION}
RUN aptos --version

#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#          Image that builds Movement developer tooling
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM machine AS movement

ARG APTOS_VERSION=3.5.0
# Installing Aptos CLI for Movement
RUN echo 'y' | aptosup -d ${APTOS_VERSION}
RUN aptos --version
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#          Image that builds Initia developer tooling
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM machine AS initia

WORKDIR /app/initia

ARG INITIA_VERSION=0.7.2


RUN git clone https://github.com/initia-labs/initia.git --branch v${INITIA_VERSION}
WORKDIR /app/initia/initia

# Now we run into a problem and that is the binaries are installed in /root/go/bin/initiad
# This also installs a bunch of shared libraries in /root/go/pkg/mod/*
# We can't just copy /root/go/bin/* in the base image because we _may_ have other go modules which _can_ overlap
RUN \
    # Set go pathing
    export GOPATH=/root/go && \
    export PATH=$GOPATH/bin:$PATH && \
    # Get version info
    git fetch --tags && \
    # Install initiad into /root/.initia/bin
    make install

RUN mkdir -p /root/.initia/bin
RUN mkdir -p /root/.initia/lib
RUN ls -la /root/.initia/

# We need to copy the iniitad binary to the bin directory
RUN cp /root/go/bin/initiad /root/.initia/bin
# We now need to copy the shared libraries from the go module cache
RUN cp /root/go/pkg/mod/github.com/initia-labs/movevm@*/api/lib*.so /root/.initia/lib

ENV PATH="/root/.initia/bin:$PATH"

# Adding in the library path to ldconfig and updating the cache
RUN echo "/root/.initia/lib" > /etc/ld.so.conf.d/initia.conf && ldconfig

RUN initiad version --long

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

ENV RUST_TOOLCHAIN_VERSION_ANCHOR=nightly-2025-05-01
RUN rustup default ${RUST_TOOLCHAIN_VERSION_ANCHOR}
ARG ANCHOR_VERSION=0.31.1

# Configure cargo. We want to provide a way of limiting cargo resources
# on the github runner since it is not large enough to support multiple cargo builds
ARG CARGO_BUILD_JOBS=default
ENV CARGO_BUILD_JOBS=$CARGO_BUILD_JOBS

RUN cargo +${RUST_TOOLCHAIN_VERSION_ANCHOR} install --git https://github.com/solana-foundation/anchor avm

# Install AVM - Anchor version manager for Solana
RUN rm -f /root/.cargo/bin/anchor /root/.avm/bin/anchor* || true
# --from-source to get around glibc 2.38 not available in the machine image
RUN avm install ${ANCHOR_VERSION} --from-source --force
RUN avm use ${ANCHOR_VERSION}

ENV PATH="/root/.avm/bin:$PATH"
RUN avm --version
RUN anchor --version

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

ENV RUST_TOOLCHAIN_VERSION_SOLANA=nightly-2025-05-01
ARG SOLANA_VERSION=2.2.20
ARG PLATFORM_TOOLS_VERSION=1.48

RUN rustup default ${RUST_TOOLCHAIN_VERSION_SOLANA}

# Configure cargo. We want to provide a way of limiting cargo resources
# on the github runner since it is not large enough to support multiple cargo builds
ARG CARGO_BUILD_JOBS=default
ENV CARGO_BUILD_JOBS=$CARGO_BUILD_JOBS

RUN BUILD_FROM_SOURCE=true; \
    # Install Solana using a binary with a fallback to installing from source. 
    # List of machines that have prebuilt binaries:
    # - amd64/linux - last checked on Feb 11, 2025
    if [ "$(dpkg --print-architecture)" = "amd64" ]; then \
        curl --proto '=https' --tlsv1.2 -sSf https://release.anza.xyz/v${SOLANA_VERSION}/install | sh -s && \
        BUILD_FROM_SOURCE=false; \
    fi && \
    # If we need to build from source, we'll do it here
    # List of machines that need to be built from source:
    # - arm64/linux - last checked on Feb 11, 2025
    if [ "$BUILD_FROM_SOURCE" = "true" ]; then \
            git clone https://github.com/anza-xyz/agave.git --depth 1 --branch v${SOLANA_VERSION} ~/solana-v${SOLANA_VERSION} && \
            # Produces the same directory structure as the prebuilt binaries
            # Make the active release point to the new release
            bash ~/solana-v${SOLANA_VERSION}/scripts/cargo-install-all.sh ~/.local/share/solana/install/releases/${SOLANA_VERSION} && \
            ln --symbolic ~/.local/share/solana/install/releases/${SOLANA_VERSION} ~/.local/share/solana/install/active_release && \
            # Clean up the source code
            rm -rf ~/solana-v${SOLANA_VERSION}; \
        fi


RUN mkdir -p /root/.cache/solana/v${PLATFORM_TOOLS_VERSION}/platform-tools && \
    BUILD_FROM_SOURCE=true; \
    # If we are NOT building from source, we can simply grab the prebuilt binaries
    if [ "$(dpkg --print-architecture)" = "amd64" ]; then \
        # Platform tools v1.41 has prebuilt binaries for amd64/linux - we extract and move it to the cache directory
        curl -sL https://github.com/anza-xyz/platform-tools/releases/download/v1.41/platform-tools-linux-x86_64.tar.bz2 | tar -xj && \
        mv llvm/ rust/ version.md /root/.cache/solana/v${PLATFORM_TOOLS_VERSION}/platform-tools/; \
        BUILD_FROM_SOURCE=false; \
    fi && \
    # List of machines that need to be built from source:
    # - arm64/linux - last checked on Feb 10, 2025
    if [ "$BUILD_FROM_SOURCE" = "true" ]; then \
            # Grab platform tools's source code at the version tagged in PLATFORM_TOOLS_VERSION
            curl -sL https://github.com/anza-xyz/platform-tools/archive/refs/tags/v${PLATFORM_TOOLS_VERSION}.tar.gz | tar -xz && \
            cd platform-tools-${PLATFORM_TOOLS_VERSION} && \
            # Optimizing (and transforming) the build.sh script
            # Only cloning the latest commit across the several git clones
            sed -i '/^git clone/ s/$/ --depth 1/' build.sh && \
            # Comment out the line that contains *llvm/lib/python (it is line 120) in build.sh to prevent the build from failing due to missing llvm python - not required for solana
            sed -i '/llvm\/lib\/python/ s/^/#/' build.sh && \
            # Now that we're done with the modifications, we can build the binaries into the folder "target"
            ./build.sh target && \
            # Extract the binaries to the cache directory
            tar -xf platform-tools-linux-aarch64.tar.bz2 && \
            mv llvm/ rust/ version.md /root/.cache/solana/v${PLATFORM_TOOLS_VERSION}/platform-tools/ && \
            # Clean up the source code
            cd ../ && rm -rf platform-tools-${PLATFORM_TOOLS_VERSION}; \
        fi

# Copy the active release directory into /root/.solana and make it available in the PATH
RUN mkdir -p /root/.solana
RUN cp -LR /root/.local/share/solana/install/active_release/bin /root/.solana/bin

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

ENV TON_VERSION=2024.12-1

RUN apt-get install -y \
    curl \
    unzip

RUN <<-EOF
    case "$(uname -m)" in
        aarch64) TON_ARCH="arm64" ;;
        x86_64) TON_ARCH="x86_64" ;;
        *) exit 1 ;;
    esac

    curl -sSLf https://github.com/ton-blockchain/ton/releases/download/v${TON_VERSION}/ton-linux-${TON_ARCH}.zip > ton.zip
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

WORKDIR /app/evm

ENV RUST_TOOLCHAIN_VERSION_ANCHOR=1.83.0
RUN rustup default ${RUST_TOOLCHAIN_VERSION_ANCHOR}

# Install SVM, Solidity version manager
ARG SOLC_VERSION=0.8.22
ARG SVM_RS_VERSION=0.5.4

ARG CARGO_BUILD_JOBS=default
ENV CARGO_BUILD_JOBS=$CARGO_BUILD_JOBS

# Install foundry - this needs rust >= 1.81.0
ENV PATH="/root/.foundry/bin:$PATH"
RUN curl -L https://foundry.paradigm.xyz | bash
RUN foundryup

RUN cargo +${RUST_TOOLCHAIN_VERSION_ANCHOR} install svm-rs@${SVM_RS_VERSION}

# Install solc 0.8.22
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
ENV INITIA_PATH="/root/.initia/bin"
ENV PATH="/root/.aptos/bin:/root/.avm/bin:/root/.foundry/bin:/root/.solana/bin:$TON_PATH:$INITIA_PATH:$PATH"


### Get movement network clis
# 1. Get aptos CLI
COPY --from=aptos /root/.aptosup /root/.aptosup-aptos
# Get aptos CLI for movement
COPY --from=movement /root/.aptosup /root/.aptosup-movement
# Merge the directories
RUN mkdir -p /root/.aptosup && \
    cp -R /root/.aptosup-aptos/* /root/.aptosup/ && \
    cp -R /root/.aptosup-movement/* /root/.aptosup/ && \
    rm -rf /root/.aptosup-aptos /root/.aptosup-movement

# 2. Get initia CLI
COPY --from=initia /root/.initia/bin /root/.initia/bin
COPY --from=initia /root/.initia/lib /root/.initia/lib
# Adding in the library path to ldconfig and updating the cache
RUN echo "/root/.initia/lib" > /etc/ld.so.conf.d/initia.conf && ldconfig

# Get solana tooling
# COPY --from=avm /root/.cargo/bin/anchor /root/.cargo/bin/anchor
COPY --from=avm /root/.cargo/bin/avm /root/.cargo/bin/avm
COPY --from=avm /root/.avm /root/.avm

# Copy solana cache (for platform-tools) and binaries
COPY --from=solana /root/.cache/solana /root/.cache/solana
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
RUN initiad version
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

ENV PATH="/root/.aptosup:$PATH"

# Get aptos CLI
COPY --from=aptos /root/.aptosup /root/.aptosup

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
#              Image that builds an Initia node
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM machine AS node-initia-localnet

# This is massively built off: <https://github.com/LayerZero-Labs/monorepo/tree/main/docker/devcon/initia>
# https://docs.cosmos.network/v0.50/user/run-node/run-node
# https://docs.initia.xyz/run-initia-node/boot-an-initia-node


ENV PATH="/root/.initia/bin:$PATH"

COPY --from=initia /root/.initia/bin /root/.initia/bin
COPY --from=initia /root/.initia/lib /root/.initia/lib

# Adding in the library path to ldconfig and updating the cache
RUN echo "/root/.initia/lib" > /etc/ld.so.conf.d/initia.conf && ldconfig

HEALTHCHECK --interval=2s --retries=20 CMD curl -f http://0.0.0.0:26657/status || exit 1

# Initialize node with custom username 'lz'
RUN initiad init lz --chain-id lz-test-chain

# Create key file and add validator
# Using xarg wizardry to add the validator to the genesis file by substituting the address generated by the keys command
RUN echo "test test test test test test test test test test test junk" > key.txt && \
    initiad keys add lz-validator --keyring-backend test --recover < key.txt && \
    initiad keys show lz-validator -a --keyring-backend test | \
    xargs -I {} initiad genesis add-genesis-account {} 1000000000000uinit

# Create gentx and ensure directory exists
RUN mkdir -p /root/.initia/config && \
    initiad genesis gentx lz-validator 100000000uinit --chain-id lz-test-chain --keyring-backend test && \
    initiad genesis collect-gentxs

# Set the entrypoint to start the node
ENTRYPOINT ["initiad", "start"]

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
#              Image that builds a MyLocalTON TON node
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM ubuntu:24.04 AS node-ton-my-local-ton
# We need to be on Ubuntu 24.04 to install gcc-13 and gcc-13-aarch64-linux-gnu without adding a PPA

ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Update system packages
RUN apt-get update

RUN apt-get install -y \
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
#              Image that runs an Initia node
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM $INITIA_NODE_IMAGE AS node-initia


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
