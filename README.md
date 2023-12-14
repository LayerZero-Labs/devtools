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
# To start the development mode for create-lz-oapp and its dependencies
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

You also combine the environment variables:

```bash
DOCKER_COMPOSE_RUN_TESTS_TURBO_ARGS=--filter=ua-utils-evm-hardhat-test DOCKER_COMPOSE_RUN_TESTS_ARGS=--build yarn test
```

#### Container logs

To monitor the container logs you'll need to run:

```bash
docker compose logs -f
```

This allows you to monitor logs coming from e.g. the `hardhat` nodes

#### Exposing test networks on `localhost`

It is possible to expose the test networks defined in `docker-compose.yaml` on your host machine. To do this, you can run:

```bash
yarn start
```

Once the networks are running, you can go to the `ua-utils-evm-hardhat-test` package:

```bash
cd packages/ua-utils-hardhat-test
```

Setup the default `EndpointV2` and `DefaultOApp`:

```bash
npx hardhat lz:test:oapp:deploy
```

And execute `hardhat` tasks as usual:

```bash
npx hardhat lz:oapp:getDefaultConfig
```

If you are developing tasks, it's useful to build the code when it changes. To do this, run the following from the project root:

```bash
yarn dev
```

To stop the network containers, just run:

```bash
yarn stop
```

**Don't forget that the state of the local networks disappears after they are stopped and any deployment files created in one session will be invalid in the next one.**

### Troubleshooting

#### Problems with committing

If facing issues when committing, make sure your `~/.huskyrc` file contains the following:

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

However, this utility has an issue with packages that are listed both at the workspace root and in the individual packages, e.g. `@layerzerolabs/prettier-config-next` - it errors out saying that a workspace package could not be found.

To work around this (since this version of yarn is outdated and a fix for this problem will not be provided), you can remove the entries from the root `package.json` before running the command, then add them back (just don't forget to update their versions).

#### Problems using the `dev` script

`turbo` might complain about concurrency issues when running `yarn dev`:

```diff
- error preparing engine: Invalid persistent task configuration:
- You have 18 persistent tasks but `turbo` is configured for concurrency of 10. Set --concurrency to at least 19
```

If you see this error, just follow turbo's lead and use:

```bash
yarn dev --concurrency 19
```

#### Problems with snapshots

We use jest snapshots in a lot of places throughout the codebase. When an intentional change to the codebase is made and snapshots need to be updated, there are several ways of doing so:

- Erase the original snapshot file and run the test. The snapshot will be recreated and the diff should only show your expected changes
- Run the tests from within the affected package with `-u` flag. This will update the snapshots.

For some packages the snapshot output depends on environment variables and other factors. For example the `io-utils` tests for printers have different output based on whether the active shell is`TTY` orwhether the `CI` environment variable is set and non-empty.

If you encounter errors when running these tests, just set the environment variable before running the test:

```bash
CI=1 yarn test
```
