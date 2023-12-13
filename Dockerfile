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

ENV YARN_CACHE_FOLDER=/tmp/yarn_cache

# We'll need a mock NPM_TOKEN to execute any yarn commands
ENV NPM_TOKEN=

# Update the system packages
RUN apt-get update
RUN apt-get install -y \
    # Get the envsubst command (see below)
    gettext-base \
    # Get the json utilities
    jq

#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#                Image with pruned source code
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM base as builder

WORKDIR /app

# We'll only use this turbo to prune the workspace, we don't care what version we use here
RUN yarn global add turbo

COPY . .

# We'll use turbo prune to remove the unneeded packages
# and separate the package.json / yarn.lock from the source code
# 
# This allows us to cache the yarn install step
# 
# See more here https://turbo.build/repo/docs/reference/command-line-reference/prune
# And here https://turbo.build/repo/docs/handbook/deploying-with-docker
# 
# There's an open issue on turbo github to support pruning
# without scope, in the meantime we'll use yarn workspaces info
# in combination with jq to get a full list of the workspace packages
# and prefix them with --scope
# 
# See https://github.com/vercel/turbo/issues/4074
RUN turbo prune $(yarn workspaces --silent info | jq -r 'keys | map("--scope " + .) | join(" ")') --docker

#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#            Image with all dependencies installed
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM base as dependencies

ARG NPM_TOKEN

WORKDIR /app

# In this step we'll only use the package.json / yarn.lock files generated by turbo prune
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/yarn.lock ./yarn.lock

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
    #  Mount yarn cache
    --mount=type=cache,target=/tmp/yarn_cache \
    # Substitute NPM_TOKEN in .npmrc
    NPM_TOKEN=$NPM_TOKEN envsubst < .npmrctemplate > .npmrc && \
    # Install dependencies (fail if we forgot to update the lockfile)
    yarn install --prefer-offline --frozen-lockfile --non-interactive && \
    # Remove .npmrc/.npmrctemplate immediately
    rm -rf .npmrc .npmrctemplate

#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#        Image that prepares the project for development
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM dependencies as development

ENV NPM_TOKEN=

WORKDIR /app

# For some reason we're missing tsconfig.json when using turbo prune
COPY tsconfig.json ./

# Now we grab the full source code from the builder step
COPY --from=builder /app/out/full/ .