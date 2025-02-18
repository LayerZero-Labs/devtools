import { SUBTASK_LZ_OAPP_CONFIG_LOAD } from '@/constants/tasks'
import { createConfigLoadFlow, type OmniGraph } from '@layerzerolabs/devtools'
import { createOmniGraphHardhatTransformer, types } from '@layerzerolabs/devtools-evm-hardhat'
import { createModuleLogger } from '@layerzerolabs/io-devtools'
import { subtask } from 'hardhat/config'
import type { ActionType } from 'hardhat/types'
import type { SubtaskLoadConfigTaskArgs } from './types'

const action: ActionType<SubtaskLoadConfigTaskArgs> = async ({
    configPath,
    schema,
    task,
}): Promise<OmniGraph<unknown, unknown>> =>
    createConfigLoadFlow({
        configSchema: schema.transform(createOmniGraphHardhatTransformer()),
        logger: createModuleLogger(`${task}${SUBTASK_LZ_OAPP_CONFIG_LOAD}`),
    })({ configPath })

subtask(SUBTASK_LZ_OAPP_CONFIG_LOAD, 'Loads and transforms OmniGraphHardhat into an OmniGraph', action)
    .addParam('configPath', 'Path to the config file', undefined, types.string)
    .addParam('schema', 'Zod schema used to validate the config', undefined, types.any)
    .addParam('task', 'Task that is calling this subtask', undefined, types.string)
