import type { OmniPointHardhat } from '@layerzerolabs/devtools-evm-hardhat'
import type { OAppEnforcedOption } from '@layerzerolabs/ua-devtools'
import { MSG_LIB_BLOCK_RECEIVE_ONLY, MSG_LIB_BLOCK_SEND_AND_RECEIVE, MSG_LIB_BLOCK_SEND_ONLY } from './constants'

export type CustomMessageLibraryType =
    | typeof MSG_LIB_BLOCK_SEND_ONLY
    | typeof MSG_LIB_BLOCK_RECEIVE_ONLY
    | typeof MSG_LIB_BLOCK_SEND_AND_RECEIVE
export type BlockConfirmationsType = number | bigint
export type BlockConfirmationsDefinition = BlockConfirmationsType | [BlockConfirmationsType, CustomMessageLibraryType]

// [AContract, BContract, [requiredDVNs, [optionalDVNs, threshold]], [AToBConfirmations, BToAConfirmations]], [enforcedOptionsAToB, enforcedOptionsBToA], customExecutor?]
export type TwoWayConfig = [
    OmniPointHardhat, // AContract
    OmniPointHardhat, // BContract
    [string[], [string[], number] | []], // [requiredDVNs, [optionalDVNs, threshold]]
    [BlockConfirmationsDefinition, BlockConfirmationsDefinition | undefined], // [AToBConfirmations, BToAConfirmations]
    [OAppEnforcedOption[] | undefined, OAppEnforcedOption[] | undefined], // [enforcedOptionsAToB, enforcedOptionsBToA]
    string?, // customExecutor (optional)
]

export interface IMetadataDvns {
    [address: string]: {
        version: number
        canonicalName: string
        id: string
        deprecated?: boolean
        lzReadCompatible?: boolean
    }
}

export interface IMetadataExecutors {
    [address: string]: {
        version: number
        canonicalName: string
        id: string
        deprecated?: boolean
    }
}

export interface IMetadata {
    [key: string]: {
        created: string
        updated: string
        tableName: string
        environment: string
        blockExplorers?: { url: string }[]
        deployments?: {
            eid: string
            chainKey: string
            stage: string
            version: number
            endpoint?: { address: string }
            relayerV2?: { address: string }
            ultraLightNodeV2?: { address: string }
            nonceContract?: { address: string }
            executor?: { address: string; pda?: string }
            deadDVN?: { address: string }
            endpointV2?: { address: string }
            sendUln302?: { address: string }
            blockedMessageLib?: { address: string }
            lzExecutor?: { address: string }
            sendUln301?: { address: string }
            receiveUln301?: { address: string }
            receiveUln302?: { address: string }
        }[]
        chainDetails?: {
            chainType: string
            chainKey: string
            nativeChainId?: number
            chainLayer: string
            chainStack?: string
            nativeCurrency: {
                name?: string
                symbol: string
                cgId?: string
                cmcId: number
                decimals: number
            }
            cgNetworkId?: string
            shortName?: string
            mainnetChainName?: string
            name?: string
        }
        dvns?: IMetadataDvns
        executors?: IMetadataExecutors
        rpcs?: { url: string; weight?: number }[]
        addressToOApp?: {
            [address: string]: {
                id: string
                canonicalName: string
                type?: string
            }
        }
        chainName: string
        tokens?: {
            [address: string]: {
                symbol: string
                cgId?: string
                cmcId?: number
                type: string
                decimals: number
                peggedTo?: {
                    symbol: string
                    chainName: string
                    address: string
                    programaticallyPegged?: boolean
                }
            }
        }
        chainKey: string
    }
}
