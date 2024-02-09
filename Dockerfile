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

#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#          Base node image with just the build tools
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM node:$NODE_VERSION as base

# We'll add an empty NPM_TOKEN to suppress any warnings
ENV NPM_TOKEN=
ENV PATH "/root/.foundry/bin:$PATH"

# Update the system packages
RUN apt-get update

# Add required packages
RUN apt-get install --yes \
    # expect is a utility that can be used to test CLI scripts
    # 
    # See a tutorial here https://www.baeldung.com/linux/bash-interactive-prompts
    expect

# Install foundry
RUN curl -L https://foundry.paradigm.xyz | bash
RUN foundryup

# Enable corepack, new node package manager manager
# 
# See more here https://nodejs.org/api/corepack.html
RUN corepack enable

# Output versions
RUN node -v
RUN pnpm -v
RUN git --version
RUN forge --version
RUN anvil --version
RUN chisel --version
RUN cast --version


#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#        Image that prepares the project for development
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM base as development

ENV NPM_CONFIG_STORE_DIR=/pnpm
ENV NPM_CONFIG_PACKAGE_IMPORT_METHOD=copy

WORKDIR /app

COPY pnpm-*.yaml .npmrc ./

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