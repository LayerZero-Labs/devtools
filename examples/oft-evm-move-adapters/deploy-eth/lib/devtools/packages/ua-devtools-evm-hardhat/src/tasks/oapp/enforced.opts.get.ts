import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import { printCrossTable, printRecord, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { SUBTASK_LZ_OAPP_CONFIG_LOAD, TASK_LZ_OAPP_ENFORCED_OPTS_GET } from '@/constants/tasks'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import { EncodedOption, OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { createConnectedContractFactory, types } from '@layerzerolabs/devtools-evm-hardhat'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import { checkOAppEnforcedOptions } from '@layerzerolabs/ua-devtools'
import { getNetworkNameForEid } from '@layerzerolabs/devtools-evm-hardhat'
import { areVectorsEqual, isZero } from '@layerzerolabs/devtools'
import { Options } from '@layerzerolabs/lz-v2-utilities'
import { OAppOmniGraphHardhatSchema } from '@/oapp/schema'
import type { SubtaskLoadConfigTaskArgs } from '@/tasks/oapp/types'

interface TaskArgs {
    oappConfig: string
    logLevel?: string
}

const action: ActionType<TaskArgs> = async ({ oappConfig: oappConfigPath, logLevel = 'info' }, hre) => {
    printLogo()

    // We'll set the global logging level to get as much info as needed
    setDefaultLogLevel(logLevel)

    const graph: OAppOmniGraph = await hre.run(SUBTASK_LZ_OAPP_CONFIG_LOAD, {
        configPath: oappConfigPath,
        schema: OAppOmniGraphHardhatSchema,
        task: TASK_LZ_OAPP_ENFORCED_OPTS_GET,
    } satisfies SubtaskLoadConfigTaskArgs)

    // need points for OApp Enforced Option Matrix
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
        const enforcedOptsNetworkMatrix = points.map((row) => {
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
                 * update the row with a key-value pair indicating the enforced option for the current column
                 */
                const enforcedOptsByMsgType: Record<string, unknown> = {}
                if (connection?.enforcedOptions) {
                    connection.enforcedOptions.forEach((encodedEnforcedOpts) => {
                        if (!isZero(encodedEnforcedOpts.options)) {
                            enforcedOptsByMsgType['msgType: ' + encodedEnforcedOpts.msgType] =
                                decodeEnforcedOptions(encodedEnforcedOpts)
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

        console.log(
            printCrossTable(enforcedOptsNetworkMatrix, ['from → to', ...points.map(({ networkName }) => networkName)])
        )

        return enforcedOptions
    } catch (error) {
        throw new Error(`An error occurred while getting the OApp configuration: ${error}`)
    }
}

task(TASK_LZ_OAPP_ENFORCED_OPTS_GET, 'Outputs OApp enforced options', action)
    .addParam('oappConfig', 'Path to your LayerZero OApp config', undefined, types.string)
    .addParam('logLevel', 'Logging level. One of: error, warn, info, verbose, debug, silly', 'info', types.logLevel)

/**
 * Decodes enforced options from the provided encoded enforced options.
 * @param {EncodedOption} option - The encoded options.
 * @returns {Record<string, unknown>} - The decoded enforced options.
 */
function decodeEnforcedOptions(option: EncodedOption): Record<string, unknown> {
    const fromOptions = Options.fromOptions(option.options)
    const lzReceiveOption = fromOptions.decodeExecutorLzReceiveOption()
    const lzNativeDropOption = fromOptions.decodeExecutorNativeDropOption()
    const lzComposeOption = fromOptions.decodeExecutorComposeOption()
    const lzOrderedExecutionOption = fromOptions.decodeExecutorOrderedExecutionOption()

    return {
        ...(lzReceiveOption ? { lzReceiveOption } : {}),
        ...(lzNativeDropOption.length ? { lzNativeDropOption: headOrEverything(lzNativeDropOption) } : {}),
        ...(lzComposeOption.length ? { lzComposeOption: headOrEverything(lzComposeOption) } : {}),
        ...(lzOrderedExecutionOption ? { lzOrderedExecutionOption } : {}),
    }
}

/**
 *  This is used for better readability in print tables
 *  If array has length 1, pop from array and return the object
 *  Else return the array
 */
const headOrEverything = <T>(array: T[]): T | T[] => (array.length === 1 ? array[0]! : array)
