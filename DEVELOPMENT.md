<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<p align="center">
  <a href="https://layerzero.network" style="color: #a77dff">Homepage</a> | <a href="https://docs.layerzero.network/" style="color: #a77dff">Docs</a> | <a href="https://layerzero.network/developers" style="color: #a77dff">Developers</a>
</p>

<h1 align="center">Development</h1>

## Code layout

The code is arranged into:

- **Reusable packages** under `./packages` directory
- **Example projects** under `./examples` directory
- **Test projects & helpers** under `./tests` directory

## Development

```bash
# or nvm install if nvm use fails
nvm use

# If pnpm is not installed on your local machine, you can install it using corepack
corepack enable

# Install project dependencies
pnpm install

# Build the entire project
pnpm build

# Lints the entire project
pnpm lint

# Tests the entire project in a containerized environment
pnpm test:ci

# Runs the project in development mode
pnpm dev
```

This project is built using `turborepo`. The above commands are just aliases to `turbo` CLI and as such support all the `turbo` options:

```bash
# To start the development mode for create-lz-oapp and its dependencies
pnpm dev --filter=create-lz-oapp...
```

### Running tests

There are two options when it comes to running tests:

- [CI mode](#running-tests--ci-mode)
- [Local mode](#running-tests--local-mode)

#### CI mode <a id="running-tests--ci-mode"></a>

In the CI mode, the tests are ran inside a docker container based on the provided `Dockerfile`. You can run the tests in the CI mode by running:

```bash
pnpm test:ci
```

In the CI mode, the containers are rebuilt before every test run. [See below for how to refine the packages](#running-tests--refining-tested-packages) for which the tests will be run. [See below for how to adjust the `docker run` command behavior](#running-tests--adjusting-docker-commands).

In the CI mode the environment sets up two `hardhat` nodes only accessible from within the environment:

- `http://network-britney:8545`
- `http://network-vengaboys:8545`

Their URLs are exposed to the containers under `NETWORK_URL_BRITNEY` and `NETWORK_URL_VENGABOYS` environment variables. The accounts on these networks are funded based on the `MNEMONIC` environment variable that's also exposed to the containers.

#### Local mode <a id="running-tests--local-mode"></a>

In the local mode, the tests are executed on the developer machine. You can run the tests in the local mode by running:

```bash
pnpm test:local
```

In the local mode the environment sets up two `hardhat` nodes accessible from the host machine:

- `http://localhost:10001`
- `http://localhost:10002`

The accounts on these networks are funded based on the `MNEMONIC` environment variable that is set based on the `.env` file.

#### Refining tested packages <a id="running-tests--refining-tested-packages"></a>

To only run a specific test suite, you can define `DOCKER_COMPOSE_RUN_TESTS_TURBO_ARGS` environment variable before running the tests. This variable will be passed to the underlying `turbo` command and can contain any arguments that this command understands, for example:

```bash
# To only run tests for @layerzerolabs/ua-devtools-evm-hardhat-test package
DOCKER_COMPOSE_RUN_TESTS_TURBO_ARGS=--filter=ua-devtools-evm-hardhat-test pnpm test:ci
```

#### Adjusting docker commands <a id="running-tests--adjusting-docker-commands"></a>

The test commands use `docker compose up` and `docker compose run` commands to setup necessary services. If you need to change the behavior of these commands by passing some CLI arguments, you can do so using the `DOCKER_COMPOSE_ARGS` environment variable.

`docker compose` will by default reuse images for containers it has already built. If by any chance you are seeing code changes not being reflected in your local mode test runs, you can force docker to rebuild the images by defining `DOCKER_COMPOSE_ARGS` environment variable. This variable will be passed to the underlying `docker compose run` command and can contain any arguments that this command understands, for example:

```bash
DOCKER_COMPOSE_ARGS=--build pnpm test:local
```

You also combine the environment variables:

```bash
DOCKER_COMPOSE_RUN_TESTS_TURBO_ARGS=--filter=ua-devtools-evm-hardhat-test DOCKER_COMPOSE_ARGS=--build pnpm test:local
```

You can also pass additional arguments to the individual `test` scripts this way. For example, if you're only interested in tests that match the pattern `wire.test` in `ua-devtools-evm-hardhat-test` package, you can run:

```bash
DOCKER_COMPOSE_RUN_TESTS_TURBO_ARGS="--filter=ua-devtools-evm-hardhat-test -- wire.test" pnpm test:ci
```

#### Container logs

To monitor the container logs you'll need to run:

```bash
pnpm logs
```

This allows you to monitor logs coming from e.g. the `hardhat` nodes

#### Exposing test networks on `localhost`

It is possible to expose the test networks defined in `docker-compose.yaml` on your host machine. To do this, you can run:

```bash
pnpm start
```

Once the networks are running, you can go to the `ua-devtools-evm-hardhat-test` package:

```bash
cd packages/ua-devtools-hardhat-test
```

Setup the default `EndpointV2` and `DefaultOApp`:

```bash
pnpm hardhat lz:test:oapp:deploy
```

And execute `hardhat` tasks as usual:

```bash
pnpm hardhat lz:oapp:config:get:default
```

If you are developing tasks, it's useful to build the code when it changes. To do this, run the following from the project root:

```bash
pnpm dev
```

To stop the network containers, just run:

```bash
pnpm stop
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

#### Problems using the `dev` script

`turbo` might complain about concurrency issues when running `pnpm dev`:

```diff
- error preparing engine: Invalid persistent task configuration:
- You have 18 persistent tasks but `turbo` is configured for concurrency of 10. Set --concurrency to at least 19
```

If you see this error, just follow turbo's lead and use:

```bash
pnpm dev --concurrency 19
```

#### Problems with snapshots

We use jest snapshots in a lot of places throughout the codebase. When an intentional change to the codebase is made and snapshots need to be updated, there are several ways of doing so:

- Erase the original snapshot file and run the test. The snapshot will be recreated and the diff should only show your expected changes
- Run the tests from within the affected package with `-u` flag. This will update the snapshots.

For some packages the snapshot output depends on environment variables and other factors. For example the `io-devtools` tests for printers have different output based on whether the active shell is`TTY` orwhether the `CI` environment variable is set and non-empty.

If you encounter errors when running these tests, just set the environment variable before running the test:

```bash
CI=1 pnpm test
```
