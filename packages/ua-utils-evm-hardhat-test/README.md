<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">@layerzerolabs/utils-evm-hardhat-test</h1>

## Development

This package provides integration tests for `@layerzerolabs/utils-evm-hardhat` executed within a containerized setup. To run the test suite, simply run:

```bash
# You can use the alias command from this package directory
yarn test

# Or use turbo and run from project root
yarn test --filter=utils-evm-hardhat-test

# Or just use the actual test command from this package directory
docker compose run --rm tests
```

In case you're running the tests from the project root, it might sometimes be useful to rebuild the containers
(for example when adding/removing dependencies) and as a lazy developer, you might not be happy about `cd`ing to the package directory
and run the command from there. For that usecase the `$DOCKER_COMPOSE_RUN_TESTS_ARGS` environment variable has been added:

```bash
# To rebuild the containers before running tests from the project root
DOCKER_COMPOSE_RUN_TESTS_ARGS=--build yarn test --filter=utils-evm-hardhat-test
```
