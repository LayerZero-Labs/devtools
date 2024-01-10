import hre from 'hardhat'
import { resolve } from 'path'
import { isFile } from '@layerzerolabs/io-devtools'
import { deployOAppFixture } from '../../__utils__/oapp'
import { TASK_LZ_OAPP_CONFIG_CHECK, TASK_LZ_OAPP_WIRE } from '@layerzerolabs/ua-devtools-evm-hardhat'

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
        const result = await hre.run(TASK_LZ_OAPP_CONFIG_CHECK, { oappConfig })
        const expectPoint = { eid: expect.any(Number), address: expect.any(String) }
        const expectVector = { from: expectPoint, to: expectPoint }
        expect(result).toEqual([
            { vector: expectVector, hasPeer: false },
            { vector: expectVector, hasPeer: false },
        ])
    })

    it('should show both chains are connected after running wire', async () => {
        const oappConfig = configPathFixture('valid.config.connected.js')
        await hre.run(TASK_LZ_OAPP_WIRE, { oappConfig, ci: true })
        const result = await hre.run(TASK_LZ_OAPP_CONFIG_CHECK, { oappConfig })
        const expectPoint = { eid: expect.any(Number), address: expect.any(String) }
        const expectVector = { from: expectPoint, to: expectPoint }
        expect(result).toEqual([
            { vector: expectVector, hasPeer: true },
            { vector: expectVector, hasPeer: true },
        ])
    })
})
