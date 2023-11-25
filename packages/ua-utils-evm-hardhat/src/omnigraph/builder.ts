import 'hardhat-deploy/dist/src/type-extensions'
import type { HardhatRuntimeEnvironment } from 'hardhat/types'
import { OmniGraphBuilder } from '@layerzerolabs/ua-utils'
import { createNetworkLogger, getNetworkRuntimeEnvironment } from '@layerzerolabs/utils-evm-hardhat'
import { contractNameToPoint } from './coordinates'
import { vectorFromNodes } from '@layerzerolabs/ua-utils'
import { ignoreLoopback } from '@layerzerolabs/ua-utils'

export class OmniGraphBuilderHardhat<TNodeConfig, TEdgeConfig> extends OmniGraphBuilder<TNodeConfig, TEdgeConfig> {
    static async fromDeployedContract(
        hre: HardhatRuntimeEnvironment,
        contractName: string
    ): Promise<OmniGraphBuilder<undefined, undefined>> {
        const builder = new OmniGraphBuilder<undefined, undefined>()

        for (const networkName of Object.keys(hre.config.networks)) {
            const logger = createNetworkLogger(networkName)
            const env = await getNetworkRuntimeEnvironment(networkName)
            const point = await contractNameToPoint(env, contractName)

            if (point == null) {
                logger.warn(`Could not find contract '${contractName}'`)
                logger.warn(``)
                logger.warn(`- Make sure the contract has been deployed`)
                logger.warn(`- Make sure to include the endpointId in your hardhat networks config`)

                continue
            }

            builder.addNodes({ point, config: undefined })
        }

        return builder.reconnect(
            ignoreLoopback((from, to) => ({
                vector: vectorFromNodes(from, to),
                config: undefined,
            }))
        )
    }
}
