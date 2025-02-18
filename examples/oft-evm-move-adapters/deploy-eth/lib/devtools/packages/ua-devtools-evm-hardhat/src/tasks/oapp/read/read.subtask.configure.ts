import { SUBTASK_LZ_OAPP_READ_WIRE_CONFIGURE } from '@/constants'
import { SubtaskConfigureTaskArgs } from '@/tasks/types'
import { createConfigExecuteFlow, OmniTransaction } from '@layerzerolabs/devtools'
import { createConnectedContractFactory, types } from '@layerzerolabs/devtools-evm-hardhat'
import { createModuleLogger } from '@layerzerolabs/io-devtools'
import { IOAppRead, OAppReadOmniGraph, configureOAppRead } from '@layerzerolabs/ua-devtools'
import { createOAppReadFactory } from '@layerzerolabs/ua-devtools-evm'
import { subtask } from 'hardhat/config'
import type { ActionType } from 'hardhat/types'

const action: ActionType<SubtaskConfigureTaskArgs<OAppReadOmniGraph, IOAppRead>> = async ({
    graph,
    configurator = configureOAppRead,
    sdkFactory = createOAppReadFactory(createConnectedContractFactory()),
}): Promise<OmniTransaction[]> =>
    createConfigExecuteFlow({
        configurator,
        sdkFactory,
        logger: createModuleLogger(SUBTASK_LZ_OAPP_READ_WIRE_CONFIGURE),
    })({
        graph,
    })

subtask(SUBTASK_LZ_OAPP_READ_WIRE_CONFIGURE, 'Create a list of OmniTransactions that configure your OAppRead', action)
    .addParam('graph', 'Configuration graph', undefined, types.any)
    .addParam('configurator', 'Configuration function matching the SDK factory', undefined, types.any, true)
    .addParam('sdkFactory', 'SDK factory for an OmniSDK', undefined, types.any, true)
