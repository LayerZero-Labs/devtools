# Aptos OFT Deployment
### connecting to aptos via cli
To install aptos cli, run the following command:
```
brew install aptos
```
If you need to generate a new key, run the following command:
```
aptos key generate --output-file my_key.pub
```
Then initialize the aptos cli and connect to the aptos network:
```
aptos init --network=testnet --private-key=<your-private-key>
```
You can then verify that your initialization was successful by running the following command:
```
cat .aptos/config.yaml 
```
If successful the config will be populated with the RPC links and your account private key, account address, and network.
## Build the OFT:
We reccomend using the account address in printed by `cat .aptos/config.yaml` as the deployer and admin during the build and deploy steps to ensure wiring is successful. Afterwards you can use the transfer ownership script to set your desired admin.
```
ts-node tasks/move/build.ts --named-addresses oft=<account-address-of-deployer>,oft_admin=<account-address-of-admin>
```
## Deploy the OFT:
```
ts-node tasks/move/deploy.ts --address-name oft --named-addresses oft=<account-address-of-deployer>,oft_admin=<account-address-of-your-admin>
```

Make sure to set the account that will be used for administrative functions such as settting the peers should be set in the move.toml as OFT_ADMIN

Account Descriptions:
- oft is the owner of the deployer object which gives the account that owns the object the abilitiy to upgrade the object and also burn and mint the fungible asset.
- oft_admin is the account that is responsible for administrative functions such as setting the peers, set uln config... etc.

The address of the deployed oft is printed out in the terminal:
```
Code was successfully deployed to object address 0xaebb730cc67b4b0987ec99cd20b9eaf7c5c0d517f4424ab4f4b1450c6c8d9bb4.
{
  "Result": "Success"
}
```
## Set the delegate:
Run the following command to set the delegate to the oft. Ensure first that you have specified the delegate address in the layerzero.config.ts file.
```
npx hardhat run tasks/move/setDelegate.ts
```
## Initialize the OFT:
Inside the file tasks/move/initOFTFA.ts, set the following parameters:
```typescript
const tokenName = '<your-token-name>'
const tokenSymbol = '<your-token-symbol>'
const iconUri = '<your-icon-uri>'
const projectUri = '<your-project-uri>'
const sharedDecimals = <your-shared-decimals>
const localDecimals = <your-local-decimals>
```
Then run the following command to initialize the oft:
```
ts-node tasks/move/initOFTFA.ts
```
## Wiring your aptos OFT:

#### layerzero.config.ts:
ensure that all of the contracts you wish to wire your aptos oft to are included under the contracts array and connections array. For example, if you want to wire your aptos oft to fuji, you would include both contracts under the contracts array, and specify them like this:
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
            config: {
                delegate: '<your-aptos-account-address>',
                owner: '<your-aptos-owner-address>',
            },
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
npx hardhat run tasks/move/wire.ts
```

## Scripts For internal testing:
These scripts will not be shipped in the final version of the aptos cli. They are only for internal testing purposes.
### Mint Aptos OFT:
First add this function to oft/sources/internal_oft/oft_impl.move in order to expose minting functionality to our aptos sdk script:
```
public entry fun mint(
    admin: &signer,
    recipient: address,
    amount: u64,
) acquires OftImpl {
    assert_admin(address_of(admin));
    primary_fungible_store::mint(&store().mint_ref, recipient, amount);
}
```
Then run the following command to mint the aptos oft:
```
npx hardhat run tasks/move/mintMoveVMOFT.ts
```
### Send Aptos OFT:
Currently running into bugs with this script. Particularly around quoting send.
```
npx hardhat run tasks/move/sendFromMoveVMOFT.ts
```

# Movement OFT Deployment:
```
aptos init --network custom --rest-url https://aptos.testnet.porto.movementlabs.xyz/v1 --faucet-url https://faucet.testnet.bardock.movementnetwork.xyz/
```
