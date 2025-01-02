pnpm run lz:sdk:move --op deploy --lz-config movement.layerzero.config.ts --named-addresses oft=0x3d24005f22a2913a9e228547177a01a817fcd5bbaa5290b07fe4826f3f31be4a,oft_admin=0x3d24005f22a2913a9e228547177a01a817fcd5bbaa5290b07fe4826f3f31be4a --move-deploy-script deploy/MyMovementOFTFA.ts

pnpm run lz:sdk:move --op initOFTFA --lz-config movement.layerzero.config.ts --move-deploy-script deploy/MyMovementOFTFA.ts

1. Do we need to specify the named addresses or can we just use the account address?
2. Merge init with deploy?

pnpm run lz:sdk:evm --op wire --lz-config movement.layerzero.config.ts
pnpm run lz:sdk:move --op wire --lz-config movement.layerzero.config.ts
