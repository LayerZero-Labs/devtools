import { task } from 'hardhat/config'
import type { ActionType } from 'hardhat/types'
import { createLogger, printJson, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import { Stage, endpointIdToStage } from '@layerzerolabs/lz-definitions'

import { types } from '@/cli'
import { TASK_LZ_RESOLVE_COMMAND } from '@/constants/tasks'
import { assertDefinedNetworks } from '@/internal/assertions'
import {
    createCommandResolverSdkFactory,
    createTimeMarkerResolverSdkFactory,
    createTimeMarkerValidatorSdkFactory,
} from '@/read'
import { getEidsByNetworkName } from '@/runtime'

interface TaskArgs {
    command: string
    networks?: string[]
    stage?: Stage
    logLevel?: string
}

const action: ActionType<TaskArgs> = async (
    { command, networks: networksArgument, logLevel = 'info', stage },
    _hre
): Promise<string> => {
    printLogo()

    // Make sure to check that the networks are defined
    assertDefinedNetworks(networksArgument ?? [])

    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    // And we'll create a logger for ourselves
    const logger = createLogger()

    // --stage cannot be used in conjunction with --networks
    if (networksArgument != null && stage != null) {
        logger.error(`--stage ${stage} cannot be used in conjunction with --networks ${networksArgument.join(',')}`)

        process.exit(1)
    }

    // We grab a mapping between network names and endpoint IDs
    const eidsByNetworks = Object.entries(getEidsByNetworkName())
    // If a stage argument is passed, we'll filter out the networks for that stage
    const filteredEidsByNetworks =
        stage == null
            ? eidsByNetworks
            : eidsByNetworks.filter(([, eid]) => eid != null && endpointIdToStage(eid) === stage)
    const configuredNetworkNames = filteredEidsByNetworks.flatMap(([name, eid]) => (eid == null ? [] : [name]))

    // We'll use all the configured network names as the default for the networks argument
    const networks: string[] = networksArgument ?? configuredNetworkNames

    // Here we'll store the final value for the networks we'd like to deploy
    const selectedNetworks = networks

    // If no networks have been selected, we exit
    if (selectedNetworks.length === 0) {
        return logger.warn(`No networks selected, exiting`), ''
    }

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

task(TASK_LZ_RESOLVE_COMMAND, 'Resolve an LzRead command', action)
    .addParam('command', 'Command to resolve', undefined, types.string, false)
    .addParam(
        'networks',
        'List of comma-separated networks. If not provided, all networks will be used',
        undefined,
        types.csv,
        true
    )
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
    .addParam('stage', 'Chain stage. One of: mainnet, testnet, sandbox', undefined, types.stage, true)
