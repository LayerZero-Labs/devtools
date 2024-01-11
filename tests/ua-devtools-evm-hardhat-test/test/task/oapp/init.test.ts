import hre from 'hardhat'
import { promptToContinue } from '@layerzerolabs/io-devtools'
import { TASK_LZ_OAPP_CONFIG_INIT } from '@layerzerolabs/ua-devtools-evm-hardhat'
import { deployOAppFixture } from '../../__utils__/oapp'

jest.mock('@layerzerolabs/io-devtools', () => {
    const original = jest.requireActual('@layerzerolabs/io-devtools')

    return {
        ...original,
        promptToContinue: jest.fn().mockRejectedValue('Not mocked'),
    }
})

const promptToContinueMock = promptToContinue as jest.Mock

describe(`task ${TASK_LZ_OAPP_CONFIG_INIT}`, () => {
    beforeAll(async () => {
        await deployOAppFixture()
    })

    beforeEach(async () => {
        promptToContinueMock.mockReset()
    })

    it('should do nothing', async () => {
        await expect(hre.run(TASK_LZ_OAPP_CONFIG_INIT, {})).resolves.toBeUndefined()
    })
})
