import { task } from 'hardhat/config'
import type { ActionType } from 'hardhat/types'
import { createLogger, printJson, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import { types } from '@layerzerolabs/devtools-evm-hardhat'

import {
    createCommandResolverFactory,
    createTimeMarkerResolverFactory,
    createTimeMarkerValidatorFactory,
} from '@/tasks/read/factory'
import { TASK_LZ_READ_RESOLVE_COMMAND } from '@/constants/tasks'

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

    const commandResolverSdkFactory = createCommandResolverFactory()
    const timeMarkerResolverSdkFactory = createTimeMarkerResolverFactory()
    const timeMarkerValidatorSdkFactory = createTimeMarkerValidatorFactory()

    const commandResolverSdk = await commandResolverSdkFactory()
    const timeMarkerResolverSdk = await timeMarkerResolverSdkFactory()
    const timeMarkerValidatorSdk = await timeMarkerValidatorSdkFactory()

    const decodedCommand = commandResolverSdk.decodeCommand(command)

    logger.info(`Decoded command: ${printJson(decodedCommand)}`)

    const { timestampTimeMarkers, blockNumberTimeMarkers } = await commandResolverSdk.extractTimeMarkers(command)

    logger.verbose(`Extracted time markers: ${printJson({ timestampTimeMarkers, blockNumberTimeMarkers })}`)

    const resolvedTimestampTimeMarkers = await timeMarkerResolverSdk.resolveTimestampTimeMarkers(timestampTimeMarkers)

    logger.info(`Resolved timestamp time markers: ${printJson(resolvedTimestampTimeMarkers)}`)

    await timeMarkerValidatorSdk.assertTimeMarkerBlockConfirmations([
        ...resolvedTimestampTimeMarkers,
        ...blockNumberTimeMarkers,
    ])

    logger.verbose(`Time markers have enough block confirmations`)

    const resolvedPayload = await commandResolverSdk.resolveCommand(command, resolvedTimestampTimeMarkers)

    logger.info(`Resolved payload: ${resolvedPayload}`)
    return resolvedPayload
}

task(TASK_LZ_READ_RESOLVE_COMMAND, 'Resolve an LzRead command', action)
    .addParam('command', 'Command to resolve', undefined, types.string, false)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
