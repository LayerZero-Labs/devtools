<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">LayerZero Contract Utilities</h1>

## Development

```bash
# or nvm install if nvm use fails
nvm use

yarn

# Build the entire project
yarn build

# Lints the entire project
yarn lint

# Tests the entire project
yarn test

# Runs the project in development mode
yarn dev
```

This project is built using `turborepo`. The above commands are just aliases to `turbo` CLI and as such support all the `turbo` options:

```bash
# To start the development mode for create-lz-oapp and its depenendencies
yarn dev --filter=create-lz-oapp...
```

### Running tests

The tests are by default executed in a containerized environment that sets up two `hardhat` nodes accessible from within the environment:

- `http://network-britney:8545`
- `http://network-vengaboys:8545`

You can run the whole test suite within this environment by running:

```bash
yarn test
```

#### Refining tested packages

To only run a specific test suite, you can define `DOCKER_COMPOSE_RUN_TESTS_TURBO_ARGS` environment variable before running the tests. This variable will be passed to the underlying `turbo` command and can contain any arguments that this command understands, for example:

```bash
# To only run tests for @layerzerolabs/ua-utils-evm-hardhat-test package
DOCKER_COMPOSE_RUN_TESTS_TURBO_ARGS=--filter=ua-utils-evm-hardhat-test yarn test
```

#### Rebuilding containers

`docker compose` will by default reuse images for containers it has already built. If by any chance you are seeing code changes not being reflected in your test runs, you can force docker to rebuild the images by defining `DOCKER_COMPOSE_RUN_TESTS_ARGS` environment variable. This variable will be passed to the underlying `docker compose run` command and can contain any arguments that this command understands, for example:

```bash
DOCKER_COMPOSE_RUN_TESTS_ARGS=--build yarn test
```

#### Container logs

To monitor the container logs you'll need to run:

```bash
docker compose logs -f
```

This allows you to monitor logs coming from e.g. the `hardhat` nodes

### Troubleshooting

#### Problems with committing

If facing issues when commiting, make sure your `~/.huskyrc` file contains the following:

```bash
# This loads nvm.sh and sets the correct PATH before running hook
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

#### Problems with package updating

To update external `@layerzerolabs` packages, you can use the builtin `yarn` utility:

```bash
yarn upgrade-interactive --scope @layerzerolabs --latest
```

However, this utility has an issue with packages that are listed both at the workspace root and in the individual packages, e.g. `@layerzerolabs/prettier-config-next` - it errors out saying that a a workspace package could not be found.

To work around this (since this version of yarn is outdated and a fix for this problem will not be provided), you can remove the entries from the root `package.json` before running the command, then add them back (just don't forget to update their versions).
