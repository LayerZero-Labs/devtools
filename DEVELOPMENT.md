<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<p align="center">
  <a href="https://layerzero.network" style="color: #a77dff">Homepage</a> | <a href="https://docs.layerzero.network/" style="color: #a77dff">Docs</a> | <a href="https://layerzero.network/developers" style="color: #a77dff">Developers</a>
</p>

<h1 align="center">Development</h1>

<p align="center">
  <a href="#troubleshooting" style="color: #a77dff">Troubleshooting</a>
</p>

## Code layout

The code is arranged into:

- **Reusable packages** under `./packages` directory
- **Example projects** under `./examples` directory
- **Test projects & helpers** under `./tests` directory

## Development

### Getting the source code

This repository contains several git submodules. To clone the repository, please follow these steps:

```bash
# 1. Clone the repository

# Using HTTPS
git clone --recurse-submodules https://github.com/LayerZero-Labs/devtools.git

# Using SSH
git clone --recurse-submodules git@github.com:LayerZero-Labs/devtools.git

# 1A. Install submodules

# If you cloned the repository without the --recurse-submodules flag, you can install the required submodules by running
git submodule update --init
```

### Setting up the environment

This repository uses `pnpm` as its package manager and has a requirement on the minimum `node` version used. If using `nvm`, please run the following to setup the environment:

```bash
# or nvm install if nvm use fails
nvm use

# If pnpm is not installed on your local machine, you can install it using corepack
corepack enable

# Install project dependencies
pnpm install
```

### Making changes

```bash
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

### Running unit & integration tests

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

#### Updating snapshots

By default, `jest` will run in [CI mode](https://jestjs.io/docs/cli#--ci). This means that no new snapshots will be generated by default and `jest` will fail instead. This is important since we want to make sure that there are no missing snapshots when we merge to `main` branch.

To update the snapshots, you will need to run the tests in local mode (so that the new snapshots are written to your filesystem) and pass the [`--updateSnapshot`](https://jestjs.io/docs/cli#--updatesnapshot) CLI flag to `jest`:

```bash
CI=1 DOCKER_COMPOSE_RUN_TESTS_TURBO_ARGS="--filter=\!./examples/* -- --updateSnapshot" pnpm test:local
```

If you encounter any errors coming from existing snapshots that have to do with output formatting (i.e. difference in colored/uncolored output), see the [troubleshooting section below](#troubleshooting--snapshots)

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
cd tests/ua-devtools-evm-hardhat-test
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

### Running E2E (user) tests

E2E tests simulate user environment by publishing packages to a local NPM registry. They focus on ensuring that the examples we provide in this repository will work on user machines without interference of things such as:

- Presence of code that is not published to NPM
- Presence of NPM modules that are not included in package ependencies

The user testing suite can be run as follows:

```bash
pnpm test:user
```

This will spin up a local NPM registry (available on [localhost:4873](http://localhost:4873) for debugging purposes), publish all packages locally and run the test suite.

The tests themselves are written using [BATS - _Bash Automated Testing System_](https://github.com/bats-core/bats-core) ([Tutorial & more docs here](https://bats-core.readthedocs.io/en/stable/)) in combination with standard assertions from [`bats-assert`](https://github.com/bats-core/bats-assert).

The test suites can be found under `./tests-user/tests` directory.

#### Using local NPM registry

The local NPM registry can also be used to simulate arbitrary user flows without needing to link or publish packages to NPM. To do this, follow these steps:

```bash
# 1. Start the local registry and publish local packages
pnpm registry:publish

# 1B. Monitor the progress of publishing
pnpm registry:logs

# 2. Set your NPM registry to http://localhost:4873
pnpm config set registry http://localhost:4873/

# 3. Verify that the registry has been set
pnpm config get registry

# 4. Install the local packages in your project
pnpm i

# 4B. Package managers such as pnpm can cache dependencies
#     so you might need to clear the module cache
pnpm store prune
```

After this, your project is ready to use the local packages.

Once done, the registry can be stopped by running:

```bash
pnpm registry:stop
```

Don't forget to reset the `registry` NPM configuration once done:

```bash
pnpm config set registry https://registry.npmjs.org/
```


#### Using `pnpm link` or `file://`

If you only need to test a small number of packages, it might be simpler to use either `pnpm link` or `file://`

##### `pnpm link`

In the package that needs to be tested, run:

```bash
pnpm link -w
```

In the npm project that needs to consume the above package, run:

```bash
# PACKAGE_NAME should be the name in the package.json of the package being consumed
pnpm link <PACKAGE_NAME>
```

##### `file://`

This is more suitable for testing in throway repos such as those generated by `npx create-lz-oapp` since it modifies the `package.json` entry.

In the `package.json`, modify the dependency entry to use `file://`, such as:

```json
"@layerzerolabs/devtools-solana": "file://../../lz-org/devtools/packages/devtools-solana/",
```

Then, run:

```bash
pnpm i
```

:information_source: You might need to remove your existing `pnpm-lock.yaml` and `node_modules` before running `pnpm i`

### Troubleshooting <a id="troubleshooting"></a>

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

#### Problems with snapshots <a id="troubleshooting--snapshots"></a>

We use jest snapshots in a lot of places throughout the codebase. When an intentional change to the codebase is made and snapshots need to be updated, there are several ways of doing so:

- Erase the original snapshot file and run the test. The snapshot will be recreated and the diff should only show your expected changes
- Run the tests from within the affected package with `--updateSnapshot` flag. This will update the snapshots.

For some packages the snapshot output depends on environment variables and other factors. For example the `io-devtools` tests for printers have different output based on whether the active shell is`TTY` orwhether the `CI` environment variable is set and non-empty.

If you encounter errors when running these tests, just set the environment variable before running the test:

```bash
CI=1 pnpm test
```

### Problems compiling with `forge`

If running into issues when compiling or running tests using `forge`, make sure you're on a version newer than `01-05-2023`.

To check your version, run:

```bash
forge --version
```

To update to the newest version using `foundryup`:

```bash
foundryup
```

### Problems with failing deployments in `pnpm test:local`

If running into issues with failing deployment transactions when running the test in the local mode, make sure to clean all the `deployments` directories that you might have left over from running any arbitrary tasks using `hardhat`:

```bash
pnpm clean
```

### Problems with missing environment variables

If running into issues with missing environment variables when running any of the commands that rely on `turbo` (e.g. `build` or `test`), make sure that these are either:

- Specified as environment variables that have an effect on build output - [env](https://turbo.build/repo/docs/reference/configuration#env) in `turbo.json`
- Specified as _global_ environment variables that have an effect on build output - [globalEnv](https://turbo.build/repo/docs/reference/configuration#globalenv)
- Specified as environment variables that don't have an effect on build output - [passThroughEnv](https://turbo.build/repo/docs/reference/configuration#passthroughenv)
- Specified as _global_ environment variables that don't have an effect on build output - [globalPassThroughEnv](https://turbo.build/repo/docs/reference/configuration#globalpassthroughenv)
