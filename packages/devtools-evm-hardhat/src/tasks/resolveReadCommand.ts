import { task } from 'hardhat/config'
import type { ActionType } from 'hardhat/types'
import { createLogger, printJson, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { printLogo } from '@layerzerolabs/io-devtools/swag'

import { types } from '@/cli'
import { TASK_LZ_READ_RESOLVE_COMMAND } from '@/constants/tasks'
import {
    createCommandResolverSdkFactory,
    createTimeMarkerResolverSdkFactory,
    createTimeMarkerValidatorSdkFactory,
} from '@/read'

interface TaskArgs {
    command: string
    logLevel?: string
}

const action: ActionType<TaskArgs> = async ({ command, logLevel = 'info' }, _hre): Promise<string> => {
    printLogo()

    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    // And we'll create a logger for ourselves
    const logger = createLogger()

    const commandResolverSdkFactory = createCommandResolverSdkFactory()
    const timeMarkerResolverSdkFactory = createTimeMarkerResolverSdkFactory()
    const timeMarkerValidatorSdkFactory = createTimeMarkerValidatorSdkFactory()

    const commandResolverSdk = await commandResolverSdkFactory()
    const timeMarkerResolverSdk = await timeMarkerResolverSdkFactory()
    const timeMarkerValidatorSdk = await timeMarkerValidatorSdkFactory()

    const { timestampTimeMarkers, blockNumberTimeMarkers } = await commandResolverSdk.extractTimeMarkers(command)
    const resolvedTimestampTimeMarkers = await timeMarkerResolverSdk.resolveTimestampTimeMarkers(timestampTimeMarkers)

    logger.info(`Resolved timestamp time markers: ${printJson(resolvedTimestampTimeMarkers)}`)

    await timeMarkerValidatorSdk.checkResolvedTimeMarkerValidity(resolvedTimestampTimeMarkers)

    logger.verbose(`Timestamp time markers are valid`)

    await timeMarkerValidatorSdk.assertTimeMarkerBlockConfirmations([
        ...resolvedTimestampTimeMarkers,
        ...blockNumberTimeMarkers,
    ])

    logger.verbose(`Block confirmations are resolved`)

    const resolvedPayload = await commandResolverSdk.resolveCmd(command, resolvedTimestampTimeMarkers)

    logger.info(`Resolved payload: ${resolvedPayload}`)
    return resolvedPayload
}

task(TASK_LZ_READ_RESOLVE_COMMAND, 'Resolve an LzRead command', action)
    .addParam('command', 'Command to resolve', undefined, types.string, false)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
