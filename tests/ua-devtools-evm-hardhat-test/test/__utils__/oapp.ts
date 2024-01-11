import { EndpointId } from '@layerzerolabs/lz-definitions'
import { OAppEdgeConfig } from '@layerzerolabs/ua-devtools'
import {
    OmniGraphHardhat,
    OmniPointHardhat,
    createConnectedContractFactory,
    createGetHreByEid,
} from '@layerzerolabs/devtools-evm-hardhat'
import {
    ethDvn,
    avaxDvn,
    ethSendUln2_Opt2,
    ethReceiveUln2_Opt2,
    avaxExecutor,
    avaxSendUln2_Opt2,
    avaxReceiveUln2_Opt2,
    ethExecutor,
} from './endpoint'

export type OAppTestConfig = {
    sendLibrary: string
    receiveLibrary: string
    executorLibrary: string
    executorMaxMessageSize: number
    receiveTimeoutConfigLibrary: string
    receiveLibraryGracePeriod: number
    receiveLibraryTimeoutExpiry: number
    sendUlnConfirmations: number
    sendUlnRequiredDVNs: string[]
    sendUlnOptionalDVNs: string[]
    sendUlnOptionalDVNThreshold: number
    receiveUlnConfirmations: number
    receiveUlnRequiredDVNs: string[]
    receiveUlnOptionalDVNs: string[]
    receiveUlnOptionalDVNThreshold: number
}

export const deployOApp = async () => {
    const environmentFactory = createGetHreByEid()
    const eth = await environmentFactory(EndpointId.ETHEREUM_V2_MAINNET)
    const avax = await environmentFactory(EndpointId.AVALANCHE_V2_MAINNET)

    await Promise.all([
        eth.deployments.run('OApp', { writeDeploymentsToFiles: true, resetMemory: false }),
        avax.deployments.run('OApp', { writeDeploymentsToFiles: true, resetMemory: false }),
    ])
}

export const setUpConfig = async (testConfig: OAppTestConfig): Promise<OAppEdgeConfig> => {
    return {
        sendLibrary: testConfig.sendLibrary,
        receiveLibraryConfig: {
            receiveLibrary: testConfig.receiveLibrary,
            gracePeriod: testConfig.receiveLibraryGracePeriod,
        },
        receiveLibraryTimeoutConfig: {
            lib: testConfig.receiveTimeoutConfigLibrary,
            expiry: testConfig.receiveLibraryTimeoutExpiry,
        },
        sendConfig: {
            executorConfig: {
                maxMessageSize: testConfig.executorMaxMessageSize,
                executor: testConfig.executorLibrary,
            },
            ulnConfig: {
                confirmations: testConfig.sendUlnConfirmations,
                optionalDVNThreshold: testConfig.sendUlnOptionalDVNThreshold,
                requiredDVNs: testConfig.sendUlnRequiredDVNs,
                requiredDVNCount: testConfig.sendUlnOptionalDVNs.length,
                optionalDVNs: testConfig.sendUlnOptionalDVNs,
                optionalDVNCount: testConfig.sendUlnOptionalDVNs.length,
            },
        },
        receiveConfig: {
            ulnConfig: {
                confirmations: testConfig.receiveUlnConfirmations,
                optionalDVNThreshold: testConfig.receiveUlnOptionalDVNThreshold,
                requiredDVNs: testConfig.receiveUlnRequiredDVNs,
                requiredDVNCount: testConfig.receiveUlnRequiredDVNs.length,
                optionalDVNs: testConfig.receiveUlnOptionalDVNs,
                optionalDVNCount: testConfig.receiveUlnOptionalDVNs.length,
            },
        },
    }
}

export const setUpOmniGraphHardhat = (
    ethContract: OmniPointHardhat,
    ethOAppConfig: OAppEdgeConfig,
    avaxContract,
    avaxOAppConfig: OAppEdgeConfig
): OmniGraphHardhat<unknown, OAppEdgeConfig> => {
    return {
        contracts: [
            {
                contract: ethContract,
            },
            {
                contract: avaxContract,
            },
        ],
        connections: [
            {
                from: ethContract,
                to: avaxContract,
                config: ethOAppConfig,
            },
            {
                from: avaxContract,
                to: ethContract,
                config: avaxOAppConfig,
            },
        ],
    }
}

export const getDefaultEthConfig = async (): Promise<OAppTestConfig> => {
    const ethDVNAddress = await getLibraryAddress(ethDvn)
    const avaxDvnPoint = await getLibraryAddress(avaxDvn)
    const ethSendUlnRequiredDVNs: string[] = [avaxDvnPoint]
    const ethSendUlnOptionalDVNs: string[] = [avaxDvnPoint]
    const ethReceiveUlnRequiredDVNs: string[] = [ethDVNAddress]
    const ethReceiveUlnOptionalDVNs: string[] = [ethDVNAddress]

    return {
        sendLibrary: await getLibraryAddress(ethSendUln2_Opt2),
        receiveLibrary: await getLibraryAddress(ethReceiveUln2_Opt2),
        executorLibrary: await getLibraryAddress(avaxExecutor),
        executorMaxMessageSize: 100,
        receiveTimeoutConfigLibrary: await getLibraryAddress(ethReceiveUln2_Opt2),
        receiveLibraryGracePeriod: 0,
        receiveLibraryTimeoutExpiry: 0,
        receiveUlnConfirmations: 24,
        receiveUlnOptionalDVNs: ethReceiveUlnOptionalDVNs,
        receiveUlnOptionalDVNThreshold: 0,
        receiveUlnRequiredDVNs: ethReceiveUlnRequiredDVNs,
        sendUlnConfirmations: 42,
        sendUlnOptionalDVNs: ethSendUlnOptionalDVNs,
        sendUlnOptionalDVNThreshold: 0,
        sendUlnRequiredDVNs: ethSendUlnRequiredDVNs,
    }
}

export const getDefaultAvaxConfig = async (): Promise<OAppTestConfig> => {
    const ethDVNAddress = await getLibraryAddress(ethDvn)
    const avaxDvnPoint = await getLibraryAddress(avaxDvn)
    const avaxSendUlnRequiredDVNs: string[] = [ethDVNAddress]
    const avaxSendUlnOptionalDVNs: string[] = [ethDVNAddress]
    const avaxReceiveUlnRequiredDVNs: string[] = [avaxDvnPoint]
    const avaxReceiveUlnOptionalDVNs: string[] = [avaxDvnPoint]

    return {
        sendLibrary: await getLibraryAddress(avaxSendUln2_Opt2),
        receiveLibrary: await getLibraryAddress(avaxReceiveUln2_Opt2),
        executorLibrary: await getLibraryAddress(ethExecutor),
        executorMaxMessageSize: 999,
        receiveTimeoutConfigLibrary: await getLibraryAddress(avaxReceiveUln2_Opt2),
        receiveLibraryGracePeriod: 0,
        receiveLibraryTimeoutExpiry: 0,
        receiveUlnConfirmations: 96,
        receiveUlnOptionalDVNs: avaxReceiveUlnOptionalDVNs,
        receiveUlnOptionalDVNThreshold: 0,
        receiveUlnRequiredDVNs: avaxSendUlnRequiredDVNs,
        sendUlnConfirmations: 69,
        sendUlnOptionalDVNs: avaxSendUlnOptionalDVNs,
        sendUlnOptionalDVNThreshold: 0,
        sendUlnRequiredDVNs: avaxReceiveUlnRequiredDVNs,
    }
}

export const getLibraryAddress = async (library: OmniPointHardhat): Promise<string> => {
    const contractFactory = createConnectedContractFactory()
    const { contract } = await contractFactory(library)
    return contract.address
}
