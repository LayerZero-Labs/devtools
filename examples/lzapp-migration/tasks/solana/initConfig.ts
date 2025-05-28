import { PublicKey } from '@solana/web3.js'
import { ConfigurableTaskDefinition } from 'hardhat/types'

import { inheritTask } from '@layerzerolabs/devtools-evm-hardhat'
import { type LogLevel } from '@layerzerolabs/io-devtools'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { type OAppConfigurator } from '@layerzerolabs/ua-devtools'
import { TASK_LZ_OAPP_WIRE } from '@layerzerolabs/ua-devtools-evm-hardhat'
import { initOFTAccounts } from '@layerzerolabs/ua-devtools-solana'

// We'll create clones of the wire task and only override the configurator argument
const wireLikeTask = inheritTask(TASK_LZ_OAPP_WIRE)

// TODO: export from wire.ts instead of re-declaring
/**
 * Additional CLI arguments for our custom wire task
 */
interface Args {
    logLevel: LogLevel
    solanaEid: EndpointId
    multisigKey?: PublicKey
    internalConfigurator?: OAppConfigurator
}

// This task will use the `initOFTAccounts` configurator that initializes the Solana accounts
const initConfigTask = wireLikeTask('lz:oft:solana:init-config') as ConfigurableTaskDefinition

// This task will use the `initOFTAccounts` configurator that initializes the Solana accounts
initConfigTask
    .setDescription('Initialize OFT accounts for Solana')
    .setAction(async (args: Args, hre) =>
        hre.run(TASK_LZ_OAPP_WIRE, { ...args, isSolanaInitConfig: true, internalConfigurator: initOFTAccounts })
    )
