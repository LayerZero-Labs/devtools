#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#           Base node image with project dependencies
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM node:18.16.0 as dependencies

ARG NPM_TOKEN
ENV YARN_CACHE_FOLDER=/tmp/yarn_cache

# Update the system packages
RUN apt-get update
RUN apt-get install -y \
    # Get the envsubst command (see below)
    gettext-base

WORKDIR /app

# Get the source code
# 
# Oh god why yarn, paleolithic technology
# 
# This would normally only copy package.json and/or lockfile
# and install the dependencies from lockfile in order not to break the cache
# everytime a file changes
COPY . .

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
    # Remove .npmrc immediately
    rm -rf .npmrc

#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
#
#               Image that builds the project
#
#   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
#  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
# `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
FROM dependencies as build

# Let's now add some fancy shit to compensate for the yarn fail above
# 
# Turborepo allows us to be specific about the scope of the scripts
# using the --filter flag - see more here https://turbo.build/repo/docs/core-concepts/monorepos/filtering
ARG FILTER

WORKDIR /app

# Since our FILTER arg can be empty, we only want to pass the --filter
# flag to turborepo if FILTER is actually used
# 
# This is nicely accomplished by the + alternate value substitution
# and results in something like --filter=my-filter
RUN yarn build ${FILTER:+--filter=$FILTER}