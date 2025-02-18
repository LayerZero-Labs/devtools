import { SUBTASK_LZ_OAPP_WIRE_CONFIGURE } from '@/constants'
import { createConfigExecuteFlow, OmniTransaction } from '@layerzerolabs/devtools'
import { createConnectedContractFactory, types } from '@layerzerolabs/devtools-evm-hardhat'
import { createModuleLogger } from '@layerzerolabs/io-devtools'
import { IOApp, OAppOmniGraph, configureOApp } from '@layerzerolabs/ua-devtools'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import { subtask } from 'hardhat/config'
import type { ActionType } from 'hardhat/types'
import type { SubtaskConfigureTaskArgs } from './types'

const action: ActionType<SubtaskConfigureTaskArgs<OAppOmniGraph, IOApp>> = async ({
    graph,
    configurator = configureOApp,
    sdkFactory = createOAppFactory(createConnectedContractFactory()),
}): Promise<OmniTransaction[]> =>
    createConfigExecuteFlow({ configurator, sdkFactory, logger: createModuleLogger(SUBTASK_LZ_OAPP_WIRE_CONFIGURE) })({
        graph,
    })

subtask(SUBTASK_LZ_OAPP_WIRE_CONFIGURE, 'Create a list of OmniTransactions that configure your OApp', action)
    .addParam('graph', 'Configuration graph', undefined, types.any)
    .addParam('configurator', 'Configuration function matching the SDK factory', undefined, types.any, true)
    .addParam('sdkFactory', 'SDK factory for an OmniSDK', undefined, types.any, true)
