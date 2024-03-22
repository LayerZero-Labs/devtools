import hre from 'hardhat'
import {
    TASK_LZ_OAPP_CONFIG_INIT,
    TASK_LZ_OAPP_CONFIG_GET_DEFAULT,
    TASK_LZ_OAPP_WIRE,
} from '@layerzerolabs/ua-devtools-evm-hardhat'
import { deployContract, setupDefaultEndpointV2 } from '@layerzerolabs/test-setup-devtools-evm-hardhat'
import { getTestHre } from '@layerzerolabs/test-devtools-evm-hardhat'
import * as fs from 'fs'
import { getEidForNetworkName } from '@layerzerolabs/devtools-evm-hardhat'
import { formatEid } from '@layerzerolabs/devtools'
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

describe(`task ${TASK_LZ_OAPP_CONFIG_INIT}`, () => {
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
        await deployContract('OApp')
    })

    afterEach(async () => {
        // Delete the test file after each test
        fs.existsSync(actual) && fs.unlinkSync(actual)
        fs.existsSync(expected) && fs.unlinkSync(expected)
    })

    it('should throw an error if there are no networks configured with eid', async () => {
        const { promptToSelectMultipleMock } = await getPromptMocks()
        const hre = getTestHre({ config: './hardhat.config.without-eids.ts' })
        await expect(hre.run(TASK_LZ_OAPP_CONFIG_INIT, { contractName: 'MyOApp' })).rejects.toThrow()
        expect(promptToSelectMultipleMock).not.toHaveBeenCalled()
    })

    it('should ask the user to select networks for the config', async () => {
        const { promptToSelectMultipleMock } = await getPromptMocks()
        promptToSelectMultipleMock.mockResolvedValue(['britney'])

        await hre.run(TASK_LZ_OAPP_CONFIG_INIT, { contractName: 'MyOApp', oappConfig: actual })

        expect(promptToSelectMultipleMock).toHaveBeenCalledWith(
            `Select the networks to include in your OApp config`,
            expect.objectContaining({
                options: [
                    {
                        title: 'britney',
                        value: 'britney',
                        disabled: false,
                        hint: `Connected to ${formatEid(getEidForNetworkName('britney'))}`,
                    },
                    {
                        title: 'tango',
                        value: 'tango',
                        disabled: false,
                        hint: `Connected to ${formatEid(getEidForNetworkName('tango'))}`,
                    },
                    {
                        title: 'vengaboys',
                        value: 'vengaboys',
                        disabled: false,
                        hint: `Connected to ${formatEid(getEidForNetworkName('vengaboys'))}`,
                    },
                    {
                        title: 'hardhat',
                        value: 'hardhat',
                        disabled: true,
                    },
                    {
                        title: 'localhost',
                        value: 'localhost',
                        disabled: true,
                    },
                ],
            })
        )
    })

    it('should generate a LayerZero Configuration with the two selected networks', async () => {
        const { promptToSelectMultipleMock } = await getPromptMocks()
        const networks = ['britney', 'tango']
        promptToSelectMultipleMock.mockResolvedValue(networks)
        const contractName = 'MyOApp'
        await hre.run(TASK_LZ_OAPP_CONFIG_INIT, { contractName: contractName, oappConfig: actual })

        // generate an expected LayerZero Config file to compare
        await generateExpectedLzConfig(expected, networks, contractName)
        const expectedContent = fs.readFileSync(expected, 'utf-8')
        const actualContent = fs.readFileSync(actual, 'utf-8')
        expect(expectedContent).toEqual(actualContent)
    })

    it('should generate a LayerZero Configuration with the three selected networks and then wire using generated config', async () => {
        const { promptToSelectMultipleMock } = await getPromptMocks()
        const networks = ['britney', 'tango', 'vengaboys']
        promptToSelectMultipleMock.mockResolvedValue(networks)
        const contractName = 'DefaultOApp'
        await hre.run(TASK_LZ_OAPP_CONFIG_INIT, { contractName: contractName, oappConfig: actual })

        // generate an expected LayerZero Config file to compare
        await generateExpectedLzConfig(expected, networks, contractName)

        const expectedContent = fs.readFileSync(expected, 'utf-8')
        const actualContent = fs.readFileSync(actual, 'utf-8')
        expect(expectedContent).toEqual(actualContent)

        // wire using generated config and expect no errors
        const oappConfig = actual

        promptToContinueMock
            .mockResolvedValueOnce(false) // We don't want to see the list
            .mockResolvedValueOnce(true) // We want to continue

        const [, errors] = await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig })
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
    const contractsArray = networks.map((network) => `{ contract: ${network}Contract }`).join(', ')
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
