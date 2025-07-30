# Experimental

Do not use this in production.

Simple DVN is a mock DVN for testnet uses.

## Simple DVN Flow

The Simple DVN follows the same folow on the destination chain:

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
                   and signatures      Prepare for          transaction
                                       execution
```

## Instructions

Deploy your OFTs like usual. Follow the README.md through till you reach 'Next Steps'. You can then proceed with the below.

Deploy SimpleDVN on the destination chain:

```
pnpm hardhat --network arbitrum-testnet deploy --tags SimpleDVN
```

Update the destination chain's receive config to use SimpleDVN as the only Required DVN:

```
pnpm hardhat --network arbitrum-testnet lz:simple-dvn:set-receive-config --src-eid 40232 --contract-name MyOFTMock
```

Verify

```
pnpm hardhat --network arbitrum-testnet lz:simple-dvn:verify \
  --src-eid 40232 \
  --src-oapp <SOURCE_OFT_ADDRESS> \
  --nonce 1 \
  --to-address <RECIPIENT_ADDRESS> \
  --amount 1.5 \
  --dst-eid 40231
```

Commit

```
pnpm hardhat --network arbitrum-testnet lz:simple-dvn:commit \
  --src-eid 40232 \
  --src-oapp <SOURCE_OFT_ADDRESS>
  --nonce 1 \
  --to-address <RECIPIENT_ADDRESS> \
  --amount 1.5 \
  --dst-eid 40231
```

Now you can call lzReceive on the destination (execution)

```
pnpm hardhat --network arbitrum-testnet lz:simple-dvn:lz-receive \
  --src-eid 40232 \
  --src-oapp <SOURCE_OFT_ADDRESS> \
  --nonce 1 \
  --to-address <RECIPIENT_ADDRESS> \
  --amount 1.5 \
  --dst-eid 40231
```

## Troubleshooting

If you run into error `0x0177e1ca` (when running commit) which decodes into `LZ_PathNotVerifiable()`, then it might be a nonce issue. If it is a nonce issue, it is due to you using a nonce that has already been used on the destination. To fix, verify with a nonce that is higher, then retry commit.