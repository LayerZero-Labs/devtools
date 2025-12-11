import { describe, expect, test, beforeAll, afterAll } from '@jest/globals'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { InitiaMsgLib } from '../../sdk/initiaMsgLib'
import { RESTClient } from '@initia/initia.js'
import { getConnection } from '../../sdk/moveVMConnectionBuilder'
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

describe('InitiaMsgLib View Methods', () => {
    let msgLib: InitiaMsgLib
    let restClient: RESTClient

    beforeAll(async () => {
        // Get actual REST client
        restClient = getConnection('initia', 'testnet') as RESTClient

        // Initialize msgLib with test address
        const testMsgLibAddress = '0x3e1b182c40965a986133798e1da76302ef327de2c32c58110361587560285e88'
        msgLib = new InitiaMsgLib(restClient, testMsgLibAddress)
    })

    describe('get_default_uln_send_config', () => {
        test('should return UlnConfig with correct types', async () => {
            const result = await msgLib.getDefaultULNSendConfig(EndpointId.BSC_V2_TESTNET)

            console.log('get_default_uln_send_config result types:', {
                confirmations: typeof result.confirmations,
                optional_dvn_threshold: typeof result.optional_dvn_threshold,
                optional_dvns: Array.isArray(result.optional_dvns),
                required_dvns: Array.isArray(result.required_dvns),
                use_default_for_confirmations: typeof result.use_default_for_confirmations,
                use_default_for_optional_dvns: typeof result.use_default_for_optional_dvns,
                use_default_for_required_dvns: typeof result.use_default_for_required_dvns,
            })

            expect(typeof result).toBe('object')
            expect(typeof result.confirmations).toBe('bigint')
            expect(typeof result.optional_dvn_threshold).toBe('number')
            expect(Array.isArray(result.optional_dvns)).toBe(true)
            expect(Array.isArray(result.required_dvns)).toBe(true)
            expect(typeof result.use_default_for_confirmations).toBe('boolean')
            expect(typeof result.use_default_for_optional_dvns).toBe('boolean')
            expect(typeof result.use_default_for_required_dvns).toBe('boolean')

            // Check that arrays contain strings
            if (result.optional_dvns.length > 0) {
                expect(typeof result.optional_dvns[0]).toBe('string')
            }
            if (result.required_dvns.length > 0) {
                expect(typeof result.required_dvns[0]).toBe('string')
            }
        })
    })

    describe('get_default_uln_receive_config', () => {
        test('should return UlnConfig with correct types', async () => {
            const result = await msgLib.getDefaultULNReceiveConfig(EndpointId.BSC_V2_TESTNET)

            console.log('get_default_uln_receive_config result types:', {
                confirmations: typeof result.confirmations,
                optional_dvn_threshold: typeof result.optional_dvn_threshold,
                optional_dvns: Array.isArray(result.optional_dvns),
                required_dvns: Array.isArray(result.required_dvns),
                use_default_for_confirmations: typeof result.use_default_for_confirmations,
                use_default_for_optional_dvns: typeof result.use_default_for_optional_dvns,
                use_default_for_required_dvns: typeof result.use_default_for_required_dvns,
            })

            expect(typeof result).toBe('object')
            expect(typeof result.confirmations).toBe('bigint')
            expect(typeof result.optional_dvn_threshold).toBe('number')
            expect(Array.isArray(result.optional_dvns)).toBe(true)
            expect(Array.isArray(result.required_dvns)).toBe(true)
            expect(typeof result.use_default_for_confirmations).toBe('boolean')
            expect(typeof result.use_default_for_optional_dvns).toBe('boolean')
            expect(typeof result.use_default_for_required_dvns).toBe('boolean')

            // Check that arrays contain strings
            if (result.optional_dvns.length > 0) {
                expect(typeof result.optional_dvns[0]).toBe('string')
            }
            if (result.required_dvns.length > 0) {
                expect(typeof result.required_dvns[0]).toBe('string')
            }
        })
    })

    describe('get_default_executor_config', () => {
        test('should return ExecutorConfig with correct types', async () => {
            const result = await msgLib.getDefaultExecutorConfig(EndpointId.BSC_V2_TESTNET)

            console.log('get_default_executor_config result types:', {
                executor_address: typeof result.executor_address,
                max_message_size: typeof result.max_message_size,
            })

            expect(typeof result).toBe('object')
            expect(typeof result.executor_address).toBe('string')
            expect(typeof result.max_message_size).toBe('number')

            // If there's a valid executor address, it should start with 0x
            if (result.executor_address) {
                expect(result.executor_address.startsWith('0x')).toBe(true)
            }
        })
    })
})
