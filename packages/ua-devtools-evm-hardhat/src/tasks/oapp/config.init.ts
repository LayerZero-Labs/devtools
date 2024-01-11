import { task, types } from 'hardhat/config'
import type { ActionType } from 'hardhat/types'
import { TASK_LZ_OAPP_CONFIG_INIT } from '@/constants/tasks'
import { printLogo } from '@layerzerolabs/io-devtools/swag'

interface TaskArgs {
    oappConfig: string
    logLevel?: string
    ci?: boolean
}

const action: ActionType<TaskArgs> = async (): Promise<void> => {
    printLogo()
}

task(TASK_LZ_OAPP_CONFIG_INIT, 'Initialize an OApp configuration file')
    .addParam('oappConfig', 'Path to the new LayerZero OApp config', './layerzero.config', types.string)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.string)
    .addParam(
        'ci',
        'Continuous integration (non-interactive) mode. Will not ask for any input from the user',
        false,
        types.boolean
    )
    .setAction(action)
