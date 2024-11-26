# aptos-cli
```
aptos key generate --output-file my_key.pub
```
```
aptos init --network=custom --rest-url=http://localhost:8080/v1 --faucet-url=http://localhost:8081/v1 --private-key=<your-private-key>
```
```
cat .aptos/config.yaml 
```
```
aptos move build --named-addresses oft=<your-account-address-found-in-yaml>,oft_admin=<your-account-address-found-in-yaml> --package-dir=oft 
```
```
aptos move publish --package-dir=oft --named-addresses oft=<your-account-address-found-in-yaml>,oft_admin=<your-account-address-found-in-yaml>
```
```
aptos move create-object-and-publish-package  --named-addresses oft=<your-account-address-found-in-yaml>,oft_admin=<your-account-address-found-in-yaml> --package-dir=oft --address-name oft
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
INIT THE OFT FIRST
SET THE DELEGATE BEFORE YOU DO ANYTHING ELSE