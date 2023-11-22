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

### Troubleshooting

#### Problems with committing

If facing issues when commiting, make sure your `~/.huskyrc` file contains the following:

```bash
# This loads nvm.sh and sets the correct PATH before running hook
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```
