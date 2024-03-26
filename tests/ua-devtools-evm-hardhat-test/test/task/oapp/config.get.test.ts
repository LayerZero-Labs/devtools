import {
    setupDefaultEndpointV2,
    getDefaultExecutorConfig,
    getDefaultUlnConfig,
    deployContract,
} from '@layerzerolabs/test-setup-devtools-evm-hardhat'
import { createContractFactory, getEidForNetworkName } from '@layerzerolabs/devtools-evm-hardhat'
import hre from 'hardhat'
import { TASK_LZ_OAPP_CONFIG_GET } from '@layerzerolabs/ua-devtools-evm-hardhat'
import { omniContractToPoint } from '@layerzerolabs/devtools-evm'
import { resolve } from 'path'
import { isFile } from '@layerzerolabs/io-devtools'

describe(`task ${TASK_LZ_OAPP_CONFIG_GET}`, () => {
    const CONFIGS_BASE_DIR = resolve(__dirname, '__data__', 'configs')
    const configPathFixture = (fileName: string): string => {
        const path = resolve(CONFIGS_BASE_DIR, fileName)
        expect(isFile(path)).toBeTruthy()
        return path
    }

    beforeEach(async () => {
        await deployContract('EndpointV2')
        await setupDefaultEndpointV2()
        await deployContract('OApp')
    })

    it('should return app specific configurations with a valid LayerZero OApp config', async () => {
        const oappConfig = configPathFixture('valid.config.connected.js')
        const networks = ['britney', 'vengaboys']
        const getDefaultConfigTask = await hre.run(TASK_LZ_OAPP_CONFIG_GET, { oappConfig })
        const contractFactory = createContractFactory()
        for (const localNetwork of networks) {
            const localEid = getEidForNetworkName(localNetwork)
            for (const remoteNetwork of networks) {
                if (localNetwork === remoteNetwork) {
                    continue
                }

                const defaultConfig = getDefaultConfigTask[localNetwork][remoteNetwork]
                const sendUln302 = await contractFactory({ contractName: 'SendUln302', eid: localEid })
                const receiveUln302 = await contractFactory({ contractName: 'ReceiveUln302', eid: localEid })
                const executor = await contractFactory({ contractName: 'Executor', eid: localEid })
                const executorPoint = omniContractToPoint(executor)
                const dvn = await contractFactory({ contractName: 'DVN', eid: localEid })
                const dvnPoint = omniContractToPoint(dvn)

                expect(defaultConfig.defaultSendLibrary).toEqual(sendUln302.contract.address)
                expect(defaultConfig.defaultReceiveLibrary).toEqual(receiveUln302.contract.address)
                expect(defaultConfig.sendExecutorConfig).toEqual(getDefaultExecutorConfig(executorPoint.address))
                expect(defaultConfig.sendUlnConfig).toEqual(getDefaultUlnConfig(dvnPoint.address))
                expect(defaultConfig.receiveUlnConfig).toEqual(getDefaultUlnConfig(dvnPoint.address))
            }
        }
    })
})
