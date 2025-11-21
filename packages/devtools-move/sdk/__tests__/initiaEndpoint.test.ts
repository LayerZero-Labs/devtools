import { describe, expect, test, beforeEach, jest } from '@jest/globals'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { InitiaEndpoint } from '../initiaEndpoint'
import { RESTClient } from '@initia/initia.js'

describe('InitiaEndpoint View Methods', () => {
    let endpoint: InitiaEndpoint
    let viewFunctionMock: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>

    beforeEach(() => {
        viewFunctionMock = jest.fn() as jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>
        const restClient = {
            move: {
                viewFunction: viewFunctionMock,
            },
        } as unknown as RESTClient
        const testEndpointAddress = '0xcc4e9fda80712972deb0338d85b84822a42d5155b645ef1b2eeae42cedd41b04'
        endpoint = new InitiaEndpoint(restClient, testEndpointAddress)
    })

    describe('getDefaultSendLibrary', () => {
        test('should return library address as string', async () => {
            viewFunctionMock.mockResolvedValueOnce('0xabc')
            const result = await endpoint.getDefaultSendLibrary(EndpointId.BSC_V2_TESTNET)
            expect(typeof result).toBe('string')
            expect(result.startsWith('0x')).toBe(true)
            expect(viewFunctionMock).toHaveBeenCalledTimes(1)
        })
    })

    describe('getSendLibrary', () => {
        test('should return [string, boolean] tuple', async () => {
            const testOftAddress = '0x884E0D02D306E54D579910C7F87F697F07030F2D503C7CB5A04A6F135352B936'
            viewFunctionMock.mockResolvedValueOnce(['0xdef', true])
            const result = await endpoint.getSendLibrary(testOftAddress, EndpointId.BSC_V2_TESTNET)
            expect(Array.isArray(result)).toBe(true)
            expect(result.length).toBe(2)
            expect(typeof result[0]).toBe('string')
            expect(result[0].startsWith('0x')).toBe(true)
            expect(typeof result[1]).toBe('boolean')
            expect(viewFunctionMock).toHaveBeenCalledTimes(1)
        })
    })

    describe('getReceiveLibrary', () => {
        test('should return [string, boolean] tuple', async () => {
            const testOftAddress = '0x884E0D02D306E54D579910C7F87F697F07030F2D503C7CB5A04A6F135352B936'
            viewFunctionMock.mockResolvedValueOnce(['0xghi', false])
            const result = await endpoint.getReceiveLibrary(testOftAddress, EndpointId.BSC_V2_TESTNET)
            expect(Array.isArray(result)).toBe(true)
            expect(result.length).toBe(2)
            expect(typeof result[0]).toBe('string')
            expect(result[0].startsWith('0x')).toBe(true)
            expect(typeof result[1]).toBe('boolean')
            expect(viewFunctionMock).toHaveBeenCalledTimes(1)
        })
    })

    describe('getDefaultReceiveLibraryTimeout', () => {
        test('should return LibraryTimeoutResponse with correct types', async () => {
            viewFunctionMock.mockResolvedValueOnce(['1234', '0xabc'])
            const result = await endpoint.getDefaultReceiveLibraryTimeout(EndpointId.BSC_V2_TESTNET)
            expect(typeof result).toBe('object')
            expect(typeof result.expiry).toBe('bigint')
            expect(typeof result.lib).toBe('string')
            expect(result.lib.startsWith('0x')).toBe(true)
            expect(viewFunctionMock).toHaveBeenCalledTimes(1)
        })
    })

    describe('getReceiveLibraryTimeout', () => {
        test('should return LibraryTimeoutResponse with correct types', async () => {
            const testOftAddress = '0x884E0D02D306E54D579910C7F87F697F07030F2D503C7CB5A04A6F135352B936'
            viewFunctionMock.mockResolvedValueOnce(['42', '0x123'])
            const result = await endpoint.getReceiveLibraryTimeout(testOftAddress, EndpointId.BSC_V2_TESTNET)
            expect(typeof result).toBe('object')
            expect(typeof result.expiry).toBe('bigint')
            expect(typeof result.lib).toBe('string')
            // For error case, lib might be empty string
            if (result.lib) {
                expect(result.lib.startsWith('0x')).toBe(true)
            }
            expect(viewFunctionMock).toHaveBeenCalledTimes(1)
        })
    })

    describe('getDefaultReceiveLibrary', () => {
        test('should return library address as string', async () => {
            viewFunctionMock.mockResolvedValueOnce('0xabc')
            const result = await endpoint.getDefaultReceiveLibrary(EndpointId.BSC_V2_TESTNET)
            expect(typeof result).toBe('string')
            expect(result.startsWith('0x')).toBe(true)
            expect(viewFunctionMock).toHaveBeenCalledTimes(1)
        })
    })

    describe('getConfig', () => {
        test('should return config as Uint8Array', async () => {
            const testOftAddress = '0x884E0D02D306E54D579910C7F87F697F07030F2D503C7CB5A04A6F135352B936'
            const testMsgLibAddress = '0x3e1b182c40965a986133798e1da76302ef327de2c32c58110361587560285e88'
            viewFunctionMock.mockResolvedValueOnce('0x1234')
            const result = await endpoint.getConfig(testOftAddress, testMsgLibAddress, EndpointId.BSC_V2_TESTNET, 1)
            expect(result instanceof Uint8Array).toBe(true)
            expect(Array.from(result)).toEqual(Array.from(Buffer.from('1234', 'hex')))
            expect(viewFunctionMock).toHaveBeenCalledTimes(1)
        })
    })
})
