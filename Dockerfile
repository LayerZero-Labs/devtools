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

# We'll need a mock NPM_TOKEN to execute any pnpm commands
ENV NPM_TOKEN=
ENV PATH "/root/.foundry/bin:$PATH"

# Update the system packages
RUN apt-get update
RUN apt-get install -y \
    # Get the envsubst command (see below)
    gettext-base \
    # Get the json utilities
    jq

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

ARG NPM_TOKEN

ENV NPM_CONFIG_STORE_DIR=/pnpm
ENV NPM_CONFIG_PACKAGE_IMPORT_METHOD=copy

WORKDIR /app

COPY pnpm-*.yaml ./

# Get the .npmrc under a different name since envsubst will not work in place
# due to how pipes work on linux
# 
# envsubst is a neat little thing that can substitute environment variables in a string
# and we can use it to keep NPM_TOKEN secret
# 
# What we do is :
# 
# - We pass the NPM_TOKEN as ARG
# - Set it as ENV variable only for the envsubst command so that it does not hang in the environment
# - Replace the environment variables in .npmrctemplate
# - Pipe the result to .npmrc
# 
# We cannot do it in place (i.e. envsubst < .npmrc > .npmrc) because how linux works
# (it will create the output .npmrc file first, the pipe to it - but since it is now empty nothing will be piped)
COPY .npmrc .npmrctemplate

RUN \
    #  Mount pnpm store
    --mount=type=cache,id=pnpm-store,target=/pnpm \
    # Substitute NPM_TOKEN in .npmrc
    NPM_TOKEN=$NPM_TOKEN envsubst < .npmrctemplate > .npmrc && \
    # Fetch dependencies to the pnpm store based on the lockfile
    # 
    # We will also skip the package scripts since in this operation the NPM_TOKEN is available
    pnpm fetch --prefer-offline --ignore-scripts --frozen-lockfile && \
    # Remove .npmrc/.npmrctemplate immediately
    rm -rf .npmrc .npmrctemplate

COPY . .

RUN \
    #  Mount pnpm store
    --mount=type=cache,id=pnpm-store,target=/pnpm \
    # Install dependencies (fail if we forgot to update the lockfile)
    pnpm install --recursive --offline --frozen-lockfile

# Rebuild native bindings (since the scripts were not executed above, we need to execute them now)
RUN pnpm rebuild --recursive 