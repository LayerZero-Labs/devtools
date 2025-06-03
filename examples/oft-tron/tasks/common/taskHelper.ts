import { OmniAddress } from '@layerzerolabs/devtools'
import { createLogger } from '@layerzerolabs/io-devtools'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import EndpointV2 from '@layerzerolabs/lz-evm-sdk-v2/artifacts-tron/contracts/EndpointV2.sol/EndpointV2.json'
import OApp from '@layerzerolabs/lz-evm-sdk-v2/artifacts-tron/contracts/oapp/OApp.sol/OApp.json'
import OAppOptionsType3 from '@layerzerolabs/lz-evm-sdk-v2/artifacts-tron/contracts/oapp/libs/OAppOptionsType3.sol/OAppOptionsType3.json'
import ReceiveUln302 from '@layerzerolabs/lz-evm-sdk-v2/artifacts-tron/contracts/uln/uln302/ReceiveUln302.sol/ReceiveUln302.json'
import SendUln302 from '@layerzerolabs/lz-evm-sdk-v2/artifacts-tron/contracts/uln/uln302/SendUln302.sol/SendUln302.json'
import EndpointV2Mainnet from '@layerzerolabs/lz-evm-sdk-v2/deployments/tron-mainnet/EndpointV2.json'
import ReceiveUln302Mainnet from '@layerzerolabs/lz-evm-sdk-v2/deployments/tron-mainnet/ReceiveUln302.json'
import SendUln302Mainnet from '@layerzerolabs/lz-evm-sdk-v2/deployments/tron-mainnet/SendUln302.json'
import EndpointV2Testnet from '@layerzerolabs/lz-evm-sdk-v2/deployments/tron-testnet/EndpointV2.json'
import ReceiveUln302Testnet from '@layerzerolabs/lz-evm-sdk-v2/deployments/tron-testnet/ReceiveUln302.json'
import SendUln302Testnet from '@layerzerolabs/lz-evm-sdk-v2/deployments/tron-testnet/SendUln302.json'
import { Timeout, Uln302ExecutorConfig, Uln302UlnConfig } from '@layerzerolabs/protocol-devtools'

const TronWeb = require('tronweb')

const logger = createLogger()

// Tron ULN addresses from LayerZero SDK deployments
const SEND_ULN_ADDRESS_MAINNET = SendUln302Mainnet.address
const RECEIVE_ULN_ADDRESS_MAINNET = ReceiveUln302Mainnet.address
const SEND_ULN_ADDRESS_TESTNET = SendUln302Testnet.address
const RECEIVE_ULN_ADDRESS_TESTNET = ReceiveUln302Testnet.address

// Define ABI type
interface ContractABI {
    name: string
    type: string
    inputs?: Array<{
        name: string
        type: string
        internalType: string
    }>
    outputs?: Array<{
        name: string
        type: string
        internalType: string
    }>
    stateMutability?: string
    anonymous?: boolean
}

// Define contract addresses type
interface ContractAddresses {
    endpoint: string
    sendUln: string
    receiveUln: string
    abi: {
        endpoint: ContractABI[]
        sendUln: ContractABI[]
        receiveUln: ContractABI[]
        oapp: ContractABI[]
        oappOptions: ContractABI[]
    }
}

/**
 * Get contract addresses and ABIs based on network
 * @param isMainnet {boolean} Whether to use mainnet addresses
 */
function getContractAddresses(isMainnet: boolean): ContractAddresses {
    const addresses: ContractAddresses = {
        endpoint: isMainnet ? EndpointV2Mainnet.address : EndpointV2Testnet.address,
        sendUln: isMainnet ? SEND_ULN_ADDRESS_MAINNET : SEND_ULN_ADDRESS_TESTNET,
        receiveUln: isMainnet ? RECEIVE_ULN_ADDRESS_MAINNET : RECEIVE_ULN_ADDRESS_TESTNET,
        abi: {
            endpoint: EndpointV2.abi as ContractABI[],
            sendUln: SendUln302.abi as ContractABI[],
            receiveUln: ReceiveUln302.abi as ContractABI[],
            oapp: OApp.abi as ContractABI[],
            oappOptions: OAppOptionsType3.abi as ContractABI[],
        },
    }

    // Validate ABIs
    logger.info('Validating ABIs...')
    const requiredFunctions = {
        endpoint: ['getReceiveLibrary', 'setReceiveLibrary', 'setConfig'],
        receiveUln: ['getAppUlnConfig'],
        sendUln: ['getAppUlnConfig'],
        oapp: ['setPeer'],
        oappOptions: ['setEnforcedOptions'],
    }

    for (const [contract, functions] of Object.entries(requiredFunctions)) {
        const abi = addresses.abi[contract as keyof typeof addresses.abi]
        if (!abi) {
            throw new Error(`Missing ABI for ${contract}`)
        }

        const missingFunctions = functions.filter((func) => !abi.some((item: ContractABI) => item.name === func))

        if (missingFunctions.length > 0) {
            throw new Error(`Missing required functions in ${contract} ABI: ${missingFunctions.join(', ')}`)
        }

        logger.info(`Validated ${contract} ABI:`, {
            functions: functions.map((func) => ({
                name: func,
                exists: true,
            })),
        })
    }

    logger.info(`Using ${isMainnet ? 'mainnet' : 'testnet'} contract addresses:`, addresses)
    return addresses
}

/**
 * Validate Tron address conversion
 * @param hexAddress {string} Original hex address
 * @param base58Address {string} Converted base58 address
 */
function validateAddressConversion(hexAddress: string, base58Address: string): boolean {
    try {
        // Convert back to hex to verify
        const hexFromBase58 = TronWeb.address.toHex(base58Address)

        // Remove prefixes for comparison
        const cleanHex = hexAddress.startsWith('0x') ? hexAddress.slice(2) : hexAddress
        const cleanHexFromBase58 = hexFromBase58.startsWith('41') ? hexFromBase58.slice(2) : hexFromBase58

        // If original already had 41 prefix, we need to remove it for comparison
        const finalHex = cleanHex.startsWith('41') ? cleanHex.slice(2) : cleanHex

        const isValid = finalHex.toLowerCase() === cleanHexFromBase58.toLowerCase()

        if (!isValid) {
            logger.error('Address conversion validation failed:', {
                original: hexAddress,
                converted: base58Address,
                hexFromBase58,
                cleanHex,
                cleanHexFromBase58,
                finalHex,
            })
        }

        return isValid
    } catch (error) {
        logger.error('Error validating address conversion:', error)
        return false
    }
}

/**
 * Convert hex address to Tron base58 address
 * @param hexAddress {string} Address in hex format (with or without 0x prefix)
 */
function hexToBase58(hexAddress: string): string {
    try {
        // Remove 0x prefix if present
        const cleanHex = hexAddress.startsWith('0x') ? hexAddress.slice(2) : hexAddress

        // For Tron addresses:
        // 1. If it already has 41 prefix, use it as is
        // 2. If it doesn't have 41 prefix, add it
        const tronHex = cleanHex.startsWith('41') ? cleanHex : `41${cleanHex}`

        // Validate the hex length (should be 42 chars: 41 + 20 bytes)
        if (tronHex.length !== 42) {
            throw new Error(`Invalid Tron hex length: ${tronHex.length} (expected 42)`)
        }

        const base58Address = TronWeb.address.fromHex(tronHex)

        // Validate the conversion
        if (!validateAddressConversion(hexAddress, base58Address)) {
            throw new Error(`Address conversion validation failed for ${hexAddress}`)
        }

        logger.info(`Converted address ${hexAddress} to ${base58Address}`)
        return base58Address
    } catch (error) {
        logger.error(`Failed to convert address ${hexAddress}:`, error)
        throw error
    }
}

// Test known address conversions
function testAddressConversions() {
    const testCases = [
        {
            hex: '0x0Af59750D5dB5460E5d89E268C474d5F7407c061',
            expected: 'TAy9xwjYjBBN6kutzrZJaAZJHCAejjK1V9',
        },
        {
            hex: '0x612215D4dB0475a76dCAa36C7f9afD748c42ed2D',
            expected: 'TJpoNxF3CreFRpTdLhyXuJzEo4vMAns7Wz',
        },
    ]

    logger.info('Testing address conversions...')
    testCases.forEach(({ hex, expected }) => {
        try {
            const converted = hexToBase58(hex)
            const isValid = converted === expected
            logger.info(`Test case ${hex}:`, {
                expected,
                actual: converted,
                isValid,
            })
            if (!isValid) {
                throw new Error(`Address conversion mismatch for ${hex}`)
            }
        } catch (error) {
            logger.error(`Test case failed for ${hex}:`, error)
        }
    })
}

// Run address conversion tests
testAddressConversions()

// Log the contract addresses for debugging
logger.info('Contract addresses:', {
    mainnet: {
        endpoint: EndpointV2Mainnet.address,
        sendUln: SEND_ULN_ADDRESS_MAINNET,
        receiveUln: RECEIVE_ULN_ADDRESS_MAINNET,
    },
    testnet: {
        endpoint: EndpointV2Testnet.address,
        sendUln: SEND_ULN_ADDRESS_TESTNET,
        receiveUln: RECEIVE_ULN_ADDRESS_TESTNET,
    },
})

/**
 * Test basic TronWeb contract interactions
 * @param tronWeb {any} TronWeb instance
 * @param address {string} Contract address to test
 */
async function testTronWebContractInteraction(tronWeb: any, address: string) {
    logger.info('Testing basic TronWeb contract interactions...')

    try {
        // 1. Test basic contract info retrieval
        const contractInfo = await tronWeb.trx.getContract(address)
        logger.info('Contract info retrieved:', {
            address,
            exists: !!contractInfo,
            bytecode: contractInfo?.bytecode ? 'present' : 'missing',
            name: contractInfo?.name || 'unknown',
        })

        // 2. Test contract instance creation
        const contract = await tronWeb.contract(
            [
                {
                    constant: true,
                    inputs: [],
                    name: 'name',
                    outputs: [{ name: '', type: 'string' }],
                    payable: false,
                    stateMutability: 'view',
                    type: 'function',
                },
            ],
            address
        )

        logger.info('Contract instance created:', {
            address,
            hasName: typeof contract.name === 'function',
        })

        // 3. Test basic view function call
        try {
            const name = await contract.name().call()
            logger.info('Successfully called view function:', {
                function: 'name',
                result: name,
            })
        } catch (error) {
            logger.error('Failed to call view function:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                function: 'name',
            })
        }

        return true
    } catch (error) {
        logger.error('Failed to test contract interaction:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            address,
        })
        return false
    }
}

/**
 * Initialize TronWeb instance
 * @param network {string} Tron network (mainnet, shasta, nile)
 * @param privateKey {string} Private key for signing transactions
 */
export async function initTronWeb(network: string, privateKey: string) {
    logger.info(`Initializing TronWeb for network: ${network}`)

    // For testnet, always use Shasta
    const fullNode = network === 'mainnet' ? 'https://api.trongrid.io' : 'https://api.shasta.trongrid.io'

    const solidityNode = fullNode
    const eventServer = fullNode

    logger.info(`Using TronWeb endpoints:`, {
        fullNode,
        solidityNode,
        eventServer,
    })

    // Create TronWeb instance with proper configuration
    const tronWeb = new TronWeb({
        fullNode,
        solidityNode,
        eventServer,
        privateKey,
        headers: { 'TRON-PRO-API-KEY': process.env.TRON_API_KEY || '' },
    })

    // Test the connection
    logger.info('Testing TronWeb connection...')
    try {
        // Test fullNode
        const block = await tronWeb.trx.getCurrentBlock()
        logger.info('Successfully connected to fullNode:', {
            blockNumber: block?.blockID,
            timestamp: block?.block_header?.raw_data?.timestamp,
        })

        // Test solidityNode
        const account = await tronWeb.trx.getAccount(tronWeb.defaultAddress.base58)
        logger.info('Successfully connected to solidityNode:', {
            address: account?.address,
            balance: account?.balance,
        })

        // Test contract interaction with a known contract
        const testContractAddress =
            network === 'mainnet'
                ? 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' // USDT contract on mainnet
                : 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs' // USDT contract on Shasta

        const contractTestResult = await testTronWebContractInteraction(tronWeb, testContractAddress)
        if (!contractTestResult) {
            throw new Error('Failed to interact with test contract')
        }

        logger.info('TronWeb connection test successful')
    } catch (error) {
        logger.error('Failed to initialize TronWeb:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            network,
            endpoints: { fullNode, solidityNode, eventServer },
        })
        throw error
    }

    return tronWeb
}

/**
 * Validate contract existence and bytecode
 * @param tronWeb {any} TronWeb instance
 * @param address {string} Contract address in base58
 * @param expectedBytecode {string} Expected bytecode prefix
 */
async function validateContract(tronWeb: any, address: string, expectedBytecode?: string) {
    try {
        const contract = await tronWeb.trx.getContract(address)
        if (!contract) {
            throw new Error(`Contract does not exist at ${address}`)
        }

        logger.info(`Contract at ${address} exists:`, {
            hasBytecode: !!contract.bytecode,
            bytecodeLength: contract.bytecode?.length,
            bytecodePrefix: contract.bytecode?.slice(0, 32),
            name: contract.name || 'unknown',
        })

        if (expectedBytecode && contract.bytecode) {
            const matches = contract.bytecode.startsWith(expectedBytecode)
            if (!matches) {
                throw new Error(`Contract bytecode mismatch at ${address}`)
            }
        }

        return true
    } catch (error) {
        logger.error(`Failed to validate contract at ${address}:`, error)
        return false
    }
}

/**
 * Get the receive config for a Tron OApp
 * @param tronWeb {any} TronWeb instance
 * @param remoteEid {EndpointId} remote eid
 * @param address {OmniAddress} address of the OApp
 * @param isMainnet {boolean} whether to use mainnet addresses
 */
export async function getTronReceiveConfig(
    tronWeb: any,
    remoteEid: EndpointId,
    address: OmniAddress,
    isMainnet: boolean
): Promise<[OmniAddress, Uln302UlnConfig, Timeout] | undefined> {
    try {
        logger.info('Getting receive config with params:', {
            remoteEid,
            address,
            isMainnet,
        })

        const contracts = getContractAddresses(isMainnet)

        // Convert addresses to base58 format
        const endpointAddress = hexToBase58(contracts.endpoint)
        const receiveUlnAddress = hexToBase58(contracts.receiveUln)
        const sendUlnAddress = hexToBase58(contracts.sendUln)

        // For Tron, the receiver is the OFT contract address
        // The address parameter is already in the correct format (with 41 prefix)
        const receiverAddress = hexToBase58(address.replace('tron:', ''))

        logger.info('Using contract addresses:', {
            endpoint: endpointAddress,
            receiveUln: receiveUlnAddress,
            sendUln: sendUlnAddress,
            receiver: receiverAddress,
        })

        // Validate contract existence and bytecode
        logger.info('Validating contracts...')
        const endpointValid = await validateContract(tronWeb, endpointAddress)
        if (!endpointValid) {
            throw new Error(`Endpoint contract validation failed at ${endpointAddress}`)
        }

        const receiveUlnValid = await validateContract(tronWeb, receiveUlnAddress)
        if (!receiveUlnValid) {
            throw new Error(`ReceiveUln302 contract validation failed at ${receiveUlnAddress}`)
        }

        const receiverValid = await validateContract(tronWeb, receiverAddress)
        if (!receiverValid) {
            throw new Error(`Receiver contract validation failed at ${receiverAddress}`)
        }

        // Get the Endpoint contract instance
        logger.info('Creating Endpoint contract instance...')
        logger.info('Using ABI:', JSON.stringify(contracts.abi.endpoint, null, 2))

        const endpoint = await tronWeb.contract(contracts.abi.endpoint, endpointAddress)
        if (!endpoint) {
            throw new Error(`Failed to create Endpoint contract instance at ${endpointAddress}`)
        }

        // Log available methods
        logger.info('Endpoint contract methods:', {
            methods: Object.keys(endpoint),
            hasGetReceiveLibrary: typeof endpoint.getReceiveLibrary === 'function',
            getReceiveLibraryType: typeof endpoint.getReceiveLibrary,
        })

        logger.info('Creating ReceiveUln302 contract instance...')
        const receiveUln = await tronWeb.contract(contracts.abi.receiveUln, receiveUlnAddress)
        if (!receiveUln) {
            throw new Error(`Failed to create ReceiveUln302 contract instance at ${receiveUlnAddress}`)
        }

        // Get the receive library address from the Endpoint
        logger.info('Getting receive library from Endpoint...')
        try {
            logger.info('Calling getReceiveLibrary with params:', {
                receiver: receiverAddress,
                remoteEid,
                endpointAddress,
            })

            // Try to get the method directly
            const method = endpoint.getReceiveLibrary
            if (!method) {
                throw new Error('getReceiveLibrary method not found on contract')
            }

            // Log the method details
            logger.info('Method details:', {
                isFunction: typeof method === 'function',
                prototype: Object.getPrototypeOf(method),
                call: typeof method.call === 'function',
                method: method.toString(),
            })

            // Try calling with explicit error handling
            let response
            try {
                // Ensure receiverAddress is not empty
                if (!receiverAddress) {
                    throw new Error('receiverAddress is empty')
                }

                // Ensure remoteEid is a valid number
                if (typeof remoteEid !== 'number' || isNaN(remoteEid)) {
                    throw new Error(`Invalid remoteEid: ${remoteEid}`)
                }

                // Try different ways to call the method
                logger.info('Attempting to call getReceiveLibrary...')

                // Method 1: Direct call
                try {
                    response = await endpoint.getReceiveLibrary(receiverAddress, remoteEid).call()
                    logger.info('Direct call response:', response)
                } catch (error) {
                    logger.error('Direct call failed:', error)
                }

                // Method 2: Using method.call
                if (!response) {
                    try {
                        response = await method.call({
                            _receiver: receiverAddress,
                            _srcEid: remoteEid,
                        })
                        logger.info('Method.call response:', response)
                    } catch (error) {
                        logger.error('Method.call failed:', error)
                    }
                }

                // Method 3: Using contract.methods
                if (!response) {
                    try {
                        response = await endpoint.methods.getReceiveLibrary(receiverAddress, remoteEid).call()
                        logger.info('Contract.methods response:', response)
                    } catch (error) {
                        logger.error('Contract.methods failed:', error)
                    }
                }

                if (!response) {
                    throw new Error('All method call attempts failed')
                }

                logger.info('Method call response:', {
                    response,
                    type: typeof response,
                    isArray: Array.isArray(response),
                    length: Array.isArray(response) ? response.length : 'not an array',
                    stringified: JSON.stringify(response),
                })
            } catch (callError) {
                logger.error('Error in method call:', {
                    error: callError instanceof Error ? callError.message : 'Unknown error',
                    stack: callError instanceof Error ? callError.stack : undefined,
                    receiverAddress,
                    remoteEid,
                    endpointAddress,
                })
                throw callError
            }

            // Handle different response formats
            let receiveLibrary: string
            let isDefault: boolean

            if (Array.isArray(response)) {
                ;[receiveLibrary, isDefault] = response
                logger.info('Array response parsed:', { receiveLibrary, isDefault })
            } else if (typeof response === 'object' && response !== null) {
                // Handle object response
                receiveLibrary = response.lib || response[0]
                isDefault = response.isDefault || response[1]
                logger.info('Object response parsed:', { receiveLibrary, isDefault })
            } else {
                // Handle single value response
                receiveLibrary = response
                isDefault = false
                logger.info('Single value response:', { receiveLibrary, isDefault })
            }

            logger.info('Final parsed values:', {
                receiveLibrary,
                isDefault,
                receiverAddress,
                remoteEid,
            })

            // If no library is set or it's the default, we need to set it
            if (!receiveLibrary || isDefault) {
                logger.info('No receive library set or using default, will need to set it')
                return undefined
            }

            logger.info('Getting ULN config...')
            const ulnConfig = await receiveUln.getAppUlnConfig(receiverAddress, remoteEid).call()
            logger.info('ULN config:', ulnConfig)

            return [
                receiveLibrary,
                ulnConfig,
                {
                    lib: receiveUlnAddress,
                    expiry: 0n, // Tron uses a different timeout mechanism
                },
            ]
        } catch (error) {
            logger.error('Error calling contract methods:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                receiverAddress,
                remoteEid,
            })
            throw error
        }
    } catch (error) {
        logger.error('Error in getTronReceiveConfig:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        })
        throw error
    }
}

/**
 * Get the send config for a Tron OApp
 * @param tronWeb {any} TronWeb instance
 * @param remoteEid {EndpointId} remote eid
 * @param address {OmniAddress} address of the OApp
 * @param isMainnet {boolean} whether to use mainnet addresses
 */
export async function getTronSendConfig(
    tronWeb: any,
    remoteEid: EndpointId,
    address: OmniAddress,
    isMainnet: boolean
): Promise<[OmniAddress, Uln302UlnConfig, Uln302ExecutorConfig] | undefined> {
    try {
        logger.info('Getting send config with params:', {
            remoteEid,
            address,
            isMainnet,
        })

        const contracts = getContractAddresses(isMainnet)

        // Convert addresses to base58 format
        const endpointAddress = hexToBase58(contracts.endpoint)
        const sendUlnAddress = hexToBase58(contracts.sendUln)
        const receiveUlnAddress = hexToBase58(contracts.receiveUln)

        // For Tron, the sender is the OFT contract address
        // The address parameter is already in the correct format (with 41 prefix)
        const senderAddress = hexToBase58(address.replace('tron:', ''))

        logger.info('Using contract addresses:', {
            endpoint: endpointAddress,
            sendUln: sendUlnAddress,
            receiveUln: receiveUlnAddress,
            sender: senderAddress,
        })

        // Validate contract existence and bytecode
        logger.info('Validating contracts...')
        const endpointValid = await validateContract(tronWeb, endpointAddress)
        if (!endpointValid) {
            throw new Error(`Endpoint contract validation failed at ${endpointAddress}`)
        }

        const sendUlnValid = await validateContract(tronWeb, sendUlnAddress)
        if (!sendUlnValid) {
            throw new Error(`SendUln302 contract validation failed at ${sendUlnAddress}`)
        }

        const senderValid = await validateContract(tronWeb, senderAddress)
        if (!senderValid) {
            throw new Error(`Sender contract validation failed at ${senderAddress}`)
        }

        // Get the Endpoint contract instance
        logger.info('Creating Endpoint contract instance...')
        logger.info('Using ABI:', JSON.stringify(contracts.abi.endpoint, null, 2))

        const endpoint = await tronWeb.contract(contracts.abi.endpoint, endpointAddress)
        if (!endpoint) {
            throw new Error(`Failed to create Endpoint contract instance at ${endpointAddress}`)
        }

        // Log available methods
        logger.info('Endpoint contract methods:', {
            methods: Object.keys(endpoint),
            hasGetSendLibrary: typeof endpoint.getSendLibrary === 'function',
            getSendLibraryType: typeof endpoint.getSendLibrary,
        })

        logger.info('Creating SendUln302 contract instance...')
        const sendUln = await tronWeb.contract(contracts.abi.sendUln, sendUlnAddress)
        if (!sendUln) {
            throw new Error(`Failed to create SendUln302 contract instance at ${sendUlnAddress}`)
        }

        // Get the send library address from the Endpoint
        logger.info('Getting send library from Endpoint...')
        try {
            logger.info('Calling getSendLibrary with params:', {
                sender: senderAddress,
                remoteEid,
                endpointAddress,
            })

            // Try to get the method directly
            const method = endpoint.getSendLibrary
            if (!method) {
                throw new Error('getSendLibrary method not found on contract')
            }

            // Log the method details
            logger.info('Method details:', {
                isFunction: typeof method === 'function',
                prototype: Object.getPrototypeOf(method),
                call: typeof method.call === 'function',
                method: method.toString(),
            })

            // Try calling with explicit error handling
            let response
            try {
                // Ensure senderAddress is not empty
                if (!senderAddress) {
                    throw new Error('senderAddress is empty')
                }

                // Ensure remoteEid is a valid number
                if (typeof remoteEid !== 'number' || isNaN(remoteEid)) {
                    throw new Error(`Invalid remoteEid: ${remoteEid}`)
                }

                // Try different ways to call the method
                logger.info('Attempting to call getSendLibrary...')

                // Method 1: Direct call
                try {
                    response = await endpoint.getSendLibrary(senderAddress, remoteEid).call()
                    logger.info('Direct call response:', response)
                } catch (error) {
                    logger.error('Direct call failed:', error)
                }

                // Method 2: Using method.call
                if (!response) {
                    try {
                        response = await method.call({
                            _sender: senderAddress,
                            _dstEid: remoteEid,
                        })
                        logger.info('Method.call response:', response)
                    } catch (error) {
                        logger.error('Method.call failed:', error)
                    }
                }

                // Method 3: Using contract.methods
                if (!response) {
                    try {
                        response = await endpoint.methods.getSendLibrary(senderAddress, remoteEid).call()
                        logger.info('Contract.methods response:', response)
                    } catch (error) {
                        logger.error('Contract.methods failed:', error)
                    }
                }

                if (!response) {
                    throw new Error('All method call attempts failed')
                }

                logger.info('Method call response:', {
                    response,
                    type: typeof response,
                    isArray: Array.isArray(response),
                    length: Array.isArray(response) ? response.length : 'not an array',
                    stringified: JSON.stringify(response),
                })
            } catch (callError) {
                logger.error('Error in method call:', {
                    error: callError instanceof Error ? callError.message : 'Unknown error',
                    stack: callError instanceof Error ? callError.stack : undefined,
                    senderAddress,
                    remoteEid,
                    endpointAddress,
                })
                throw callError
            }

            // Handle different response formats
            let sendLibrary: string
            let isDefault: boolean

            if (Array.isArray(response)) {
                ;[sendLibrary, isDefault] = response
                logger.info('Array response parsed:', { sendLibrary, isDefault })
            } else if (typeof response === 'object' && response !== null) {
                // Handle object response
                sendLibrary = response.lib || response[0]
                isDefault = response.isDefault || response[1]
                logger.info('Object response parsed:', { sendLibrary, isDefault })
            } else {
                // Handle single value response
                sendLibrary = response
                isDefault = false
                logger.info('Single value response:', { sendLibrary, isDefault })
            }

            logger.info('Final parsed values:', {
                sendLibrary,
                isDefault,
                senderAddress,
                remoteEid,
            })

            // If no library is set or it's the default, we need to set it
            if (!sendLibrary || isDefault) {
                logger.info('No send library set or using default, will need to set it')
                return undefined
            }

            logger.info('Getting ULN config...')
            const ulnConfig = await sendUln.getAppUlnConfig(senderAddress, remoteEid).call()
            logger.info('ULN config:', ulnConfig)

            return [
                sendLibrary,
                ulnConfig,
                {
                    executor: sendUlnAddress,
                    maxMessageSize: 0, // Tron uses a different message size mechanism
                },
            ]
        } catch (error) {
            logger.error('Error calling contract methods:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                senderAddress,
                remoteEid,
            })
            throw error
        }
    } catch (error) {
        logger.error('Error in getTronSendConfig:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        })
        throw error
    }
}
