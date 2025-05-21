import path from 'path'

import { task } from 'hardhat/config'

import { initializeTaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'
import { initOFTFA } from '@layerzerolabs/oft-move/tasks/initOFTFA'

interface Params {
    oappConfig: string
    moveDeployScript: string
}

task('lz:sdk:move:init-fa', 'Initialize Move OFT fungible asset')
    .addParam('oappConfig', 'Path to layerzero config')
    .addParam('moveDeployScript', 'Path to OFT init params script')
    .setAction(async ({ oappConfig, moveDeployScript }: Params) => {
        const ctx = await initializeTaskContext(oappConfig)
        const { default: params } = await import(path.resolve(moveDeployScript))
        await initOFTFA(
            params.token_name,
            params.token_symbol,
            params.icon_uri,
            params.project_uri,
            params.sharedDecimals ?? 6,
            params.localDecimals,
            ctx
        )
    })
