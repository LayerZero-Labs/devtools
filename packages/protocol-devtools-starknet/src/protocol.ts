import { Contract } from 'starknet'
import { abi } from '@layerzerolabs/protocol-starknet-v2'

type StarknetProvider = unknown

export enum MessageLibConfigType {
    EXECUTOR = 1,
    ULN = 2,
}

type ExecutorConfigInput = {
    max_message_size?: number
    maxMessageSize?: number
    executor: string
}

type UlnConfigInput = {
    confirmations?: bigint | number
    required_dvns?: string[]
    requiredDVNs?: string[]
    optional_dvns?: string[]
    optionalDVNs?: string[]
    optional_dvn_threshold?: number
    optionalDVNThreshold?: number
}

const toBoolFelt = (value: boolean) => (value ? 1 : 0)

export const encodeExecutorConfig = (config: ExecutorConfigInput): (string | number | bigint)[] => {
    const maxMessageSize = config.max_message_size ?? config.maxMessageSize ?? 0
    return [maxMessageSize, config.executor]
}

export const encodeUlnConfig = (config: UlnConfigInput): (string | number | bigint)[] => {
    const confirmations = BigInt(config.confirmations ?? 0)
    const requiredDvns = config.required_dvns ?? config.requiredDVNs ?? []
    const optionalDvns = config.optional_dvns ?? config.optionalDVNs ?? []
    const optionalThreshold = config.optional_dvn_threshold ?? config.optionalDVNThreshold ?? 0
    const hasConfirmations = confirmations !== 0n
    const hasRequiredDvns = requiredDvns.length > 0
    const hasOptionalDvns = optionalDvns.length > 0

    return [
        confirmations,
        toBoolFelt(hasConfirmations),
        requiredDvns.length,
        ...requiredDvns,
        toBoolFelt(hasRequiredDvns),
        optionalDvns.length,
        ...optionalDvns,
        optionalThreshold,
        toBoolFelt(hasOptionalDvns),
    ]
}

const createContract = (contractAbi: unknown, address: string, provider: StarknetProvider) =>
    new (Contract as any)({ abi: contractAbi, address, providerOrAccount: provider })

export const getEndpointV2Contract = (address: string, provider: StarknetProvider) =>
    createContract(abi.endpointV2, address, provider)

export const getOAppContract = (address: string, provider: StarknetProvider) =>
    createContract(abi.oApp, address, provider)

export const getUltraLightNodeContractWithAddress = (address: string, provider: StarknetProvider) =>
    createContract(abi.ultraLightNode302, address, provider)
