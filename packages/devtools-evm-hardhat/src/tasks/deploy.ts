import { task } from 'hardhat/config'
import type { ActionType } from 'hardhat/types'
import { TASK_LZ_DEPLOY } from '@/constants/tasks'
import { createLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'

import { printLogo } from '@layerzerolabs/io-devtools/swag'
import { types } from '@/cli'
import { assertDefinedNetworks } from '@/internal/assertions'

interface TaskArgs {
    networks?: string[]
    logLevel?: string
    ci?: boolean
}

const action: ActionType<TaskArgs> = async ({
    networks: networksArgument,
    logLevel = 'info',
    ci = false,
}): Promise<void> => {
    printLogo()

    // Make sure to check that the networks are defined
    assertDefinedNetworks(networksArgument ?? [])

    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    // And we'll create a logger for ourselves
    const logger = createLogger()

    // We only want to be asking users for input if we are not in interactive mode
    const isInteractive = !ci
    logger.debug(isInteractive ? 'Running in interactive mode' : 'Running in non-interactive (CI) mode')

    // First we'll deal with the networks
    if (networksArgument == null) {
        logger.verbose('No --networks argument provided, will use all networks')
    }
}

if (process.env.LZ_ENABLE_EXPERIMENTAL_TASK_LZ_DEPLOY) {
    task(TASK_LZ_DEPLOY, 'Deploy LayerZero contracts')
        .addParam(
            'networks',
            'List of comma-separated networks. If not provided, all networks will be deployed',
            undefined,
            types.csv,
            true
        )
        .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
        .addParam(
            'ci',
            'Continuous integration (non-interactive) mode. Will not ask for any input from the user',
            false,
            types.boolean
        )
        .setAction(action)
}
