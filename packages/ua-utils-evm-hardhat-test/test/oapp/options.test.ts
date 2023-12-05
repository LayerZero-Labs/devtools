import { EndpointId } from '@layerzerolabs/lz-definitions'
import { OmniTransaction } from '@layerzerolabs/utils'
import { omniContractToPoint } from '@layerzerolabs/utils-evm'
import {
    createConnectedContractFactory,
    createSignerFactory,
    OmniGraphBuilderHardhat,
    OmniGraphHardhat,
} from '@layerzerolabs/utils-evm-hardhat'

import { Options } from '@layerzerolabs/lz-utility-v2'
import { ethEndpoint, setupDefaultEndpoint } from '../__utils__/endpoint'
import { deployOApp } from '../__utils__/oapp'
import { configureOApp } from '@layerzerolabs/ua-utils'
import { parseEther } from 'ethers/lib/utils'
import { createOmniCounterAppFactory } from '@layerzerolabs/omnicounter-utils-evm'

describe('oapp/options', () => {
    beforeEach(async () => {
        await setupDefaultEndpoint()
        await deployOApp()
    })

    it('should build options as expected', async () => {
        const opt = Options.newOptions().addExecutorLzReceiveOption(100, 100)
        expect(opt.toHex()).toEqual('0x0003010021010000000000000000000000000000006400000000000000000000000000000064')
    })
    ;[
        {
            it: 'addExecutorLzReceiveOption without amount',
            options: {
                gas: 10,
                amount: 0,
            },
            expected: '0x0003010011010000000000000000000000000000000a',
        },
        {
            it: 'addExecutorLzReceiveOption with 11 as amount',
            options: {
                gas: 10,
                amount: 11,
            },
            expected: '0x0003010021010000000000000000000000000000000a0000000000000000000000000000000b',
        },
    ].forEach((test) => {
        it(test.it, async () => {
            const opt = Options.newOptions()
            opt.addExecutorLzReceiveOption(test.options.gas, test.options.amount)
            expect(opt.toHex()).toEqual(test.expected)
        })
    })

    const ethContract = { eid: EndpointId.ETHEREUM_MAINNET, contractName: 'DefaultOApp' }
    const avaxContract = { eid: EndpointId.AVALANCHE_MAINNET, contractName: 'DefaultOApp' }

    // This is the OApp config that we want to use against our contracts
    const config: OmniGraphHardhat = {
        contracts: [
            {
                contract: ethContract,
                config: undefined,
            },
            {
                contract: avaxContract,
                config: undefined,
            },
        ],
        connections: [
            {
                from: ethContract,
                to: avaxContract,
                config: undefined,
            },
            {
                from: avaxContract,
                to: ethContract,
                config: undefined,
            },
        ],
    }

    it('should increment with the correct options', async () => {
        const contractFactory = createConnectedContractFactory()
        const sdkFactory = createOmniCounterAppFactory(contractFactory)

        const ethPoint = omniContractToPoint(await contractFactory(ethContract))
        const avaxPoint = omniContractToPoint(await contractFactory(avaxContract))

        const builder = await OmniGraphBuilderHardhat.fromConfig(config)
        await configureOApp(builder.graph, sdkFactory)
        const signerFactory = createSignerFactory()
        const ethSigner = await signerFactory(ethContract.eid)
        const avaxSigner = await signerFactory(avaxContract.eid)

        const ethSdk = await sdkFactory(ethPoint)
        const avaxSdk = await sdkFactory(avaxPoint)
        {
            const ethTransaction = {
                ...(await ethSdk.setPeer(avaxPoint.eid, avaxPoint.address)),
                gasLimit: '1000000',
            }
            const ethResponse = await ethSigner.signAndSend(ethTransaction)
            const ethReceipt = await ethResponse.wait()
            expect(ethReceipt.from).toEqual(await ethSigner.signer.getAddress())
        }

        {
            const tx = {
                ...(await avaxSdk.setPeer(ethEndpoint.eid, ethPoint.address)),
                gasLimit: '1000000',
            }
            const ethResponse = await avaxSigner.signAndSend(tx)
            await ethResponse.wait()
        }

        const opt1 = Options.newOptions().addExecutorLzReceiveOption(200000)
        const tx1: OmniTransaction = {
            ...(await ethSdk.increment(avaxPoint.eid, 1, opt1.toHex())),
            gasLimit: 2000001,
            value: parseEther('1').toString(),
        }
        console.dir({ tx1 }, { depth: null })

        const ethResponse = await ethSigner.signAndSend(tx1)
        console.dir(ethResponse, { depth: null })
        const ethReceipt = await ethResponse.wait()
        expect(ethReceipt.from).toEqual(await ethSigner.signer.getAddress())

        console.dir(ethResponse, { depth: null })
    })
})
