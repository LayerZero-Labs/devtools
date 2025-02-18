import hre from 'hardhat'
import { isFile, promptToContinue } from '@layerzerolabs/io-devtools'
import { join, relative } from 'path'
import { TASK_LZ_OAPP_READ_WIRE } from '@layerzerolabs/ua-devtools-evm-hardhat'
import { cwd } from 'process'
import { deployContract, setupDefaultEndpointV2 } from '@layerzerolabs/test-setup-devtools-evm-hardhat'
import { createGnosisSignerFactory, createSignerFactory } from '@layerzerolabs/devtools-evm-hardhat'

jest.mock('@layerzerolabs/io-devtools', () => {
    const original = jest.requireActual('@layerzerolabs/io-devtools')

    return {
        ...original,
        promptToContinue: jest.fn().mockRejectedValue('Not mocked'),
    }
})

jest.mock('@layerzerolabs/devtools-evm-hardhat', () => {
    const original = jest.requireActual('@layerzerolabs/devtools-evm-hardhat')

    return {
        ...original,
        createGnosisSignerFactory: jest.fn(original.createGnosisSignerFactory),
        createSignerFactory: jest.fn(original.createSignerFactory),
    }
})

const hreRunSpy = jest.spyOn(hre, 'run')
const promptToContinueMock = promptToContinue as jest.Mock
const createGnosisSignerFactoryMock = createGnosisSignerFactory as jest.Mock
const createSignerFactoryMock = createSignerFactory as jest.Mock

describe(`task ${TASK_LZ_OAPP_READ_WIRE}`, () => {
    // Helper matcher object that checks for OmniPoint objects
    const expectOmniPoint = { address: expect.any(String), eid: expect.any(Number) }
    // Helper matcher object that checks for OmniTransaction objects
    const expectTransaction = { data: expect.any(String), point: expectOmniPoint, description: expect.any(String) }
    const expectTransactionWithReceipt = { receipt: expect.any(Object), transaction: expectTransaction }

    const CONFIGS_BASE_DIR = relative(cwd(), join(__dirname, '__data__', 'configs'))
    const configPathFixture = (fileName: string): string => {
        const path = join(CONFIGS_BASE_DIR, fileName)

        expect(isFile(path)).toBeTruthy()

        return path
    }

    beforeAll(async () => {
        await deployContract('EndpointV2')
        await setupDefaultEndpointV2()
    })

    beforeEach(async () => {
        promptToContinueMock.mockReset()
        createGnosisSignerFactoryMock.mockClear()
        createSignerFactoryMock.mockClear()
        hreRunSpy.mockClear()
    })

    describe('with invalid configs', () => {
        beforeAll(async () => {
            await deployContract('OApp')
        })

        it('should work', async () => {
            await deployContract('OAppRead')
            const oappConfig = configPathFixture('valid.config.read.js')

            promptToContinueMock.mockResolvedValue(false)

            const result = await hre.run(TASK_LZ_OAPP_READ_WIRE, { oappConfig, ci: true })

            expect(result).toEqual([[expectTransactionWithReceipt, expectTransactionWithReceipt], [], []])
            expect(promptToContinueMock).not.toHaveBeenCalled()
        })
    })
})
