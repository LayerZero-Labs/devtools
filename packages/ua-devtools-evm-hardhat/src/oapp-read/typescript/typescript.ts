import { ExportAssignment, factory, Identifier, NodeArray, PropertyAssignment, Statement } from 'typescript'
import { OmniAddress } from '@layerzerolabs/devtools'
import { getReadConfig } from '@/utils/taskHelpers'
import { UlnReadUlnConfig } from '@layerzerolabs/protocol-devtools'
import {
    CONFIG,
    CONNECTIONS,
    CONTRACT,
    CONTRACTS,
    EXECUTOR,
    FROM,
    OPTIONAL_DVN_THRESHOLD,
    OPTIONAL_DVNS,
    REQUIRED_DVNS,
    TO,
    ULN_CONFIG,
} from '@/oapp/typescript/constants'
import {
    createContractVariables,
    createDefaultConfig,
    createEndpointImportDeclaration,
    normalizeIdentifierName,
} from '@/oapp/typescript/typescript'
import { CHANNEL_ID, READ_CHANNEL_CONFIGS, READ_LIBRARY } from '@/oapp-read/typescript/constants'
import {
    createOmniPointHardhatTransformer,
    createProviderFactory,
    getEidForNetworkName,
} from '@layerzerolabs/devtools-evm-hardhat'
import { createEndpointV2Factory } from '@layerzerolabs/protocol-devtools-evm'

/**
 * Creates the contracts and connections configurations for OAppRead.
 *
 * @param {Map<string, Identifier>} contractMap A map containing network names as keys and corresponding contract identifiers as values.
 * @returns {Promise<ExportAssignment>} A promise that resolves to an ExportAssignment object representing the created contracts and connections.
 *
 *      export default {
 *         contracts: [
 *              {
 *                contract: firstContract,
 *                config: {
 *                    ...configs
 *                }
 *              },
 *              {
 *                contract: secondContract,
 *                config: {
 *                    ...configs
 *                }
 *              }
 *          ],
 *         connections: [
 *             {
 *                from: firstContract,
 *                to: secondContract,
 *                config:{
 *                    ...configs
 *                }
 *             },
 *             {
 *                from: secondContract,
 *                to: firstContract,
 *                config:{
 *                    ...configs
 *                }
 *             }
 *         ]
 *      };
 */
export const createReadContractsAndConnections = async (
    contractMap: Map<string, Identifier>
): Promise<ExportAssignment> => {
    let contractsArrayLiteral = factory.createArrayLiteralExpression([])
    let connectionsArrayLiteral = factory.createArrayLiteralExpression([])

    for (const [fromNetwork, fromContract] of contractMap) {
        const contractDefaultConfig = await createReadDefaultConfig(fromNetwork)

        contractsArrayLiteral = factory.createArrayLiteralExpression([
            ...contractsArrayLiteral.elements,
            factory.createObjectLiteralExpression([
                factory.createPropertyAssignment(factory.createIdentifier(CONTRACT.toLowerCase()), fromContract),
                contractDefaultConfig,
            ]),
        ])

        // This is the same as OApp
        const connections = await Promise.all(
            Array.from(contractMap)
                .filter(([toNetwork]) => fromNetwork !== toNetwork)
                .map(([toNetwork, toContract]) =>
                    createDefaultConfig(fromNetwork, toNetwork).then((defaultConfig) =>
                        factory.createObjectLiteralExpression([
                            factory.createPropertyAssignment(factory.createIdentifier(FROM), fromContract),
                            factory.createPropertyAssignment(factory.createIdentifier(TO), toContract),
                            defaultConfig,
                        ])
                    )
                )
        )

        connectionsArrayLiteral = factory.createArrayLiteralExpression([
            ...connectionsArrayLiteral.elements,
            ...connections,
        ])
    }

    return factory.createExportAssignment(
        /* modifiers */ undefined,
        /* isExportEquals */ false,
        factory.createObjectLiteralExpression([
            factory.createPropertyAssignment(CONTRACTS, contractsArrayLiteral),
            factory.createPropertyAssignment(CONNECTIONS, connectionsArrayLiteral),
        ])
    )
}

/**
 * Creates a read library configuration.
 *
 * @param {string} defaultReadLibrary The default read library.
 * @returns {PropertyAssignment} A PropertyAssignment object representing the read library configuration.
 *
 *      readLibrary: "0x0000000000000000000000000000000000000000"
 */
export const createReadLibraryConfig = (defaultReadLibrary: string): PropertyAssignment => {
    return factory.createPropertyAssignment(
        factory.createIdentifier(READ_LIBRARY),
        factory.createStringLiteral(defaultReadLibrary)
    )
}

/**
 * Creates a Read ULN configuration object.
 *
 * @param {object} ulnConfig The ULN configuration parameters.
 * @param {string} ulnConfig.executor An executor address.
 * @param {string[]} ulnConfig.requiredDVNs An array of required DVNs.
 * @param {string[]} ulnConfig.optionalDVNs An array of optional DVNs.
 * @param {number} ulnConfig.optionalDVNThreshold The threshold for optional DVNs.
 * @returns {PropertyAssignment} A PropertyAssignment representing the ULN configuration.
 *
 *     ulnConfig: {
 *       executor: "0x0000000000000000000000000000000000000000",
 *       requiredDVNs: [],
 *       optionalDVNs: [
 *         "0x0000000000000000000000000000000000000000",
 *         "0x0000000000000000000000000000000000000000",
 *       ],
 *       optionalDVNThreshold: 0,
 *     }
 */
export const createReadUlnConfig = ({
    executor,
    requiredDVNs,
    optionalDVNs,
    optionalDVNThreshold,
}: UlnReadUlnConfig): PropertyAssignment => {
    return factory.createPropertyAssignment(
        factory.createIdentifier(ULN_CONFIG),
        factory.createObjectLiteralExpression([
            factory.createPropertyAssignment(factory.createIdentifier(EXECUTOR), factory.createStringLiteral(executor)),
            factory.createPropertyAssignment(
                factory.createIdentifier(REQUIRED_DVNS),
                factory.createArrayLiteralExpression(
                    requiredDVNs.filter((dvn) => dvn != null).map((dvn) => factory.createStringLiteral(dvn))
                )
            ),
            factory.createPropertyAssignment(
                factory.createIdentifier(OPTIONAL_DVNS),
                factory.createArrayLiteralExpression(
                    optionalDVNs.filter((dvn) => dvn != null).map((dvn) => factory.createStringLiteral(dvn))
                )
            ),
            factory.createPropertyAssignment(
                factory.createIdentifier(OPTIONAL_DVN_THRESHOLD),
                factory.createNumericLiteral(optionalDVNThreshold)
            ),
        ])
    )
}

export const createReadChannelConfigs = (
    fromNetwork: string,
    readDefaultConfigs: [OmniAddress, UlnReadUlnConfig, number][] | undefined
): PropertyAssignment => {
    const readChannelConfigs = readDefaultConfigs?.map(([readLibrary, ulnConfig, channelId]) => {
        if (readLibrary == null) {
            throw new Error(
                `An error occurred while generating LayerZero Config: No Default Read Library for network ${fromNetwork}`
            )
        } else if (ulnConfig == null) {
            throw new Error(
                `An error occurred while generating LayerZero Config: No Default Read ULN Config for network ${fromNetwork}`
            )
        } else if (channelId == null) {
            throw new Error(
                `An error occurred while generating LayerZero Config: No Default Channel Id for pathway ${fromNetwork}`
            )
        }
        return factory.createObjectLiteralExpression([
            factory.createPropertyAssignment(
                factory.createIdentifier(CHANNEL_ID),
                factory.createNumericLiteral(channelId)
            ),
            createReadLibraryConfig(readLibrary),
            createReadUlnConfig(ulnConfig),
        ])
    })

    return factory.createPropertyAssignment(
        factory.createIdentifier(READ_CHANNEL_CONFIGS),
        factory.createArrayLiteralExpression(readChannelConfigs)
    )
}

export const createReadDefaultConfig = async (fromNetwork: string): Promise<PropertyAssignment> => {
    let readDefaultConfigs: [OmniAddress, UlnReadUlnConfig, number][] | undefined

    const pointTransformer = createOmniPointHardhatTransformer()
    const endpointV2Factory = createEndpointV2Factory(createProviderFactory())
    const fromEid = getEidForNetworkName(fromNetwork)
    const endpointV2OmniPoint = await pointTransformer({ eid: fromEid, contractName: 'EndpointV2' })
    const endpointV2Sdk = await endpointV2Factory(endpointV2OmniPoint)
    try {
        readDefaultConfigs = await getReadConfig(endpointV2Sdk)
    } catch (error) {
        console.error('Failed to get read default configs:', error)
    }

    return factory.createPropertyAssignment(
        factory.createIdentifier(CONFIG),
        factory.createObjectLiteralExpression([createReadChannelConfigs(fromNetwork, readDefaultConfigs)])
    )
}

/**
 * Generates a default LayerZero configuration for the selected networks and contract for an OAppRead.
 *
 * @param {string[]} selectedNetworks An array of network names.
 * @param {string} contractName The name of the contract.
 * @returns {Promise<NodeArray<Statement>>} A promise that resolves to a NodeArray containing generated LayerZero configuration statements.
 */
export const generateReadLzConfig = async (
    selectedNetworks: string[],
    contractName: string
): Promise<NodeArray<Statement>> =>
    factory.createNodeArray([
        createEndpointImportDeclaration(),
        ...createContractVariables(selectedNetworks, contractName),
        await createReadContractsAndConnections(
            new Map(
                selectedNetworks.map((network) => [
                    network,
                    factory.createIdentifier(normalizeIdentifierName(network) + CONTRACT),
                ])
            )
        ),
    ])
