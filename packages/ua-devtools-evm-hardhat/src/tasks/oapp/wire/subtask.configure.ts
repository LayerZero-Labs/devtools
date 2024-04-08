import { SUBTASK_LZ_OAPP_WIRE_CONFIGURE } from '@/constants'
import { OmniGraphBuilder, OmniTransaction } from '@layerzerolabs/devtools'
import { createConnectedContractFactory, types } from '@layerzerolabs/devtools-evm-hardhat'
import { createModuleLogger, printJson } from '@layerzerolabs/io-devtools'
import { configureOApp } from '@layerzerolabs/ua-devtools'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import { subtask } from 'hardhat/config'
import type { ActionType } from 'hardhat/types'
import type { SubtaskConfigureTaskArgs } from './types'

const action: ActionType<SubtaskConfigureTaskArgs> = async ({
    graph,
    configurator = configureOApp,
    oappFactory = createOAppFactory(createConnectedContractFactory()),
}): Promise<OmniTransaction[]> => {
    const logger = createModuleLogger(SUBTASK_LZ_OAPP_WIRE_CONFIGURE)

    logger.verbose(`Running with graph:\n\n${printJson(graph)}`)

    // As an additional step, even though this task is getting called
    // from controlled and type-safe environments (for now),
    // we pass the graph through a builder
    //
    // We can discard the output, this step is only here to ensure that the graph is valid
    // (this) call would throw if the graph was not valid
    try {
        logger.verbose(`Validating graph`)

        OmniGraphBuilder.fromGraph(graph)
    } catch (error) {
        logger.verbose(`Provided graph does not look valid: ${error}`)

        throw new Error(`An error occurred while verifying OApp OmniGraph: ${error}`)
    }

    // The only thing this task does is it uses the provided arguments
    // to compile a list of OmniTransactions
    try {
        return await configurator(graph, oappFactory)
    } catch (error) {
        logger.verbose(`Encountered an error: ${error}`)

        throw new Error(`An error occurred while getting the OApp configuration: ${error}`)
    }
}

subtask(SUBTASK_LZ_OAPP_WIRE_CONFIGURE, 'Create a list of OmniTransactions that configure your OApp', action)
    .addParam('graph', 'Configuration of you OApp of type OAppOmniGraph', undefined, types.any)
    .addParam('configurator', 'Configuration function of type OAppConfigurator', undefined, types.any, true)
    .addParam('oappFactory', 'SDK factory for OApp SDK of type OAppFactory', undefined, types.any, true)
