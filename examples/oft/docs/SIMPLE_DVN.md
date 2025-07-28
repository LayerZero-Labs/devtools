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

## Simple DVN Flow

The Simple DVN follows a three-step verification process:

```
                    ┌──────────┐       ┌──────────┐       ┌──────────┐
                    │          │       │          │       │          │
                    │  VERIFY  │──────▶│  COMMIT  │──────▶│ EXECUTE  │
                    │          │       │          │       │          │
                    └──────────┘       └──────────┘       └──────────┘
                         │                   │                   │
                         │                   │                   │
                         ▼                   ▼                   ▼
                   Validate the        Store verification    Execute the
                  packet payload       result on-chain      cross-chain
                   and signatures                           transaction
```

Now, you can test the complete flow by verifying, committing, and executing transactions through the Simple DVN. 