import { ActionType } from 'hardhat/types'
import { task, types } from 'hardhat/config'
import { createLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { TASK_LZ_CHECK_WIRE_OAPP } from '@/constants/tasks'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import { OAppPeers, OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { createConnectedContractFactory } from '@layerzerolabs/devtools-evm-hardhat'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import { checkOAppPeers } from '@layerzerolabs/ua-devtools'
import { endpointIdToNetwork } from '@layerzerolabs/lz-definitions'
import { validateAndTransformOappConfig } from '@/utils/taskHelpers'

interface TaskArgs {
    oappConfig: string
    logLevel?: string
}

type ConnectedPeers<TKey extends string | number | symbol> = Record<TKey, Record<TKey, string>>

export const checkWire: ActionType<TaskArgs> = async ({ oappConfig: oappConfigPath, logLevel = 'info' }) => {
    printLogo()

    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    // And we'll create a logger for ourselves
    const logger = createLogger()
    const graph: OAppOmniGraph = await validateAndTransformOappConfig(oappConfigPath, logger)

    // At this point we are ready read data from the OApp
    logger.verbose(`Reading peers from OApps`)
    const contractFactory = createConnectedContractFactory()
    const oAppFactory = createOAppFactory(contractFactory)

    let checkOAppPeersArray: OAppPeers[]
    try {
        checkOAppPeersArray = await checkOAppPeers(graph, oAppFactory)
    } catch (error) {
        throw new Error(`An error occurred while getting the OApp configuration: ${error}`)
    }

    const connectedPeers: ConnectedPeers<string> = {}
    for (const oappPeer of checkOAppPeersArray) {
        const fromNetwork = endpointIdToNetwork(oappPeer.vector.from.eid)
        const toNetwork = endpointIdToNetwork(oappPeer.vector.to.eid)

        if (!connectedPeers[fromNetwork]) {
            connectedPeers[fromNetwork] = {
                [fromNetwork]: '',
            }
        }

        const connection = connectedPeers[fromNetwork]
        if (connection && !connection[toNetwork]) {
            connection[toNetwork] = oappPeer.hasPeer ? '🟩' : '🟥'
        }
    }

    console.table(connectedPeers)
    return connectedPeers
}

task(
    TASK_LZ_CHECK_WIRE_OAPP,
    'outputs visual console table to show current state of oapp connections via configuration'
)
    .addParam('oappConfig', 'Path to your LayerZero OApp config', './layerzero.config.js', types.string)
    .setAction(checkWire)
