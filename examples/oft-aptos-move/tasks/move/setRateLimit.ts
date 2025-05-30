import { task } from 'hardhat/config'

import { OFTType } from '@layerzerolabs/devtools-move/sdk/IOFT'
import { initializeTaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'
import { setRateLimit } from '@layerzerolabs/oft-move/tasks/setRateLimit'

task('lz:sdk:move:set-rate-limit', 'Set pathway rate limit')
    .addParam('oappConfig', 'Path to layerzero config')
    .addParam('rateLimit', 'Rate limit amount')
    .addParam('windowSeconds', 'Window in seconds')
    .addParam('toEid', 'Destination EID')
    .addOptionalParam('oftType', 'OFT type', OFTType.OFT_FA)
    .setAction(async (args) => {
        const ctx = await initializeTaskContext(args.oappConfig)
        await setRateLimit(
            ctx,
            BigInt(args.rateLimit),
            BigInt(args.windowSeconds),
            Number(args.toEid) as any,
            args.oftType
        )
    })
