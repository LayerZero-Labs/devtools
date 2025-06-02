import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { EndpointId } from '@layerzerolabs/lz-definitions'
import { OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import {
    OAppOmniGraphHardhatSchema,
    SUBTASK_LZ_OAPP_CONFIG_LOAD,
    type SubtaskLoadConfigTaskArgs,
    TASK_LZ_OAPP_CONFIG_GET,
} from '@layerzerolabs/ua-devtools-evm-hardhat'

/**
 * Find the Tron endpoint ID in the OApp graph
 * @param hre {HardhatRuntimeEnvironment} Hardhat runtime environment
 * @param oappConfig {string} Path to the OApp config file
 */
export const findTronEndpointIdInGraph = async (
    hre: HardhatRuntimeEnvironment,
    oappConfig: string
): Promise<EndpointId> => {
    if (!oappConfig) throw new Error('Missing oappConfig')

    let graph: OAppOmniGraph
    try {
        graph = await hre.run(SUBTASK_LZ_OAPP_CONFIG_LOAD, {
            configPath: oappConfig,
            schema: OAppOmniGraphHardhatSchema,
            task: TASK_LZ_OAPP_CONFIG_GET,
        } satisfies SubtaskLoadConfigTaskArgs)
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to load OApp configuration: ${error.message}`)
        } else {
            throw new Error('Failed to load OApp configuration: Unknown error')
        }
    }

    let tronEid: EndpointId | null = null

    const checkTronEndpoint = (eid: EndpointId) => {
        if (eid === EndpointId.TRON_V2_MAINNET || eid === EndpointId.TRON_V2_TESTNET) {
            if (tronEid && tronEid !== eid) {
                throw new Error(`Multiple Tron Endpoint IDs found: ${tronEid}, ${eid}`)
            }
            tronEid = eid
        }
    }

    for (const { vector } of graph.connections) {
        checkTronEndpoint(vector.from.eid)
        checkTronEndpoint(vector.to.eid)
        if (tronEid) return tronEid
    }

    throw new Error('No Tron Endpoint ID found. Ensure your OApp configuration includes a valid Tron endpoint.')
}
