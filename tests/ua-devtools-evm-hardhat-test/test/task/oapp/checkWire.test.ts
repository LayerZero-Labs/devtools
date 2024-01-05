import hre from 'hardhat'
import { resolve } from 'path'
import { isFile } from '@layerzerolabs/io-devtools'
import { deployOAppFixture } from '../../__utils__/oapp'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { createContractFactory, createSignerFactory } from '@layerzerolabs/devtools-evm-hardhat'
import { omniContractToPoint } from '@layerzerolabs/devtools-evm'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import { TASK_LZ_CHECK_WIRE_OAPP } from '@layerzerolabs/ua-devtools-evm-hardhat'

describe.only('task: checkWire', () => {
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
        await expect(hre.run(TASK_LZ_CHECK_WIRE_OAPP, { oappConfig })).resolves.toMatchSnapshot()
    })

    it('should show one chain (eth) is connected', async () => {
        const oappConfig = configPathFixture('valid.config.connected.js')
        const ethContract = {
            eid: EndpointId.ETHEREUM_MAINNET,
            contractName: 'DefaultOApp',
        }
        const avaxContract = {
            eid: EndpointId.AVALANCHE_MAINNET,
            contractName: 'DefaultOApp',
        }
        const contractFactory = createContractFactory()
        const sdkFactory = createOAppFactory(contractFactory)
        const ethPoint = omniContractToPoint(await contractFactory(ethContract))
        const ethOAppSdk = await sdkFactory(ethPoint)
        const avaxPoint = omniContractToPoint(await contractFactory(avaxContract))
        {
            const signerFactory = createSignerFactory()
            const ethSigner = await signerFactory(ethContract.eid)
            await ethSigner.signAndSend(await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address))
        }
        await expect(hre.run(TASK_LZ_CHECK_WIRE_OAPP, { oappConfig })).resolves.toMatchSnapshot()
    })

    it('should show all chains are connected', async () => {
        const oappConfig = configPathFixture('valid.config.connected.js')
        const ethContract = {
            eid: EndpointId.ETHEREUM_MAINNET,
            contractName: 'DefaultOApp',
        }
        const avaxContract = {
            eid: EndpointId.AVALANCHE_MAINNET,
            contractName: 'DefaultOApp',
        }
        const contractFactory = createContractFactory()
        const sdkFactory = createOAppFactory(contractFactory)

        const ethPoint = omniContractToPoint(await contractFactory(ethContract))
        const ethOAppSdk = await sdkFactory(ethPoint)
        const avaxPoint = omniContractToPoint(await contractFactory(avaxContract))
        const avaxOAppSdk = await sdkFactory(avaxPoint)
        {
            const signerFactory = createSignerFactory()

            const ethSigner = await signerFactory(ethContract.eid)
            await ethSigner.signAndSend(await ethOAppSdk.setPeer(avaxPoint.eid, avaxPoint.address))

            const avaxSigner = await signerFactory(avaxContract.eid)
            await avaxSigner.signAndSend(await avaxOAppSdk.setPeer(ethPoint.eid, ethPoint.address))
        }
        await expect(hre.run(TASK_LZ_CHECK_WIRE_OAPP, { oappConfig })).resolves.toMatchSnapshot()
    })
})
