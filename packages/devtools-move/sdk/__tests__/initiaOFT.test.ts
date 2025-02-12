import { describe, expect, test, beforeAll, jest } from '@jest/globals'
import { InitiaOFT } from '../initiaOFT'
import { RESTClient } from '@initia/initia.js'
import { OFTType } from '../IOFT'
import { getConnection } from '../moveVMConnectionBuilder'
import { initializeTaskContext } from '../baseTaskHelper'
import dotenv from 'dotenv'
import path from 'path'
import * as utils from '../../tasks/move/utils/utils'
import { EndpointId } from '@layerzerolabs/lz-definitions'

// Mock the getMoveVMOAppAddress function
jest.spyOn(utils, 'getMoveVMOAppAddress').mockImplementation(
    () => '0x884E0D02D306E54D579910C7F87F697F07030F2D503C7CB5A04A6F135352B936'
)

dotenv.config({ path: path.resolve(__dirname, '.env') })

describe('InitiaOFT View Methods', () => {
    let oft: InitiaOFT
    let restClient: RESTClient

    beforeAll(async () => {
        // Get actual REST client
        restClient = getConnection('initia', 'testnet') as RESTClient

        // Initialize with local config - using path relative to workspace root
        const configPath = './sdk/__tests__/test.layerzero.config.ts'
        const context = await initializeTaskContext(configPath)
        oft = context.oft as InitiaOFT
        // Use the real REST client
        oft.moveVMConnection = restClient
    })

    describe('getRateLimitConfig', () => {
        test('should return rate limit config as [bigint, bigint]', async () => {
            const result = await oft.getRateLimitConfig(EndpointId.BSC_V2_TESTNET, OFTType.OFT_FA)
            expect(Array.isArray(result)).toBe(true)
            expect(result.length).toBe(2)
            expect(typeof result[0]).toBe('bigint')
            expect(typeof result[1]).toBe('bigint')
        })
    })

    describe('getFeeBps', () => {
        test('should return fee bps as bigint', async () => {
            const result = await oft.getFeeBps(OFTType.OFT_FA)
            console.log('getFeeBps result', result)
            console.log('typeof getFeeBps result', typeof result)
            expect(typeof result).toBe('bigint')
        })
    })

    describe('getBalance', () => {
        test('should return balance as number', async () => {
            const result = await oft.getBalance('0x123')
            console.log('getBalance result', result)
            console.log('typeof getBalance result', typeof result)
            expect(typeof result).toBe('number')
        })
    })

    describe('getDelegate', () => {
        test('should return delegate address as string', async () => {
            const result = await oft.getDelegate()
            console.log('getDelegate result', result)
            console.log('typeof getDelegate result', typeof result)
            expect(typeof result).toBe('string')
            expect(result.startsWith('0x')).toBe(true)
        })
    })

    // describe('getAdmin', () => {
    //     test('should return admin address as string', async () => {
    //         const result = await oft.getAdmin()
    //         expect(typeof result).toBe('string')
    //         expect(result.startsWith('0x')).toBe(true)
    //     })
    // })

    // describe('getPeer', () => {
    //     test('should return peer address as string', async () => {
    //         const result = await oft.getPeer(EndpointId.BSC_V2_TESTNET)
    //         expect(typeof result).toBe('string')
    //         expect(result.startsWith('0x')).toBe(true)
    //     })
    // })

    // describe('hasPeer', () => {
    //     test('should return boolean', async () => {
    //         const result = await oft.hasPeer(EndpointId.BSC_V2_TESTNET)
    //         expect(typeof result).toBe('boolean')
    //     })
    // })

    // describe('getEnforcedOptions', () => {
    //     test('should return enforced options as string', async () => {
    //         const result = await oft.getEnforcedOptions(EndpointId.BSC_V2_TESTNET, 1)
    //         expect(typeof result).toBe('string')
    //     })
    // })
})
