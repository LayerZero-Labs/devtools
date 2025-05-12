<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="width: 400px" src="https://docs.layerzero.network/img/LayerZero_Logo_White.svg"/>
  </a>
</p>

<p align="center">
  <a href="https://layerzero.network" style="color: #a77dff">Homepage</a> | <a href="https://docs.layerzero.network/" style="color: #a77dff">Docs</a> | <a href="https://layerzero.network/developers" style="color: #a77dff">Developers</a>
</p>

<h1 align="center">OmniRead</h1>


## Introduction

`OmniRead` supports arbitrary omnichain read requests and stores the return data for later retrieval. The return data are stored as raw bytes, so the decoding to the desired types is done offchain by the caller. Keep in mind if a batch request is done, the return data are stored as a sequential raw bytes, following the order of the requests.

This contract supports both onchain and offchain reading. The difference is that for offchain it emits the `ReadRequestSent` event so that the GUID generated for the request can be queried from offchain stack. It is also possible to provide an identifier in case of more than one read request per block for the same caller.

To interact with a `OmniRead` instance, you can use the `read` and `response` Hardhat tasks.

## Sending cross-chain read requests

To query the USDC balance of an `<ADDRESS>` on both Arbitrum Sepolia and Base Sepolia from Ethereum Sepolia, using block number and block timestap in their default values (that is, `block.number`  and `block.timestamp`), first compute the `balanceOf(address)` calldata:

```shell
cast calldata "balanceOf(address)" <ADDRESS>
```

Then, calculate the returned data bytes length. In this case, it is 64 bytes. Also, define the desired block confirmations, which we're going to use 1 for both requests.

Using the address value (`<ADDRESS>`) as `0x7bcf73db017b56fc06b2b3de0e01f9d017daafdf` and know that the USDC contract addresses on Base Sepolia and Arbitrum Sepolia are `0x036CbD53842c5426634e7929541eC2318f3dCF7e` and `0xbC47901f4d2C5fc871ae0037Ea05c3F614690781` respectively, run the Hardhat `read` task:

```shell
npx hardhat read --network ethereum-testnet --target-eids 40245,40231 --is-block-nums false,false --block-num-or-timestamps 0,0 --confirmations 1,1 --tos 0x036CbD53842c5426634e7929541eC2318f3dCF7e,0xbC47901f4d2C5fc871ae0037Ea05c3F614690781 --calldatas 0x70a082310000000000000000000000007bcf73db017b56fc06b2b3de0e01f9d017daafdf,0x70a082310000000000000000000000007bcf73db017b56fc06b2b3de0e01f9d017daafdf --return-data-size 64
```

The output should be something like:

```shell
Tx Hash: 0xb7c4fe054324ac8d0f7dd60d1024d473a3cca8eda1ed4074afef812a64aae50c
Request GUID: 0x7b7405f53cfa442ae0456889ad0f947cb39b2061d95f867724ca05af3a76b7c6
```

## Querying cross-chain read request results

To query the previously sent read request, you can use the `response` Hardhat task, using `--guid` paramenter with the GUID output from previous command:

```shell
npx hardhat response --network ethereum-testnet --guid 0x7b7405f53cfa442ae0456889ad0f947cb39b2061d95f867724ca05af3a76b7c6
```

If you receive `No ReadRequestReceived event found for GUID: 0x7b7405f53cfa442ae0456889ad0f947cb39b2061d95f867724ca05af3a76b7c6` this means the read request has not been completed yet or the request has failed. You can check the status of your request in https://layerzeroscan.com/

If the read request is completed, the output will be something like:

```shell
Result: 0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
```
Which is a correct answer, because the `0x7bcf73db017b56fc06b2b3de0e01f9d017daafdf` does not have any USDC balance on neighter Base Sepolia nor Arbitrum Sepolia.

You can also provide the response lengths individually and get a prettier output:

```shell
npx hardhat response --network ethereum-testnet --guid 0x7b7405f53cfa442ae0456889ad0f947cb39b2061d95f867724ca05af3a76b7c6 --lengths 32,32
```

Which output is something similar to:

```shell
Result: 0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
Result 0: 0x0000000000000000000000000000000000000000000000000000000000000000
Result 1: 0x0000000000000000000000000000000000000000000000000000000000000000
```
