# SimulateReceive

## Usage

```shell
yarn
forge build
```

1. Find the source transaction hash of the message that has failed on [LayerZero Scan](https://layerzeroscan.com)
2. Paste the transaction hash into `string memory txHash = "0x0c61c4db115f57b2fba78df78879f9e8230e67d75e78ac2782a3b4c929b5d12f";` in [script/SimulateReceive.s.sol](./script/SimulateReceive.s.sol) and set the mainnet boolean to `true` or `false` (for the scan API)
4. Run: `forge script script/SimulateReceive.s.sol --rpc-url YOUR_DESTINATION_CHAIN_RPC_URL --ffi`
5. (Optional) Add `--broadcast` and `--private-key YOUR_PRIVATE_KEY` to broadcast the transaction to the destination chain

If you get an error from SimulateReceive script eg. `script failed: custom error 7182306f` you can do:

```shell
cast 4byte 7182306f
```

Example result:

```solidity
LZ_PayloadHashNotFound(bytes32,bytes32)
```
