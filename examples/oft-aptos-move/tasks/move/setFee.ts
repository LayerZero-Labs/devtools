import { task } from 'hardhat/config'

import { OFTType } from '@layerzerolabs/devtools-move/sdk/IOFT'
import { initializeTaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'
import { setFee } from '@layerzerolabs/oft-move/tasks/setFee'

task('lz:sdk:move:set-fee', 'Set pathway fee')
    .addParam('oappConfig', 'Path to layerzero config')
    .addParam('feeBps', 'Fee in basis points')
    .addParam('toEid', 'Destination EID')
    .addOptionalParam('oftType', 'OFT type', OFTType.OFT_FA)
    .setAction(async ({ oappConfig, feeBps, toEid, oftType }) => {
        const ctx = await initializeTaskContext(oappConfig)
        await setFee(BigInt(feeBps), Number(toEid) as any, oftType, ctx)
    })
