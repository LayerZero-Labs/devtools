import { makeZeroAddress } from '@/address'
import { createContractErrorParser } from '@/errors/parser'
import { OmniContract } from '@/omnigraph'
import { OmniSDK } from '@/omnigraph/sdk'
import { Contract } from '@ethersproject/contracts'
import { EndpointId } from '@layerzerolabs/lz-definitions'

jest.mock('@/errors/parser', () => ({
    createContractErrorParser: jest.fn(),
}))

const createContractErrorParserMock = createContractErrorParser as jest.Mock

describe('omnigraph/sdk', () => {
    describe('OmniSDK', () => {
        describe('createErrorParser()', () => {
            let contract: OmniContract

            beforeEach(() => {
                createContractErrorParserMock.mockReset()

                contract = { contract: new Contract(makeZeroAddress(), []), eid: EndpointId.EON_V2_TESTNET }

                OmniSDK.registerErrorParserFactory(undefined)
            })

            afterEach(() => {
                contract = undefined!
            })

            it('should use createContractErrorParser if parser factory has not been registered', async () => {
                const expectedParser = jest.fn()
                createContractErrorParserMock.mockReturnValue(expectedParser)

                expect(OmniSDK.createErrorParser(contract)).toBe(expectedParser)
                expect(createContractErrorParserMock).toHaveBeenCalledWith(contract)
            })

            it('should use registered factory if registered', async () => {
                const expectedParser = jest.fn()
                const factory = jest.fn().mockReturnValue(expectedParser)

                OmniSDK.registerErrorParserFactory(factory)

                expect(OmniSDK.createErrorParser(contract)).toBe(expectedParser)
                expect(createContractErrorParserMock).not.toHaveBeenCalled()
            })

            it('should use createContractErrorParser if parser factory has been unregistered', async () => {
                const expectedParser = jest.fn()
                const unexpectedParser = jest.fn()

                createContractErrorParserMock.mockReturnValue(expectedParser)
                const factory = jest.fn().mockReturnValue(unexpectedParser)

                OmniSDK.registerErrorParserFactory(factory)
                OmniSDK.registerErrorParserFactory(undefined)

                expect(OmniSDK.createErrorParser(contract)).toBe(expectedParser)
                expect(createContractErrorParserMock).toHaveBeenCalledWith(contract)
            })
        })
    })
})
