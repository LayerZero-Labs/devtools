import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import { createLogger, printBoolean, printCrossTable, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { SUBTASK_LZ_OAPP_CONFIG_LOAD, TASK_LZ_OAPP_PEERS_GET } from '@/constants/tasks'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import { OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { createConnectedContractFactory, types } from '@layerzerolabs/devtools-evm-hardhat'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import { checkOAppPeers } from '@layerzerolabs/ua-devtools'
import { getNetworkNameForEid } from '@layerzerolabs/devtools-evm-hardhat'
import { areVectorsEqual } from '@layerzerolabs/devtools'
import { OAppOmniGraphHardhatSchema } from '@/oapp/schema'
import type { SubtaskLoadConfigTaskArgs } from './types'

interface TaskArgs {
    oappConfig: string
    logLevel?: string
}

const action: ActionType<TaskArgs> = async ({ oappConfig: oappConfigPath, logLevel = 'info' }, hre) => {
    printLogo()

    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    // And we'll create a logger for ourselves
    const logger = createLogger()

    // Now we load the graph
    const graph: OAppOmniGraph = await hre.run(SUBTASK_LZ_OAPP_CONFIG_LOAD, {
        configPath: oappConfigPath,
        schema: OAppOmniGraphHardhatSchema,
        task: TASK_LZ_OAPP_PEERS_GET,
    } satisfies SubtaskLoadConfigTaskArgs)

    // need points for OApp Peer Matrix
    const points = graph.contracts
        .map(({ point }) => point)
        .map((point) => ({
            ...point,
            networkName: getNetworkNameForEid(point.eid),
        }))

    // At this point we are ready read data from the OApp
    logger.verbose(`Reading peers from OApps`)
    const contractFactory = createConnectedContractFactory()
    const oAppFactory = createOAppFactory(contractFactory)

    try {
        const peers = await checkOAppPeers(graph, oAppFactory)
        const peerNetworkMatrix = points.map((row) => {
            /**
             * for each point in the network (referred to as 'row'), create a row in the matrix
             */
            const connectionsForCurrentRow = points.reduce((tableRow, column) => {
                /**
                 * find a peer with a vector matching the connection from 'column' to 'row'
                 */
                const connection = peers.find((peer) => {
                    return areVectorsEqual(peer.vector, { from: column, to: row })
                })
                /**
                 * update the row with a key-value pair indicating the connection status for the current column
                 */
                return {
                    ...tableRow,
                    [column.networkName]: printBoolean(connection?.hasPeer),
                }
            }, {})
            /**
             * return the row representing connections for the current 'row'
             */
            return connectionsForCurrentRow
        })

        console.log(
            printCrossTable(peerNetworkMatrix, ['from → to', ...points.map(({ networkName }) => networkName)], true)
        )
        console.log(` ${printBoolean(true)} - Connected`)
        console.log(` ${printBoolean(false)} - Not Connected`)
        console.log(` ${printBoolean(undefined)} - Ignored`)

        return peers
    } catch (error) {
        throw new Error(`An error occurred while getting the OApp configuration: ${error}`)
    }
}

task(TASK_LZ_OAPP_PEERS_GET, 'Outputs OApp peer connections', action)
    .addParam('oappConfig', 'Path to your LayerZero OApp config', undefined, types.string)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
