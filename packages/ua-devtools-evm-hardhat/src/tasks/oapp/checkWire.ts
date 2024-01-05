import { ActionType } from 'hardhat/types'
import { task, types } from 'hardhat/config'
import { createLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { TASK_LZ_CHECK_WIRE_OAPP } from '@/constants/tasks'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import { HasPeer, OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { createConnectedContractFactory } from '@layerzerolabs/devtools-evm-hardhat'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import { checkOAppPeers } from '@layerzerolabs/ua-devtools'
import { endpointIdToNetwork } from '@layerzerolabs/lz-definitions'
import { validateAndTransformOappConfig } from '@/utils/taskHelpers'

interface TaskArgs {
    oappConfig: string
    logLevel?: string
}

type Connections<TKey extends string | number | symbol> = Record<TKey, Record<TKey, string>>

export const checkWire: ActionType<TaskArgs> = async ({ oappConfig: oappConfigPath, logLevel = 'info' }) => {
    printLogo()

    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    // And we'll create a logger for ourselves
    const logger = createLogger()
    const graph: OAppOmniGraph = await validateAndTransformOappConfig(oappConfigPath, logger)

    // At this point we are ready to create the list of transactions
    const contractFactory = createConnectedContractFactory()
    const oAppFactory = createOAppFactory(contractFactory)

    const checkOAppPeersResult: HasPeer[] = await checkOAppPeers(graph, oAppFactory)
    const connections: Connections<string> = {}
    checkOAppPeersResult.map(({ vector: { from } }) => {
        connections[endpointIdToNetwork(from.eid)] = {
            [endpointIdToNetwork(from.eid)]: '',
        }
    })
    checkOAppPeersResult.map(({ vector: { from, to }, hasPeer }) => {
        const connection = connections[endpointIdToNetwork(from.eid)]

        if (connection != null) {
            connection[endpointIdToNetwork(to.eid)] = hasPeer ? '🟩' : '🟥'
        }
    })
    console.table(connections)
    return connections
}

task(
    TASK_LZ_CHECK_WIRE_OAPP,
    'outputs visual console table to show current state of oapp connections via configuration'
)
    .addParam('oappConfig', 'Path to your LayerZero OApp config', './layerzero.config.js', types.string)
    .setAction(checkWire)
