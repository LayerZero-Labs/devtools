import { SUBTASK_LZ_OAPP_CONFIG_LOAD } from '@/constants/tasks'
import type { OmniGraph } from '@layerzerolabs/devtools'
import { OmniGraphBuilderHardhat, types } from '@layerzerolabs/devtools-evm-hardhat'
import { createConfigLoader, createModuleLogger, printJson } from '@layerzerolabs/io-devtools'
import { subtask } from 'hardhat/config'
import type { ActionType } from 'hardhat/types'
import type { SubtaskLoadConfigTaskArgs } from './types'

const action: ActionType<SubtaskLoadConfigTaskArgs> = async ({
    configPath,
    schema,
    task,
}): Promise<OmniGraph<unknown, unknown>> => {
    const logger = createModuleLogger(`${task}${SUBTASK_LZ_OAPP_CONFIG_LOAD}`)

    logger.verbose(`Running with config from ${configPath}`)

    const configLoader = createConfigLoader(schema)

    /**
     * At this point we have a correctly typed config in the hardhat format
     */
    const hardhatGraph = await configLoader(configPath)
    /**
     * We'll also print out the whole config for verbose loggers
     */
    logger.verbose(`Config file '${configPath}' has correct structure`)
    logger.debug(`The hardhat config is:\n\n${printJson(hardhatGraph)}`)
    /**
     * What we need to do now is transform the config from hardhat format to the generic format
     * with addresses instead of contractNames
     */
    logger.verbose(`Transforming '${configPath}' from hardhat-specific format to a generic format`)

    try {
        /**
         * The transformation is achieved using a builder that also validates the resulting graph
         * (i.e. makes sure that all the contracts exist and connections are valid)
         */
        const builder = await OmniGraphBuilderHardhat.fromConfig(hardhatGraph)
        /**
         * We only need the graph so we throw away the builder
         */
        const graph = builder.graph

        /**
         * Show more detailed logs to interested users
         */
        logger.verbose(`Transformed '${configPath}' from hardhat-specific format to generic format`)
        logger.debug(`The resulting config is:\n\n${printJson(graph)}`)

        return graph
    } catch (error) {
        throw new Error(`Config from file '${configPath}' is invalid: ${error}`)
    }
}

subtask(SUBTASK_LZ_OAPP_CONFIG_LOAD, 'Loads and transforms OmniGraphHardhat into an OmniGraph', action)
    .addParam('configPath', 'Path to the config file', undefined, types.string)
    .addParam('schema', 'Zod schema used to validate the config', undefined, types.any)
    .addParam('task', 'Task that is calling this subtask', undefined, types.string)
