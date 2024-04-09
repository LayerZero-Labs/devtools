import { Configurator, OmniTransaction, UIntBigIntSchema, flattenTransactions } from '@layerzerolabs/devtools'
import { BigNumberishBigIntSchema } from '@layerzerolabs/devtools-evm'
import {
    createOmniEdgeHardhatSchema,
    createOmniGraphHardhatSchema,
    createOmniNodeHardhatSchema,
    type OmniGraphHardhat,
    type InferOmniGraph,
} from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import {
    configureOApp,
    OAppEdgeConfigSchema,
    OAppNodeConfigSchema,
    type OAppEdgeConfig,
    type OAppNodeConfig,
} from '@layerzerolabs/ua-devtools'
import { OApp } from '@layerzerolabs/ua-devtools-evm'

//   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
//  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
// `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
//
//                    Types & interfaces
//
//   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
//  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
// `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'

export interface MyCustomNodeConfig extends OAppNodeConfig {
    customProperty: bigint
}

export type MyCustomOmniGraphHardhat = OmniGraphHardhat<MyCustomNodeConfig, OAppEdgeConfig | undefined>

export type MyCustomOmniGraph = InferOmniGraph<MyCustomOmniGraphHardhat>

export type MyCustomOAppConfigurator = Configurator<MyCustomOmniGraph, MyCustomOAppSDK>

//   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
//  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
// `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
//
//                      Input validation
//
//   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
//  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
// `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'

const MyCustomNodeConfigSchema = OAppNodeConfigSchema.extend({
    customProperty: UIntBigIntSchema,
})

export const MyCustomOmniGraphHardhatSchema: Zod.ZodSchema<MyCustomOmniGraphHardhat> = createOmniGraphHardhatSchema(
    createOmniNodeHardhatSchema(MyCustomNodeConfigSchema),
    createOmniEdgeHardhatSchema(OAppEdgeConfigSchema.optional())
)

//   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
//  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
// `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
//
//                           SDKs
//
//   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
//  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
// `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'

export class MyCustomOAppSDK extends OApp {
    async getCustomProperty(): Promise<bigint> {
        return BigNumberishBigIntSchema.parse(await this.contract.contract.getCustomProperty())
    }

    async setCustomProperty(value: bigint): Promise<OmniTransaction> {
        return {
            ...this.createTransaction(
                this.contract.contract.interface.encodeFunctionData('setCustomProperty', [value])
            ),
            description: `Setting custom property for ${this.label} to ${value}`,
        }
    }
}

//   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
//  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
// `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
//
//                    Configuration functions
//
//   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
//  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
// `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'

const configureCustomProperty: MyCustomOAppConfigurator = async (graph, createSdk) =>
    flattenTransactions(
        await Promise.all(
            graph.contracts.map(async ({ point, config }) => {
                const sdk = await createSdk(point)

                const value = await sdk.getCustomProperty()
                if (value === config.customProperty) {
                    return []
                }

                return [await sdk.setCustomProperty(config.customProperty)]
            })
        )
    )

export const myCustomOAppConfigurator: MyCustomOAppConfigurator = async (graph, createSdk) =>
    flattenTransactions([
        ...(await configureOApp(graph, createSdk)),
        ...(await configureCustomProperty(graph, createSdk)),
    ])

//   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
//  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
// `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'
//
//                        Config itself
//
//   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-.   .-.-
//  / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \ \ / / \
// `-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'   `-`-'

const ethContract = {
    eid: EndpointId.ETHEREUM_V2_MAINNET,
    contractName: 'CustomOApp',
}

const avaxContract = {
    eid: EndpointId.AVALANCHE_V2_MAINNET,
    contractName: 'CustomOApp',
}

const config: MyCustomOmniGraphHardhat = {
    contracts: [
        {
            contract: avaxContract,
            config: {
                customProperty: BigInt(1000),
            },
        },
        {
            contract: ethContract,
            config: {
                customProperty: BigInt(2000),
            },
        },
    ],
    connections: [
        {
            from: avaxContract,
            to: ethContract,
        },
        {
            from: ethContract,
            to: avaxContract,
        },
    ],
}

export default config
