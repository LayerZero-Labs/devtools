import { OAppEdgeConfig, OAppReadNodeConfig } from '@layerzerolabs/ua-devtools'
import { OmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/devtools-evm-hardhat'
import {
    ethDvn,
    ethExecutor,
    ethSendUln2_Opt2,
    ethReceiveUln2_Opt2,
    ethReadLib,
    avaxDvn,
    avaxExecutor,
    avaxSendUln2_Opt2,
    avaxReceiveUln2_Opt2,
    avaxReadLib,
} from '@/endpointV2'
import { getLibraryAddress, OAppTestConfig } from '@/oapp/setup'

export type OAppReadTestConfig = OAppTestConfig & {
    readLibrary: string
    readLibraryExecutor: string
    readLibraryUlnRequiredDVNs: string[]
    readLibraryUlnOptionalDVNs: string[]
    readLibraryUlnOptionalDVNThreshold: number
}

export const setUpReadOmniGraphHardhat = (
    ethContract: OmniPointHardhat,
    ethOAppEdgeConfig: OAppEdgeConfig,
    ethOAppNodeConfig: OAppReadNodeConfig,
    avaxContract: OmniPointHardhat,
    avaxOAppEdgeConfig: OAppEdgeConfig,
    avaxOAppNodeConfig: OAppReadNodeConfig
): OmniGraphHardhat<OAppReadNodeConfig, OAppEdgeConfig> => {
    return {
        contracts: [
            {
                contract: ethContract,
                config: ethOAppNodeConfig,
            },
            {
                contract: avaxContract,
                config: avaxOAppNodeConfig,
            },
        ],
        connections: [
            {
                from: ethContract,
                to: avaxContract,
                config: ethOAppEdgeConfig,
            },
            {
                from: avaxContract,
                to: ethContract,
                config: avaxOAppEdgeConfig,
            },
        ],
    }
}

export const getReadDefaultEthConfig = async (): Promise<OAppReadTestConfig> => {
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
        readLibrary: await getLibraryAddress(ethReadLib),
        readLibraryExecutor: await getLibraryAddress(ethExecutor),
        readLibraryUlnRequiredDVNs: ethReceiveUlnRequiredDVNs,
        readLibraryUlnOptionalDVNs: ethReceiveUlnOptionalDVNs,
        readLibraryUlnOptionalDVNThreshold: 0,
    }
}

export const getReadDefaultAvaxConfig = async (): Promise<OAppReadTestConfig> => {
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
        readLibrary: await getLibraryAddress(avaxReadLib),
        readLibraryExecutor: await getLibraryAddress(avaxExecutor),
        readLibraryUlnRequiredDVNs: avaxReceiveUlnRequiredDVNs,
        readLibraryUlnOptionalDVNs: avaxReceiveUlnOptionalDVNs,
        readLibraryUlnOptionalDVNThreshold: 0,
    }
}
