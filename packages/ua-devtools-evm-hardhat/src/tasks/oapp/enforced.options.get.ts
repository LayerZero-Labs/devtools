import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import { createLogger, printCrossTable, printRecord, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { TASK_LZ_OAPP_ENFORCED_OPTIONS_GET } from '@/constants/tasks'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import { OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { createConnectedContractFactory, types } from '@layerzerolabs/devtools-evm-hardhat'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import { checkOAppEnforcedOptions } from '@layerzerolabs/ua-devtools'
import { validateAndTransformOappConfig } from '@/utils/taskHelpers'
import { getNetworkNameForEid } from '@layerzerolabs/devtools-evm-hardhat'
import { areVectorsEqual, isZero } from '@layerzerolabs/devtools'
import { Options } from '@layerzerolabs/lz-v2-utilities'

interface TaskArgs {
    oappConfig: string
    logLevel?: string
}

export const enforcedOptionsGet: ActionType<TaskArgs> = async ({ oappConfig: oappConfigPath, logLevel = 'info' }) => {
    printLogo()

    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    // And we'll create a logger for ourselves
    const logger = createLogger()
    const graph: OAppOmniGraph = await validateAndTransformOappConfig(oappConfigPath, logger)

    // need points for OApp Peer Matrix
    const points = graph.contracts
        .map(({ point }) => point)
        .map((point) => ({
            ...point,
            networkName: getNetworkNameForEid(point.eid),
        }))

    // At this point we are ready read data from the OApp
    const contractFactory = createConnectedContractFactory()
    const oAppFactory = createOAppFactory(contractFactory)

    try {
        const enforcedOptions = await checkOAppEnforcedOptions(graph, oAppFactory)
        const peerNetworkMatrix = points.map((row) => {
            /**
             * for each point in the network (referred to as 'row'), create a row in the matrix
             */
            const connectionsForCurrentRow = points.reduce((tableRow, column) => {
                /**
                 * find a peer with a vector matching the connection from 'column' to 'row'
                 */
                const connection = enforcedOptions.find((peer) => {
                    return areVectorsEqual(peer.vector, { from: column, to: row })
                })
                /**
                 * update the row with a key-value pair indicating the connection status for the current column
                 */
                const enforcedOptsByMsgType = {}
                if (connection?.enforcedOptions) {
                    connection.enforcedOptions.forEach((option) => {
                        let enforcedOpts = {}
                        if (!isZero(option.options)) {
                            enforcedOpts = updateEnforcedOptsFromOptions(enforcedOpts, option)
                            enforcedOptsByMsgType['msgType: ' + option.msgType] = enforcedOpts
                        }
                    })
                }

                return {
                    ...tableRow,
                    [column.networkName]: printRecord(enforcedOptsByMsgType),
                }
            }, {})

            /**
             * return the row representing connections for the current 'row'
             */
            return connectionsForCurrentRow
        })

        console.log(printCrossTable(peerNetworkMatrix, ['from → to', ...points.map(({ networkName }) => networkName)]))

        return enforcedOptions
    } catch (error) {
        throw new Error(`An error occurred while getting the OApp configuration: ${error}`)
    }
}

task(TASK_LZ_OAPP_ENFORCED_OPTIONS_GET, 'Outputs table of OApp enforced options using layerzero.config')
    .addParam('oappConfig', 'Path to your LayerZero OApp config', './layerzero.config.js', types.string)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)
    .setAction(enforcedOptionsGet)

/**
 * Updates the enforced options object based on the provided encoded enforced options.
 * @param enforcedOpts - The enforced options object to update.
 * @param option - The encoded enforced options that needs to be decoded to extract enforced options.
 * @returns The updated enforced options object.
 */
function updateEnforcedOptsFromOptions(enforcedOpts, option) {
    const fromOptions = Options.fromOptions(option.options)
    const lzReceiveOption = fromOptions.decodeExecutorLzReceiveOption()
    const lzNativeDropOption = fromOptions.decodeExecutorNativeDropOption()
    const lzComposeOption = fromOptions.decodeExecutorComposeOption()
    const lzOrderedExecutionOption = fromOptions.decodeExecutorOrderedExecutionOption()

    enforcedOpts = {
        ...enforcedOpts,
        ...(lzReceiveOption ? { lzReceiveOption } : {}),
        ...updateEnforcedOpts(enforcedOpts, 'lzNativeDropOption', lzNativeDropOption),
        ...updateEnforcedOpts(enforcedOpts, 'lzComposeOption', lzComposeOption),
        ...(lzOrderedExecutionOption ? { lzOrderedExecutionOption } : {}),
    }

    return enforcedOpts
}

/**
 * Updates the enforced options for better readability.
 * @param enforcedOpts - The enforced options object to update.
 * @param optionName - The name of the option to update.
 * @param optionValue - The value of the option to update.
 * @returns The updated enforced options object.
 */
function updateEnforcedOpts(enforcedOpts, optionName, optionValue) {
    if (optionValue && optionValue.length === 1) {
        // If the option value is defined and has length 1, pop from array and keep as object
        return { ...enforcedOpts, [optionName]: optionValue.pop() }
    } else if (optionValue && optionValue.length > 1) {
        // If the option value exists and has length greater than 1, keep it as an array
        return { ...enforcedOpts, [optionName]: [...(enforcedOpts[optionName] || []), ...optionValue] }
    } else {
        // If the option value is not defined or has length 0, return the original enforcedOpts
        return enforcedOpts
    }
}
