import { describe, expect, test, beforeEach, jest } from '@jest/globals'
import { InitiaOFT } from '../sdk/initiaOFT'
import { RESTClient } from '@initia/initia.js'
import { OFTType } from '../sdk/IOFT'
import { EndpointId } from '@layerzerolabs/lz-definitions'

describe('InitiaOFT View Methods', () => {
    let oft: InitiaOFT
    let viewFunctionMock: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>

    beforeEach(() => {
        viewFunctionMock = jest.fn() as jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>
        const restClient = {
            move: {
                viewFunction: viewFunctionMock,
            },
        } as unknown as RESTClient
        oft = Object.create(InitiaOFT.prototype) as InitiaOFT
        oft.moveVMConnection = restClient
        oft.oft_address = '0x884E0D02D306E54D579910C7F87F697F07030F2D503C7CB5A04A6F135352B936'
        oft.eid = EndpointId.BSC_V2_TESTNET
        oft.accountAddress = '0x2e2de55e5162d58c41de389ccf6d7ca8de3940a6'
        ;(oft as unknown as { rest: RESTClient }).rest = restClient
    })

    describe('getRateLimitConfig', () => {
        test('should return rate limit config as [bigint, bigint]', async () => {
            viewFunctionMock.mockResolvedValueOnce(['100', '200'])
            const result = await oft.getRateLimitConfig(EndpointId.BSC_V2_TESTNET, OFTType.OFT_FA)
            expect(result).toEqual([100n, 200n])
            expect(viewFunctionMock).toHaveBeenCalledTimes(1)
        })
    })

    describe('getFeeBps', () => {
        test('should return fee bps as bigint', async () => {
            viewFunctionMock.mockResolvedValueOnce('250')
            const result = await oft.getFeeBps(OFTType.OFT_FA)
            expect(result).toBe(250n)
            expect(viewFunctionMock).toHaveBeenCalledTimes(1)
        })
    })

    describe('getBalance', () => {
        test('should return balance as number', async () => {
            viewFunctionMock.mockResolvedValueOnce('42')
            const result = await oft.getBalance('0x123')
            expect(typeof result).toBe('number')
            expect(result).toBe(42)
            expect(viewFunctionMock).toHaveBeenCalledTimes(1)
        })
    })

    describe('getDelegate', () => {
        test('should return delegate address as string', async () => {
            viewFunctionMock.mockResolvedValueOnce('0xabcdef')
            const result = await oft.getDelegate()
            expect(typeof result).toBe('string')
            expect(result.startsWith('0x')).toBe(true)
            expect(result).toBe('0xabcdef')
            expect(viewFunctionMock).toHaveBeenCalledTimes(1)
        })
    })

    describe('getAdmin', () => {
        test('should return admin address as string', async () => {
            viewFunctionMock.mockResolvedValueOnce('0x123456')
            const result = await oft.getAdmin()
            expect(typeof result).toBe('string')
            expect(result.startsWith('0x')).toBe(true)
            expect(result).toBe('0x123456')
            expect(viewFunctionMock).toHaveBeenCalledTimes(1)
        })
    })

    describe('getPeer', () => {
        test('should return peer address as string', async () => {
            viewFunctionMock.mockResolvedValueOnce('0xfeedface')
            const result = await oft.getPeer(EndpointId.BSC_V2_TESTNET)
            expect(typeof result).toBe('string')
            expect(result.startsWith('0x')).toBe(true)
            expect(result).toBe('0xfeedface')
            expect(viewFunctionMock).toHaveBeenCalledTimes(1)
        })
    })

    describe('hasPeer', () => {
        test('should return boolean', async () => {
            viewFunctionMock.mockResolvedValueOnce(true)
            const result = await oft.hasPeer(EndpointId.BSC_V2_TESTNET)
            expect(typeof result).toBe('boolean')
            expect(result).toBe(true)
            expect(viewFunctionMock).toHaveBeenCalledTimes(1)
        })
    })

    describe('getEnforcedOptions', () => {
        test('should return enforced options as string', async () => {
            viewFunctionMock.mockResolvedValueOnce('abcd')
            const result = await oft.getEnforcedOptions(EndpointId.BSC_V2_TESTNET, 1)
            expect(typeof result).toBe('string')
            expect(result).toBe('0xabcd')
            expect(viewFunctionMock).toHaveBeenCalledTimes(1)
        })
    })
})
