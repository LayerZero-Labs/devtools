import { task } from 'hardhat/config'

import { OFTType } from '@layerzerolabs/devtools-move/sdk/IOFT'
import { initializeTaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'
import { unsetRateLimit } from '@layerzerolabs/oft-move/tasks/unSetRateLimit'

task('lz:sdk:move:unset-rate-limit', 'Unset pathway rate limit')
    .addParam('oappConfig', 'Path to layerzero config')
    .addParam('toEid', 'Destination EID')
    .addOptionalParam('oftType', 'OFT type', OFTType.OFT_FA)
    .setAction(async ({ oappConfig, toEid, oftType }) => {
        const ctx = await initializeTaskContext(oappConfig)
        await unsetRateLimit(ctx, Number(toEid) as any, oftType)
    })
