import {
    ExportAssignment,
    factory,
    Identifier,
    ImportDeclaration,
    NodeArray,
    NodeFlags,
    ObjectLiteralExpression,
    PropertyAssignment,
    Statement,
    VariableStatement,
} from 'typescript'
import { formatEid, OmniAddress } from '@layerzerolabs/devtools'
import {
    createOmniPointHardhatTransformer,
    createProviderFactory,
    getEidForNetworkName,
} from '@layerzerolabs/devtools-evm-hardhat'
import { getReceiveConfig, getSendConfig } from '@/utils/taskHelpers'
import { Timeout, Uln302ExecutorConfig, Uln302UlnConfig } from '@layerzerolabs/protocol-devtools'
import {
    CONFIG,
    CONFIRMATIONS,
    CONNECTIONS,
    CONTRACT,
    CONTRACT_NAME,
    CONTRACTS,
    EID,
    ENDPOINT_ID,
    EXECUTOR,
    EXECUTOR_CONFIG,
    FROM,
    GRACE_PERIOD,
    LAYERZERO_LABS_LZ_DEFINITIONS,
    MAX_MESSAGE_SIZE,
    OPTIONAL_DVN_THRESHOLD,
    OPTIONAL_DVNS,
    RECEIVE_CONFIG,
    RECEIVE_LIBRARY,
    RECEIVE_LIBRARY_CONFIG,
    REQUIRED_DVNS,
    SEND_CONFIG,
    SEND_LIBRARY,
    TO,
    ULN_CONFIG,
    ZERO,
} from '@/oapp/typescript/constants'
import { createEndpointV2Factory } from '@layerzerolabs/protocol-devtools-evm'

/**
 * Normalizes the identifier name by replacing hyphens with underscores.
 *
 * @param {string} name The input string to normalize.
 * @returns {string} The normalized identifier name.
 */
export const normalizeIdentifierName = (name: string): string => name.replaceAll('-', '_')

/**
 * Creates an import declaration for the `ENDPOINT_ID` constant from the '@layerzerolabs/lz-definitions' module.
 *
 * @returns {ImportDeclaration} An ImportDeclaration representing the import statement for `ENDPOINT_ID`.
 *
 *      import { EndpointId } from "@layerzerolabs/lz-definitions";
 */
export const createEndpointImportDeclaration = (): ImportDeclaration =>
    factory.createImportDeclaration(
        undefined,
        factory.createImportClause(
            false,
            undefined,
            factory.createNamedImports([
                factory.createImportSpecifier(false, undefined, factory.createIdentifier(ENDPOINT_ID)),
            ])
        ),
        factory.createStringLiteral(LAYERZERO_LABS_LZ_DEFINITIONS),
        undefined
    )

/**
 * Creates contract variables for the selected networks and contract name.
 *
 * @param {string[]} selectedNetworks An array of network names.
 * @param {string} contractName The name of the contract.
 * @returns {VariableStatement[]} An array of VariableStatement objects representing the created contract variables.
 *
 *      const networkContract = {
 *          eid: EndpointId.NETWORK_V2_TESTNET,
 *          contractName: "MyContractName"
 *      };
 */
export const createContractVariables = (selectedNetworks: string[], contractName: string): VariableStatement[] =>
    selectedNetworks.map((network) => {
        return factory.createVariableStatement(
            undefined,
            factory.createVariableDeclarationList(
                [
                    factory.createVariableDeclaration(
                        factory.createIdentifier(normalizeIdentifierName(network) + CONTRACT),
                        undefined,
                        undefined,
                        factory.createObjectLiteralExpression(
                            [
                                factory.createPropertyAssignment(
                                    factory.createIdentifier(EID),
                                    factory.createPropertyAccessExpression(
                                        factory.createIdentifier(ENDPOINT_ID),
                                        factory.createIdentifier(formatEid(getEidForNetworkName(network)))
                                    )
                                ),
                                factory.createPropertyAssignment(
                                    factory.createIdentifier(CONTRACT_NAME),
                                    factory.createStringLiteral(contractName)
                                ),
                            ],
                            true
                        )
                    ),
                ],
                NodeFlags.Const
            )
        )
    })

/**
 * Creates the contracts and connections configurations.
 *
 * @param {Map<string, Identifier>} contractMap A map containing network names as keys and corresponding contract identifiers as values.
 * @returns {Promise<ExportAssignment>} A promise that resolves to an ExportAssignment object representing the created contracts and connections.
 *
 *      export default {
 *         contracts: [
 *              {
 *                contract: firstContract
 *              },
 *              {
 *                contract: secondContract
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
export const createContractsAndConnections = async (
    contractMap: Map<string, Identifier>
): Promise<ExportAssignment> => {
    let contractsArrayLiteral = factory.createArrayLiteralExpression([])
    let connectionsArrayLiteral = factory.createArrayLiteralExpression([])

    for (const [fromNetwork, fromContract] of contractMap) {
        contractsArrayLiteral = factory.createArrayLiteralExpression([
            ...contractsArrayLiteral.elements,
            factory.createObjectLiteralExpression([
                factory.createPropertyAssignment(factory.createIdentifier(CONTRACT.toLowerCase()), fromContract),
            ]),
        ])

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
 * Creates a send library configuration.
 *
 * @param {string} sendDefaultLibrary The default send library.
 * @returns {PropertyAssignment} A PropertyAssignment object representing the send library configuration.
 *
 *      sendLibrary: "0x0000000000000000000000000000000000000000"
 */
export const createSendLibraryConfig = (sendDefaultLibrary: string): PropertyAssignment => {
    return factory.createPropertyAssignment(
        factory.createIdentifier(SEND_LIBRARY),
        factory.createStringLiteral(sendDefaultLibrary)
    )
}

/**
 * Creates a receive library configuration object.
 *
 * @param {string} receiveDefaultLibrary The default receive library.
 * @returns {PropertyAssignment} A PropertyAssignment object representing the receive library configuration.
 *
 *      receiveLibraryConfig: {
 *        receiveLibrary: "0x0000000000000000000000000000000000000000",
 *        gracePeriod: BigInt(0),
 *      }
 */
export const createReceiveLibraryConfig = (receiveDefaultLibrary: string): PropertyAssignment => {
    return factory.createPropertyAssignment(
        factory.createIdentifier(RECEIVE_LIBRARY_CONFIG),
        factory.createObjectLiteralExpression([
            factory.createPropertyAssignment(
                factory.createIdentifier(RECEIVE_LIBRARY),
                factory.createStringLiteral(receiveDefaultLibrary)
            ),
            factory.createPropertyAssignment(factory.createIdentifier(GRACE_PERIOD), factory.createBigIntLiteral(ZERO)),
        ])
    )
}

/**
 * Creates an executor configuration object.
 *
 * @param {object} executorConfig The executor configuration parameters.
 * @param {number} executorConfig.maxMessageSize The maximum message size.
 * @param {string} executorConfig.executor The executor string.
 * @returns {ObjectLiteralExpression} An ObjectLiteralExpression representing the executor configuration.
 *
 *     executorConfig: {
 *       maxMessageSize: 0,
 *       executor: "0x0000000000000000000000000000000000000000",
 *     }
 */
export const creatExecutorConfig = ({ maxMessageSize, executor }: Uln302ExecutorConfig): ObjectLiteralExpression => {
    return factory.createObjectLiteralExpression([
        factory.createPropertyAssignment(
            factory.createIdentifier(MAX_MESSAGE_SIZE),
            factory.createNumericLiteral(maxMessageSize)
        ),
        factory.createPropertyAssignment(factory.createIdentifier(EXECUTOR), factory.createStringLiteral(executor)),
    ])
}

/**
 * Creates a ULN configuration object.
 *
 * @param {object} ulnConfig The ULN configuration parameters.
 * @param {bigint} ulnConfig.confirmations The number of confirmations.
 * @param {string[]} ulnConfig.requiredDVNs An array of required DVNs.
 * @param {string[]} ulnConfig.optionalDVNs An array of optional DVNs.
 * @param {number} ulnConfig.optionalDVNThreshold The threshold for optional DVNs.
 * @returns {ObjectLiteralExpression} An ObjectLiteralExpression representing the ULN configuration.
 *
 *     ulnConfig: {
 *       confirmations: BigInt(0),
 *       requiredDVNs: [],
 *       optionalDVNs: [
 *         "0x0000000000000000000000000000000000000000",
 *         "0x0000000000000000000000000000000000000000",
 *       ],
 *       optionalDVNThreshold: 0,
 *     }
 */
export const creatUlnConfig = ({
    confirmations,
    requiredDVNs,
    optionalDVNs,
    optionalDVNThreshold,
}: Uln302UlnConfig): ObjectLiteralExpression => {
    return factory.createObjectLiteralExpression([
        factory.createPropertyAssignment(
            factory.createIdentifier(CONFIRMATIONS),
            factory.createBigIntLiteral(confirmations.toString())
        ),
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
}

/**
 * Creates a send configuration object.
 *
 * @param {Uln302ExecutorConfig} sendDefaultExecutorConfig The default executor configuration.
 * @param {Uln302UlnConfig} sendDefaultUlnConfig The default ULN configuration.
 * @returns {PropertyAssignment} A PropertyAssignment object representing the send configuration.
 *
 *     sendConfig: {
 *       executorConfig: {},
 *       ulnConfig: {},
 *     }
 */
export const createSendConfig = (
    sendDefaultExecutorConfig: Uln302ExecutorConfig,
    sendDefaultUlnConfig: Uln302UlnConfig
): PropertyAssignment => {
    return factory.createPropertyAssignment(
        factory.createIdentifier(SEND_CONFIG),
        factory.createObjectLiteralExpression([
            factory.createPropertyAssignment(
                factory.createIdentifier(EXECUTOR_CONFIG),
                creatExecutorConfig(sendDefaultExecutorConfig)
            ),
            factory.createPropertyAssignment(
                factory.createIdentifier(ULN_CONFIG),
                creatUlnConfig(sendDefaultUlnConfig)
            ),
        ])
    )
}

/**
 * Creates a receive configuration object.
 *
 * @param {Uln302UlnConfig} receiveDefaultUlnConfig The default ULN configuration.
 * @returns {PropertyAssignment} A PropertyAssignment object representing the receive configuration.
 *
 *     receiveConfig: {
 *       ulnConfig: {}
 *     }
 */
export const creatReceiveConfig = (receiveDefaultUlnConfig: Uln302UlnConfig): PropertyAssignment => {
    return factory.createPropertyAssignment(
        factory.createIdentifier(RECEIVE_CONFIG),
        factory.createObjectLiteralExpression([
            factory.createPropertyAssignment(
                factory.createIdentifier(ULN_CONFIG),
                creatUlnConfig(receiveDefaultUlnConfig)
            ),
        ])
    )
}

/**
 * Creates a default LayerZero configuration from the passed in networks by reading current defaults off-chain.
 *
 * @param {string} fromNetwork The source network.
 * @param {string} toNetwork The destination network.
 * @returns {Promise<PropertyAssignment>} A promise that resolves to a PropertyAssignment object representing the default configuration.
 * @throws {Error} Throws an error if any required default configuration is missing.
 *
 *         config: {
 *              sendLibrary: "0x0000000000000000000000000000000000000000",
 *              receiveLibraryConfig: {...},
 *              receiveLibraryTimeoutConfig: {...},
 *              sendConfig: {...},
 *              receiveConfig: {...}
 *         }
 */
export const createDefaultConfig = async (fromNetwork: string, toNetwork: string): Promise<PropertyAssignment> => {
    let sendDefaultConfig: [OmniAddress, Uln302UlnConfig, Uln302ExecutorConfig] | undefined
    let receiveDefaultConfig: [OmniAddress, Uln302UlnConfig, Timeout] | undefined

    const pointTransformer = createOmniPointHardhatTransformer()
    const endpointV2Factory = createEndpointV2Factory(createProviderFactory())

    const fromEid = getEidForNetworkName(fromNetwork)
    const endpointV2OmniPoint = await pointTransformer({ eid: fromEid, contractName: 'EndpointV2' })
    const endpointV2Sdk = await endpointV2Factory(endpointV2OmniPoint)
    const toEid = getEidForNetworkName(toNetwork)

    try {
        ;[sendDefaultConfig, receiveDefaultConfig] = await Promise.all([
            getSendConfig(endpointV2Sdk, toEid),
            getReceiveConfig(endpointV2Sdk, toEid),
        ])
    } catch (error) {
        console.error('Failed to get send and receive default configs:', error)
    }

    const [sendDefaultLibrary, sendDefaultUlnConfig, sendDefaultExecutorConfig] = sendDefaultConfig ?? []
    const [receiveDefaultLibrary, receiveDefaultUlnConfig] = receiveDefaultConfig ?? []

    if (sendDefaultLibrary == null) {
        throw new Error(
            `An error occurred while generating LayerZero Config: No Default Send Library for pathway ${fromNetwork} → ${toNetwork}`
        )
    } else if (sendDefaultExecutorConfig == null) {
        throw new Error(
            `An error occurred while generating LayerZero Config: No Default Executor Config for pathway ${fromNetwork} → ${toNetwork}`
        )
    } else if (sendDefaultUlnConfig == null) {
        throw new Error(
            `An error occurred while generating LayerZero Config: No Default Send ULN Config for pathway ${fromNetwork} → ${toNetwork}`
        )
    } else if (receiveDefaultLibrary == null) {
        throw new Error(
            `An error occurred while generating LayerZero Config: No Default Receive Library for pathway ${fromNetwork} → ${toNetwork}`
        )
    } else if (receiveDefaultUlnConfig == null) {
        throw new Error(
            `An error occurred while generating LayerZero Config: No Default Receive ULN Config for pathway ${fromNetwork} → ${toNetwork}`
        )
    }

    return factory.createPropertyAssignment(
        factory.createIdentifier(CONFIG),
        factory.createObjectLiteralExpression([
            createSendLibraryConfig(sendDefaultLibrary),
            createReceiveLibraryConfig(receiveDefaultLibrary),
            createSendConfig(sendDefaultExecutorConfig, sendDefaultUlnConfig),
            creatReceiveConfig(receiveDefaultUlnConfig),
        ])
    )
}

/**
 * Generates a default LayerZero configuration for the selected networks and contract.
 *
 * @param {string[]} selectedNetworks An array of network names.
 * @param {string} contractName The name of the contract.
 * @returns {Promise<NodeArray<Statement>>} A promise that resolves to a NodeArray containing generated LayerZero configuration statements.
 */
export const generateLzConfig = async (
    selectedNetworks: string[],
    contractName: string
): Promise<NodeArray<Statement>> =>
    factory.createNodeArray([
        createEndpointImportDeclaration(),
        ...createContractVariables(selectedNetworks, contractName),
        await createContractsAndConnections(
            new Map(
                selectedNetworks.map((network) => [
                    network,
                    factory.createIdentifier(normalizeIdentifierName(network) + CONTRACT),
                ])
            )
        ),
    ])
