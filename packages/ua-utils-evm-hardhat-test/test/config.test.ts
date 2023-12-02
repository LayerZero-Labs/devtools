import { expect } from 'chai'
import { describe } from 'mocha'
import { getNetworkRuntimeEnvironment } from '@layerzerolabs/utils-evm-hardhat'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { BigNumber, Contract, ethers, Wallet } from 'ethers'

const NETWORK_NAMES = ['vengaboys', 'britney']

type SetDefaultExecutorConfigParam = {
    eid: number
    config: ExecutorConfig
}

type ExecutorConfig = {
    maxMessageSize: number
    executor: string
}

type SetDefaultUlnConfigParam = {
    eid: number
    config: UlnConfig
}

type UlnConfig = {
    confirmations: number
    requiredVerifiersCount: number
    optionalVerifiersCount: number
    optionalVerifiersThreshold: number
    requiredVerifiers: string[]
    optionalVerifiers: string[]
}
describe('config', () => {
    describe(`Setting default configs for two endpoints`, () => {
        let environment_A: HardhatRuntimeEnvironment
        let sendUln302_A: Contract
        let receiveUln302_A: Contract
        let endpoint_A: Contract
        let endpointId_A: number
        let executerWallet_A: Wallet
        let executerAddress_A: string
        let verifierWallet_A: Wallet
        let verifierAddress_A: string

        let environment_B: HardhatRuntimeEnvironment
        let sendUln302_B: Contract
        let receiveUln302_B: Contract
        let endpoint_B: Contract
        let endpointId_B: number
        let executerWallet_B: Wallet
        let executerAddress_B: string
        let verifierWallet_B: Wallet
        let verifierAddress_B: string

        before(async () => {
            environment_A = await getNetworkRuntimeEnvironment('vengaboys')
            endpoint_A = await environment_A.ethers.getContract('EndpointV2')
            endpointId_A = await endpoint_A.eid()

            environment_B = await getNetworkRuntimeEnvironment('britney')
            endpoint_B = await environment_B.ethers.getContract('EndpointV2')
            endpointId_B = await endpoint_B.eid()

            expect(await endpoint_A.defaultSendLibrary(endpointId_B)).to.be.eql(
                environment_A.ethers.constants.AddressZero
            )
            expect(await endpoint_A.defaultSendLibrary(endpointId_B)).to.be.eql(
                environment_A.ethers.constants.AddressZero
            )
            expect(await endpoint_B.defaultSendLibrary(endpointId_A)).to.be.eql(
                environment_B.ethers.constants.AddressZero
            )
            expect(await endpoint_B.defaultSendLibrary(endpointId_A)).to.be.eql(
                environment_B.ethers.constants.AddressZero
            )
        })

        it('should set two endpoints up', async () => {
            sendUln302_A = await environment_A.ethers.getContract('SendUln302')
            receiveUln302_A = await environment_A.ethers.getContract('ReceiveUln302')

            executerWallet_A = await environment_A.ethers.Wallet.createRandom()
            executerAddress_A = executerWallet_A.address

            verifierWallet_A = await environment_A.ethers.Wallet.createRandom()
            verifierAddress_A = verifierWallet_A.address

            executerWallet_B = await environment_B.ethers.Wallet.createRandom()
            executerAddress_B = executerWallet_B.address

            verifierWallet_B = await environment_B.ethers.Wallet.createRandom()
            verifierAddress_B = verifierWallet_B.address

            let executorConfig = createExecutorConfig(1024, executerAddress_B)
            let setDefaultExecutorConfigParam = createSetDefaultExecutorConfigParam(endpointId_B, executorConfig)
            await sendUln302_A.setDefaultExecutorConfigs([setDefaultExecutorConfigParam])

            let ulnConfig = createUlnConfig(1, 1, 0, 0, [verifierAddress_B], [])
            let setDefaultUlnConfigParam = createSetDefaultUlnConfigParam(endpointId_B, ulnConfig)
            await sendUln302_A.setDefaultUlnConfigs([setDefaultUlnConfigParam])

            await endpoint_A.registerLibrary(sendUln302_A.address)
            await endpoint_A.setDefaultSendLibrary(endpointId_B, sendUln302_A.address)

            ulnConfig = createUlnConfig(1, 1, 0, 0, [verifierAddress_A], [])
            setDefaultUlnConfigParam = createSetDefaultUlnConfigParam(endpointId_B, ulnConfig)
            await receiveUln302_A.setDefaultUlnConfigs([setDefaultUlnConfigParam])

            await endpoint_A.registerLibrary(receiveUln302_A.address)
            await endpoint_A.setDefaultReceiveLibrary(endpointId_B, receiveUln302_A.address, 0)

            // sendUln302_B = await environment_B.ethers.getContract("SendUln302")
            // receiveUln302_B = await environment_B.ethers.getContract("ReceiveUln302")
            //
            // executorConfig = createExecutorConfig(1000, executerAddress_A);
            // setDefaultExecutorConfigParam = createSetDefaultExecutorConfigParam(endpointId_A, executorConfig)
            // await sendUln302_B.setDefaultExecutorConfigs([setDefaultExecutorConfigParam]);
            //
            // ulnConfig = createUlnConfig(2,1,0,0, [verifierAddress_A], []);
            // setDefaultUlnConfigParam = createSetDefaultUlnConfigParam(endpointId_A, ulnConfig)
            // await sendUln302_B.setDefaultUlnConfigs([setDefaultUlnConfigParam]);
            //
            // await endpoint_B.registerLibrary(sendUln302_B.address);
            // await endpoint_B.setDefaultSendLibrary(endpointId_A, sendUln302_B.address);

            expect(await endpoint_A.defaultSendLibrary(endpointId_B)).to.be.eql(sendUln302_A.address)
            expect(await endpoint_A.defaultReceiveLibrary(endpointId_B)).to.be.eql(receiveUln302_A.address)
            // expect(await endpoint_B.defaultSendLibrary(endpointId_A)).to.be.eql(sendUln302_B.address)
            // expect(await endpoint_B.defaultReceiveLibrary(endpointId_A)).to.be.eql(sendUln302_B.address)

            let getDefaultConfigTask = await environment_A.run('getDefaultConfig', { networks: 'vengaboys,britney' })
            console.log({ getDefaultConfigTask })
        })
    })
})

function createExecutorConfig(maxMessageSize: number, executor: string): ExecutorConfig {
    return {
        maxMessageSize,
        executor,
    }
}

function createSetDefaultExecutorConfigParam(eid: number, config: ExecutorConfig): SetDefaultExecutorConfigParam {
    return {
        eid,
        config,
    }
}

function createUlnConfig(
    confirmations: number,
    requiredVerifiersCount: number,
    optionalVerifiersCount: number,
    optionalVerifiersThreshold: number,
    requiredVerifiers: string[],
    optionalVerifiers: string[]
): UlnConfig {
    return {
        confirmations,
        requiredVerifiersCount,
        optionalVerifiersCount,
        optionalVerifiersThreshold,
        requiredVerifiers,
        optionalVerifiers,
    }
}

function createSetDefaultUlnConfigParam(eid: number, config: UlnConfig): SetDefaultUlnConfigParam {
    return {
        eid,
        config,
    }
}
