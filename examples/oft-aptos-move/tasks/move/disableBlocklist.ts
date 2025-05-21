import { task } from 'hardhat/config'

import { OFTType } from '@layerzerolabs/devtools-move/sdk/IOFT'
import { initializeTaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'
import { irrevocablyDisableBlocklist } from '@layerzerolabs/oft-move/tasks/irrevocablyDisableBlocklist'

task('lz:oft:aptos:permanently-disable-blocklist', 'Disable blocklist permanently')
    .addParam('oappConfig', 'Path to layerzero config')
    .addOptionalParam('oftType', 'OFT type', OFTType.OFT_FA)
    .setAction(async ({ oappConfig, oftType }) => {
        const ctx = await initializeTaskContext(oappConfig)
        await irrevocablyDisableBlocklist(ctx, oftType)
    })
