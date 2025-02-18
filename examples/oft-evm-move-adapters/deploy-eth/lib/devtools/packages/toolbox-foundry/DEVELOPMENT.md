<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">Development</h1>

## Building

This package requires `make` CLI utility to be available. Make sure that `make` is available by running:

```bash
make --help
```

On MacOS, `make` is installed as a aprt of the XCode developer tools. On unix operating systems, `make` can be installed by adding the `build-essential` package:

```bash
# On Debian
apt-get install build-essential

# On Apline
apk add --no-cache make
```

## Adding libraries

To install a new library to be included with this package, please follow these steps:

```bash
# In your terminal, navigate to the root of the devtools repository

# Add a git submodule
#
# These two examples show the commands for the two existing libraries, forge-std and ds-test
git submodule add --name "toolbox-foundry/ds-test" --force https://github.com/dapphub/ds-test packages/toolbox-foundry/lib/ds-test
git submodule add --name "toolbox-foundry/forge-std" --force https://github.com/foundry-rs/forge-std packages/toolbox-foundry/lib/forge-std
```

Alternatively use the `forge install` command but since it is not playing nice with the monorepo structure, you might end up with a broken submodule state.

After adding a submodule, the pre-commit hooks setup using `husky` and `lint-staged` tend to error out on not being able to lint the submodule even though the `lib` directory has been ignored in both ESLint and Prettier. This is a known and low-priority bug, for now please just make a commit containing only the change to `.gitmodules` using `--no-verify` flag:

```bash
git commit -m "chore: Adding XXX library" --no-verify
```
