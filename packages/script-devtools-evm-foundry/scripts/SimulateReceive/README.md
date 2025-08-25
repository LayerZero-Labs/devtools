## Usage

```shell
pnpm i
forge build
```

1. Find the source transaction hash of the message that has failed on [LayerZero Scan](https://layerzeroscan.com)
2. Populate the [.env](.env.example) file with the following:
   - `SOURCE_CHAIN_TX_HASH=<your_source_tx_hash>`
   - `MAINNET=true` or `MAINNET=false` (for the scan API)
   - `DESTINATION_CHAIN_RPC_URL=<your_rpc_url>` 
   - `CAST_ACCOUNT=<your_cast_account>` (use `cast wallet import -i <ACCOUNT_NAME>` to import a private key into cast)
     - You can optionally use the RPC URL shortcuts in [foundry.toml](foundry.toml), for example `bnb`
3. Run `make simulate` to simulate the workflow, this assumes you have an account in [cast](https://getfoundry.sh/cast/overview), alternatively you can edit the [Makefile](Makefile) to use `--private-key <PRIVATE_KEY>` instead. Run `make broadcast` to broadcast the transaction.

If you get an error from SimulateReceive script eg. `script failed: custom error 7182306f` you can do:

```shell
cast 4byte 7182306f
```

Example result:
```solidity
LZ_PayloadHashNotFound(bytes32,bytes32)
```
