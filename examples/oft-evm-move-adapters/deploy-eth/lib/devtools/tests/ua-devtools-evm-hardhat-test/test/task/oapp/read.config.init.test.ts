import hre from 'hardhat'
import {
    TASK_LZ_OAPP_CONFIG_GET_DEFAULT,
    TASK_LZ_OAPP_READ_WIRE,
    TASK_LZ_OAPP_READ_CONFIG_GET_CHANNEL,
    TASK_LZ_OAPP_READ_CONFIG_INIT,
} from '@layerzerolabs/ua-devtools-evm-hardhat'
import { deployContract, setupDefaultEndpointV2 } from '@layerzerolabs/test-setup-devtools-evm-hardhat'
import * as fs from 'fs'
import { promptToContinue } from '@layerzerolabs/io-devtools'

jest.mock('@layerzerolabs/io-devtools', () => {
    const original = jest.requireActual('@layerzerolabs/io-devtools')

    return {
        ...original,
        promptToContinue: jest.fn().mockRejectedValue('Not mocked: promptToContinue'),
        promptToSelectMultiple: jest.fn().mockRejectedValue('Not mocked: promptToSelectMultiple'),
    }
})

const promptToContinueMock = promptToContinue as jest.Mock

describe(`task ${TASK_LZ_OAPP_READ_CONFIG_INIT}`, () => {
    const actual = './layerzero_actual.config.js'
    const expected = './layerzero_expected.config.js'

    const getPromptMocks = async () => {
        const { promptToContinue, promptToSelectMultiple } = await import('@layerzerolabs/io-devtools')

        return {
            promptToContinueMock: promptToContinue as jest.Mock,
            promptToSelectMultipleMock: promptToSelectMultiple as jest.Mock,
        }
    }

    beforeEach(async () => {
        // We'll deploy the endpoint and save the deployments to the filesystem
        // since we want to be able to tun the task using spawnSync
        await deployContract('EndpointV2', true)
        await setupDefaultEndpointV2()
        await deployContract('OAppRead')
    })

    afterEach(async () => {
        // Delete the test file after each test
        fs.existsSync(actual) && fs.unlinkSync(actual)
        fs.existsSync(expected) && fs.unlinkSync(expected)
    })

    it('should generate a LayerZero Read Configuration with the two selected networks', async () => {
        const { promptToSelectMultipleMock } = await getPromptMocks()
        const networks = ['britney', 'tango']
        promptToSelectMultipleMock.mockResolvedValue(networks)
        const contractName = 'MyOAppRead'
        await hre.run(TASK_LZ_OAPP_READ_CONFIG_INIT, { contractName: contractName, oappConfig: actual })

        // generate an expected LayerZero Config file to compare
        await generateExpectedLzConfig(expected, networks, contractName, true)
        const expectedContent = fs.readFileSync(expected, 'utf-8')
        const actualContent = fs.readFileSync(actual, 'utf-8')
        expect(expectedContent).toEqual(actualContent)
    })

    it('should generate a LayerZero Read Configuration with the three selected networks and then wire using generated config', async () => {
        const { promptToSelectMultipleMock } = await getPromptMocks()
        const networks = ['britney', 'tango', 'vengaboys']
        promptToSelectMultipleMock.mockResolvedValue(networks)
        const contractName = 'DefaultOAppRead'
        await hre.run(TASK_LZ_OAPP_READ_CONFIG_INIT, { contractName: contractName, oappConfig: actual })

        // generate an expected LayerZero Config file to compare
        await generateExpectedLzConfig(expected, networks, contractName, true)

        const expectedContent = fs.readFileSync(expected, 'utf-8')
        const actualContent = fs.readFileSync(actual, 'utf-8')
        expect(expectedContent).toEqual(actualContent)

        // wire using generated config and expect no errors
        const oappConfig = actual

        promptToContinueMock
            .mockResolvedValueOnce(false) // We don't want to see the list
            .mockResolvedValueOnce(true) // We want to continue

        const [, errors] = await hre.run(TASK_LZ_OAPP_READ_WIRE, { oappConfig })
        expect(errors).toEqual([])
    })
})

/**
 * Builds expected LayerZero config to compare against
 * @param {string} filename filename
 * @param {string[]} networks selected networks
 * @param {string} contractName name of contract
 */
async function generateExpectedLzConfig(filename: string, networks: string[], contractName: string) {
    const endpointIdImportStatement = `import { EndpointId } from "@layerzerolabs/lz-definitions";\n`
    const networkContractVariables = networks
        .map(
            (network) =>
                `const ${network}Contract = {\n    eid: ${getTestEndpoint(network)},\n    contractName: "${contractName}"\n};`
        )
        .join('\n')
    const contractsArray = await getReadContractsArray(networks)
    const connectionsArray = await getConnectionsArray(networks ?? [])
    const exportContent = `\nexport default { contracts: [${contractsArray}], connections: [${connectionsArray}] };\n`
    const lzConfigContent = endpointIdImportStatement + networkContractVariables + exportContent
    fs.writeFileSync(filename, lzConfigContent)
}

/**
 * Gets string representation of test endpoint enum
 * @param {string} network
 * @return {string} string representation of test endpoint enum
 */
function getTestEndpoint(network: string): string {
    switch (network) {
        case 'vengaboys':
            return 'EndpointId.ETHEREUM_V2_MAINNET'
        case 'britney':
            return 'EndpointId.AVALANCHE_V2_MAINNET'
        case 'tango':
            return 'EndpointId.BSC_V2_MAINNET'
        default:
            throw new Error('test network does not exist.')
    }
}

/**
 * Builds connection array string using passed in selected networks.
 * Calls TASK_LZ_OAPP_CONFIG_GET_DEFAULT to get default values for all pathways
 * @param {string[]} networks
 * @return {string} string representation of the connections array
 *
 *         connections: [
 *             {
 *                from: firstContract,
 *                to: secondContract,
 *                config:{...}
 *             },
 *             {
 *                from: secondContract,
 *                to: firstContract,
 *                config:{...}
 *             }
 *         ]
 */
async function getConnectionsArray(networks: string[]) {
    const getDefaultConfigTask = await hre.run(TASK_LZ_OAPP_CONFIG_GET_DEFAULT, {
        networks,
    })

    let connectionsContent = ''
    for (const from of networks) {
        for (const to of networks) {
            if (from === to) {
                continue
            }
            const defaultConfig = getDefaultConfigTask[from][to]
            connectionsContent += `{ from: ${from}Contract, to: ${to}Contract, config: ${buildDefaultConfig(defaultConfig)} }, `
        }
    }
    connectionsContent = connectionsContent.substring(0, connectionsContent.length - 2)
    return connectionsContent
}

/**
 * Builds contract array string using passed in selected networks.
 * Calls TASK_LZ_OAPP_CONFIG_GET_DEFAULT to get default values for all pathways
 * @param {string[]} networks
 * @return {string} string representation of the connections array
 *
 *         connections: [
 *             {
 *                from: firstContract,
 *                to: secondContract,
 *                config:{...}
 *             },
 *             {
 *                from: secondContract,
 *                to: firstContract,
 *                config:{...}
 *             }
 *         ]
 */
async function getReadContractsArray(networks: string[]) {
    const getDefaultConfigTask = await hre.run(TASK_LZ_OAPP_READ_CONFIG_GET_CHANNEL, {
        networks,
    })

    let contractsContent = ''
    for (const from of networks) {
        contractsContent += `{ contract: ${from}Contract, config: ${buildDefaultReadConfig(getDefaultConfigTask[from])} }, `
    }
    contractsContent = contractsContent.substring(0, contractsContent.length - 2)
    return contractsContent
}

/**
 * Builds config string with passed in defaults.
 *
 * @param {Record<string, Record<string, unknown>>} defaultConfig
 * @return {string} string representing config
 *
 *      config: {
 *           sendLibrary: "0x0000000000000000000000000000000000000000",
 *           receiveLibraryConfig: {...},
 *           sendConfig: {...},
 *           receiveConfig: {...}
 *      }
 */
function buildDefaultConfig(defaultConfig: Record<string, Record<string, unknown>>): string {
    return (
        `{ ` +
        `sendLibrary: "${defaultConfig.defaultSendLibrary}", ` +
        `receiveLibraryConfig: { receiveLibrary: "${defaultConfig.defaultReceiveLibrary}", gracePeriod: 0 }, ` +
        `sendConfig: { executorConfig: { maxMessageSize: ${defaultConfig.sendExecutorConfig?.maxMessageSize}, executor: "${defaultConfig.sendExecutorConfig?.executor}" }, ` +
        `ulnConfig: { confirmations: ${defaultConfig.sendUlnConfig?.confirmations}, requiredDVNs: ${handleDvns(defaultConfig.sendUlnConfig?.requiredDVNs as string[])}, optionalDVNs: ${handleDvns(defaultConfig.sendUlnConfig?.optionalDVNs as string[])}, optionalDVNThreshold: ${defaultConfig.sendUlnConfig?.optionalDVNThreshold ?? 0} } }, ` +
        `receiveConfig: { ulnConfig: { confirmations: ${defaultConfig.receiveUlnConfig?.confirmations}, requiredDVNs: ${handleDvns(defaultConfig.receiveUlnConfig?.requiredDVNs as string[])}, optionalDVNs: ${handleDvns(defaultConfig.receiveUlnConfig?.optionalDVNs as string[])}, optionalDVNThreshold: ${defaultConfig.receiveUlnConfig?.optionalDVNThreshold ?? 0} } }` +
        ` }`
    )
}

/**
 * Builds config string with passed in defaults for ReadLib.
 *
 * @param {Record<string, Record<string, unknown>>} defaultConfig
 * @return {string} string representing config
 *
 *      config: {
 *           readChannelConfigs: [
 *              {
 *                channelId: 1,
 *                readLibrary: "0x0000000000000000000000000000000000000000",
 *                ulnConfig: {...},
 *              }
 *           ]
 *      }
 */
function buildDefaultReadConfig(defaultConfig: Record<string, Record<string, Record<string, unknown>>>): string {
    let readChannelConfigs = ''

    for (const [channelId, config] of Object.entries(defaultConfig)) {
        readChannelConfigs += `{ channelId: ${channelId}, readLibrary: "${config.defaultReadLibrary}", ulnConfig: { executor: "${config.readUlnConfig?.executor}", requiredDVNs: ${handleDvns(config.readUlnConfig?.requiredDVNs as string[])}, optionalDVNs: ${handleDvns(config.readUlnConfig?.optionalDVNs as string[])}, optionalDVNThreshold: ${config.readUlnConfig?.optionalDVNThreshold ?? 0} } }, `
    }

    readChannelConfigs = readChannelConfigs.substring(0, readChannelConfigs.length - 2)

    return `{ readChannelConfigs: [` + readChannelConfigs + `] }`
}

/**
 * Handles converting array of DVNs (required or optional) to a string
 * @param {string[]} dvnArray
 * @return {string} string representing dvns
 */
function handleDvns(dvnArray: string[]): string {
    if (dvnArray.length > 0) {
        return '[' + dvnArray.map((str) => `"${str}"`).join(', ') + ']'
    } else {
        return '[]'
    }
}
