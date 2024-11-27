# aptos-cli
```
aptos key generate --output-file my_key.pub
```
```
aptos init --network=custom --rest-url=http://localhost:8080/v1 --faucet-url=http://localhost:8081 --private-key=<your-private-key>
```
```
cat .aptos/config.yaml 
```
```
account_address=0x3d24005f22a2913a9e228547177a01a817fcd5bbaa5290b07fe4826f3f31be4a
aptos move build --package-dir=oft --named-addresses oft=$account_address,oft_admin=$account_address 
```
```
aptos move publish --package-dir=oft --named-addresses oft=$account_address,oft_admin=$account_address
```
```
aptos move create-object-and-publish-package --package-dir=oft --address-name oft --named-addresses oft=$account_address,oft_admin=$account_address
```
MAKE SURE YOU set the account that will be used for administrative functions such as settting the peers should be set in the move.toml as OFT_ADMIN

TODO: create descriptions of each account
oft is the owner of the deployer object which gives the account that owns the object the abilitiy to upgrade the object and also burn and mint the fungible asset.
oft_admin is the account that is responsible for administrative functions such as setting the peers, set uln config... etc.

now the address of the deployed oft is printed out in the terminal:
```
Code was successfully deployed to object address 0xaebb730cc67b4b0987ec99cd20b9eaf7c5c0d517f4424ab4f4b1450c6c8d9bb4.
{
  "Result": "Success"
}
```
INIT THE OFT FIRST (?)
SET THE DELEGATE BEFORE YOU DO ANYTHING ELSE

Now that we have deployed the aptos oft, we can wire it to the other chains.

### Wiring your aptos oft:

### layerzero.config.ts:
ensure that all of the contracts you wish to wire your aptos oft to are included under the contracts array. For example, if you want to wire your aptos oft to both sepolia and fuji, you would include both contracts under the contracts array, and specify them like this:
```typescript
const aptosContract: OmniPointHardhat = {
    eid: EndpointId.APTOS_TESTNET,
    contractName: 'oft',
}

const fujiContract: OmniPointHardhat = {
    eid: EndpointId.AVALANCHE_V2_TESTNET,
    contractName: 'MyOFT',
}

const config: OAppOmniGraphHardhat = {
    contracts: [
        {
            contract: fujiContract,
        },
        {
            contract: aptosContract,
        },
    ],
    connections: [
        {
            from: aptosContract,
            to: fujiContract,
        },
        {
            from: aptosContract,
            to: sepoliaContract,
        },
    ],
}
```

IMPORTANT: Before running the wire script ensure that you have run aptos init and configuered your desired network such as custom, testnet, mainnet, etc. and have also deployed the oft to that network.
```
npx hardhat run tasks/wireAptosOFT.ts
```