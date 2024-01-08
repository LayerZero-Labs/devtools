import hre from 'hardhat'
import { resolve } from 'path'
import { isFile, promptToContinue } from '@layerzerolabs/io-devtools'
import { deployOAppFixture } from '../../__utils__/oapp'
import { TASK_LZ_CHECK_WIRE_OAPP, TASK_LZ_WIRE_OAPP } from '@layerzerolabs/ua-devtools-evm-hardhat'
jest.mock('@layerzerolabs/io-devtools', () => {
    const original = jest.requireActual('@layerzerolabs/io-devtools')

    return {
        ...original,
        promptToContinue: jest.fn().mockRejectedValue('Not mocked'),
    }
})

const promptToContinueMock = promptToContinue as jest.Mock

describe('task: checkWire', () => {
    const CONFIGS_BASE_DIR = resolve(__dirname, '__data__', 'configs')
    const configPathFixture = (fileName: string): string => {
        const path = resolve(CONFIGS_BASE_DIR, fileName)
        expect(isFile(path)).toBeTruthy()
        return path
    }

    beforeEach(async () => {
        await deployOAppFixture()
    })

    it('should show no chains are connected', async () => {
        const oappConfig = configPathFixture('valid.config.connected.js')
        const result = await hre.run(TASK_LZ_CHECK_WIRE_OAPP, { oappConfig })
        const expectPoint = { eid: expect.any(Number), address: expect.any(String) }
        const expectVector = { from: expectPoint, to: expectPoint }
        expect(result).toEqual([
            { vector: expectVector, hasPeer: false },
            { vector: expectVector, hasPeer: false },
        ])
    })

    it('should show both chains are connected after running wire', async () => {
        promptToContinueMock.mockReset()
        promptToContinueMock
            .mockResolvedValueOnce(false) // We don't want to see the list
            .mockResolvedValueOnce(true) // We want to continue

        const oappConfig = configPathFixture('valid.config.connected.js')
        await hre.run(TASK_LZ_WIRE_OAPP, { oappConfig })
        const result = await hre.run(TASK_LZ_CHECK_WIRE_OAPP, { oappConfig })
        const expectPoint = { eid: expect.any(Number), address: expect.any(String) }
        const expectVector = { from: expectPoint, to: expectPoint }
        expect(result).toEqual([
            { vector: expectVector, hasPeer: true },
            { vector: expectVector, hasPeer: true },
        ])
    })
})
