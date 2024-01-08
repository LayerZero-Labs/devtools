import { ActionType } from 'hardhat/types'
import { task, types } from 'hardhat/config'
import { createLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { printRecords } from '@layerzerolabs/io-devtools/swag'
import { TASK_LZ_CHECK_WIRE_OAPP } from '@/constants/tasks'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import { OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { createConnectedContractFactory } from '@layerzerolabs/devtools-evm-hardhat'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import { checkOAppPeers } from '@layerzerolabs/ua-devtools'
import { validateAndTransformOappConfig } from '@/utils/taskHelpers'
import { getNetworkNameForEid } from '@layerzerolabs/devtools-evm-hardhat'
import { printBoolean } from '@layerzerolabs/io-devtools'

interface TaskArgs {
    oappConfig: string
    logLevel?: string
}

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

    try {
        const peers = await checkOAppPeers(graph, oAppFactory)

        const formattedPeers = peers.map((peer) => ({
            'From network': getNetworkNameForEid(peer.vector.from.eid),
            'To network': getNetworkNameForEid(peer.vector.to.eid),
            Connected: printBoolean(peer.hasPeer),
        }))

        printRecords(formattedPeers)

        return peers
    } catch (error) {
        throw new Error(`An error occurred while getting the OApp configuration: ${error}`)
    }
}

task(
    TASK_LZ_CHECK_WIRE_OAPP,
    'outputs visual console table to show current state of oapp connections via configuration'
)
    .addParam('oappConfig', 'Path to your LayerZero OApp config', './layerzero.config.js', types.string)
    .setAction(checkWire)
