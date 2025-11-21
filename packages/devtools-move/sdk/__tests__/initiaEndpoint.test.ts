import { describe, expect, test, beforeAll, afterAll } from '@jest/globals'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { InitiaEndpoint } from '../initiaEndpoint'
import { RESTClient } from '@initia/initia.js'
import { getConnection } from '../moveVMConnectionBuilder'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '.env') })

// Mock environment variables before any code runs
beforeAll(() => {
    process.env.INITIA_REST_URL = 'https://rest.testnet.initia.xyz'
    process.env.INITIA_RPC_URL = 'https://rpc.testnet.initia.xyz'
    process.env.INITIA_PRIVATE_KEY = '0000000000000000000000000000000000000000000000000000000000000001'
    process.env.INITIA_ACCOUNT_ADDRESS = '0x2e2de55e5162d58c41de389ccf6d7ca8de3940a6'
})

// Clean up after all tests
afterAll(() => {
    delete process.env.INITIA_REST_URL
    delete process.env.INITIA_RPC_URL
    delete process.env.INITIA_PRIVATE_KEY
    delete process.env.INITIA_ACCOUNT_ADDRESS
})

// skipped due to Initia Testnet RPC being down for upgrade`
describe.skip('InitiaEndpoint View Methods', () => {
    let endpoint: InitiaEndpoint
    let restClient: RESTClient

    beforeAll(async () => {
        // Get actual REST client
        restClient = getConnection('initia', 'testnet') as RESTClient

        // Initialize endpoint with test address
        const testEndpointAddress = '0xcc4e9fda80712972deb0338d85b84822a42d5155b645ef1b2eeae42cedd41b04'
        endpoint = new InitiaEndpoint(restClient, testEndpointAddress)
    })

    describe('getDefaultSendLibrary', () => {
        test('should return library address as string', async () => {
            const result = await endpoint.getDefaultSendLibrary(EndpointId.BSC_V2_TESTNET)
            // Only log the type and string value, not the entire object
            console.log('typeof getDefaultSendLibrary result:', typeof result)
            if (typeof result === 'string') {
                console.log('getDefaultSendLibrary result:', result)
            }
            expect(typeof result).toBe('string')
            expect(result.startsWith('0x')).toBe(true)
        })
    })

    describe('getSendLibrary', () => {
        test('should return [string, boolean] tuple', async () => {
            const testOftAddress = '0x884E0D02D306E54D579910C7F87F697F07030F2D503C7CB5A04A6F135352B936'
            const result = await endpoint.getSendLibrary(testOftAddress, EndpointId.BSC_V2_TESTNET)
            // Only log the types and primitive values
            console.log('getSendLibrary result types:', {
                firstElement: typeof result[0],
                secondElement: typeof result[1],
            })
            expect(Array.isArray(result)).toBe(true)
            expect(result.length).toBe(2)
            expect(typeof result[0]).toBe('string')
            expect(result[0].startsWith('0x')).toBe(true)
            expect(typeof result[1]).toBe('boolean')
        })
    })

    describe('getReceiveLibrary', () => {
        test('should return [string, boolean] tuple', async () => {
            const testOftAddress = '0x884E0D02D306E54D579910C7F87F697F07030F2D503C7CB5A04A6F135352B936'
            const result = await endpoint.getReceiveLibrary(testOftAddress, EndpointId.BSC_V2_TESTNET)
            // Only log the types and primitive values
            console.log('getReceiveLibrary result types:', {
                firstElement: typeof result[0],
                secondElement: typeof result[1],
            })
            expect(Array.isArray(result)).toBe(true)
            expect(result.length).toBe(2)
            expect(typeof result[0]).toBe('string')
            expect(result[0].startsWith('0x')).toBe(true)
            expect(typeof result[1]).toBe('boolean')
        })
    })

    describe('getDefaultReceiveLibraryTimeout', () => {
        test('should return LibraryTimeoutResponse with correct types', async () => {
            const result = await endpoint.getDefaultReceiveLibraryTimeout(EndpointId.BSC_V2_TESTNET)
            // Only log the types of the result properties
            console.log('getDefaultReceiveLibraryTimeout result types:', {
                expiry: typeof result.expiry,
                lib: typeof result.lib,
            })
            expect(typeof result).toBe('object')
            expect(typeof result.expiry).toBe('bigint')
            expect(typeof result.lib).toBe('string')
            expect(result.lib.startsWith('0x')).toBe(true)
        })
    })

    describe('getReceiveLibraryTimeout', () => {
        test('should return LibraryTimeoutResponse with correct types', async () => {
            const testOftAddress = '0x884E0D02D306E54D579910C7F87F697F07030F2D503C7CB5A04A6F135352B936'
            const result = await endpoint.getReceiveLibraryTimeout(testOftAddress, EndpointId.BSC_V2_TESTNET)
            // Only log the types of the result properties
            console.log('getReceiveLibraryTimeout result types:', {
                expiry: typeof result.expiry,
                lib: typeof result.lib,
            })
            console.log('getReceiveLibraryTimeout result', result)
            console.log('typeof getReceiveLibraryTimeout result', typeof result)
            expect(typeof result).toBe('object')
            expect(typeof result.expiry).toBe('bigint')
            expect(typeof result.lib).toBe('string')
            // For error case, lib might be empty string
            if (result.lib) {
                expect(result.lib.startsWith('0x')).toBe(true)
            }
        })
    })

    describe('getDefaultReceiveLibrary', () => {
        test('should return library address as string', async () => {
            const result = await endpoint.getDefaultReceiveLibrary(EndpointId.BSC_V2_TESTNET)
            // Only log the type and string value
            console.log('typeof getDefaultReceiveLibrary result:', typeof result)
            if (typeof result === 'string') {
                console.log('getDefaultReceiveLibrary result:', result)
            }
            expect(typeof result).toBe('string')
            expect(result.startsWith('0x')).toBe(true)
        })
    })

    describe('getConfig', () => {
        test('should return config as Uint8Array', async () => {
            const testOftAddress = '0x884E0D02D306E54D579910C7F87F697F07030F2D503C7CB5A04A6F135352B936'
            const testMsgLibAddress = '0x3e1b182c40965a986133798e1da76302ef327de2c32c58110361587560285e88'
            const result = await endpoint.getConfig(testOftAddress, testMsgLibAddress, EndpointId.BSC_V2_TESTNET, 1)
            // Only log the type of the result
            console.log('typeof getConfig result:', result instanceof Uint8Array ? 'Uint8Array' : typeof result)
            expect(result instanceof Uint8Array).toBe(true)
        })
    })
})
