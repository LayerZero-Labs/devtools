import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { ChainType, EndpointId, endpointIdToChainType } from '@layerzerolabs/lz-definitions'
import { OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import {
    OAppOmniGraphHardhatSchema,
    SUBTASK_LZ_OAPP_CONFIG_LOAD,
    SubtaskLoadConfigTaskArgs,
    TASK_LZ_OAPP_CONFIG_GET,
} from '@layerzerolabs/ua-devtools-evm-hardhat'

export const findSolanaEndpointIdInGraph = async (
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

    let solanaEid: EndpointId | null = null

    const checkSolanaEndpoint = (eid: EndpointId) => {
        if (endpointIdToChainType(eid) === ChainType.SOLANA) {
            if (solanaEid && solanaEid !== eid) {
                throw new Error(`Multiple Solana Endpoint IDs found: ${solanaEid}, ${eid}`)
            }
            solanaEid = eid
        }
    }

    for (const { vector } of graph.connections) {
        checkSolanaEndpoint(vector.from.eid)
        checkSolanaEndpoint(vector.to.eid)
        if (solanaEid) return solanaEid
    }

    throw new Error('No Solana Endpoint ID found. Ensure your OApp configuration includes a valid Solana endpoint.')
}
