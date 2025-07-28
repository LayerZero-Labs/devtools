# Experimental

Do not use this in production.

Simple DVN is a mock DVN for testnet uses.

Deploy your OFTs like usual. Follow the README.md through till you reach 'Next Steps'. You can then proceed with the below.

Deploy SimpleDVN on the destination chain:

```
pnpm hardhat --network arbitrum-testnet deploy --tags SimpleDVN
```

Update the destination chain's receive config to use SimpleDVN as the only Required DVN:

```
pnpm hardhat --network arbitrum-testnet lz:simple-dvn:set-receive-config --src-eid 40232 --contract-name MyOFTMock
```
