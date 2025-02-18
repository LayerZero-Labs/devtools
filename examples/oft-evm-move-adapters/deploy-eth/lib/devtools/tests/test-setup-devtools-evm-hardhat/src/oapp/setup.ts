import { OAppEdgeConfig } from '@layerzerolabs/ua-devtools'
import { OmniGraphHardhat, OmniPointHardhat, createConnectedContractFactory } from '@layerzerolabs/devtools-evm-hardhat'
import {
    ethDvn,
    avaxDvn,
    ethSendUln2_Opt2,
    ethReceiveUln2_Opt2,
    avaxExecutor,
    avaxSendUln2_Opt2,
    avaxReceiveUln2_Opt2,
    ethExecutor,
} from '@/endpointV2'

export type OAppTestConfig = {
    sendLibrary: string
    receiveLibrary: string
    executorLibrary: string
    executorMaxMessageSize: number
    receiveTimeoutConfigLibrary: string
    receiveLibraryGracePeriod: bigint
    receiveLibraryTimeoutExpiry: bigint
    sendUlnConfirmations: bigint
    sendUlnRequiredDVNs: string[]
    sendUlnOptionalDVNs: string[]
    sendUlnOptionalDVNThreshold: number
    receiveUlnConfirmations: bigint
    receiveUlnRequiredDVNs: string[]
    receiveUlnOptionalDVNs: string[]
    receiveUlnOptionalDVNThreshold: number
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
                optionalDVNs: testConfig.sendUlnOptionalDVNs,
            },
        },
        receiveConfig: {
            ulnConfig: {
                confirmations: testConfig.receiveUlnConfirmations,
                optionalDVNThreshold: testConfig.receiveUlnOptionalDVNThreshold,
                requiredDVNs: testConfig.receiveUlnRequiredDVNs,
                optionalDVNs: testConfig.receiveUlnOptionalDVNs,
            },
        },
    }
}

export const setUpOmniGraphHardhat = (
    ethContract: OmniPointHardhat,
    ethOAppConfig: OAppEdgeConfig,
    avaxContract,
    avaxOAppConfig: OAppEdgeConfig
): OmniGraphHardhat<undefined, OAppEdgeConfig> => {
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
        receiveLibraryGracePeriod: BigInt(0),
        receiveLibraryTimeoutExpiry: BigInt(0),
        receiveUlnConfirmations: BigInt(24),
        receiveUlnOptionalDVNs: ethReceiveUlnOptionalDVNs,
        receiveUlnOptionalDVNThreshold: 0,
        receiveUlnRequiredDVNs: ethReceiveUlnRequiredDVNs,
        sendUlnConfirmations: BigInt(42),
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
        receiveLibraryGracePeriod: BigInt(0),
        receiveLibraryTimeoutExpiry: BigInt(0),
        receiveUlnConfirmations: BigInt(96),
        receiveUlnOptionalDVNs: avaxReceiveUlnOptionalDVNs,
        receiveUlnOptionalDVNThreshold: 0,
        receiveUlnRequiredDVNs: avaxSendUlnRequiredDVNs,
        sendUlnConfirmations: BigInt(69),
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
