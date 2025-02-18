import {
    defaultExecutorDstConfig,
    deployContract,
    setupDefaultEndpointV2,
} from '@layerzerolabs/test-setup-devtools-evm-hardhat'
import hre from 'hardhat'
import { TASK_LZ_OAPP_CONFIG_GET_EXECUTOR } from '@layerzerolabs/ua-devtools-evm-hardhat'

describe(`task ${TASK_LZ_OAPP_CONFIG_GET_EXECUTOR}`, () => {
    beforeEach(async () => {
        await deployContract('EndpointV2')
        await setupDefaultEndpointV2()
    })

    it('should return destination executor configurations with passed in networks', async () => {
        const networks = ['britney', 'vengaboys', 'tango']
        const executorConfigReturnData = await hre.run(TASK_LZ_OAPP_CONFIG_GET_EXECUTOR, { networks })
        for (const localNetwork of networks) {
            for (const remoteNetwork of networks) {
                if (localNetwork === remoteNetwork) {
                    continue
                }
                const executorConfig = executorConfigReturnData[localNetwork][remoteNetwork]
                expect(executorConfig).toEqual(defaultExecutorDstConfig)
            }
        }
    })

    it('should return destination executor configurations with no input', async () => {
        const executorConfigReturnData = await hre.run(TASK_LZ_OAPP_CONFIG_GET_EXECUTOR, {})
        const networks = ['britney', 'vengaboys', 'tango']
        for (const localNetwork of networks) {
            for (const remoteNetwork of networks) {
                if (localNetwork === remoteNetwork) {
                    continue
                }
                const executorConfig = executorConfigReturnData[localNetwork][remoteNetwork]
                expect(executorConfig).toEqual(defaultExecutorDstConfig)
            }
        }
    })
})
