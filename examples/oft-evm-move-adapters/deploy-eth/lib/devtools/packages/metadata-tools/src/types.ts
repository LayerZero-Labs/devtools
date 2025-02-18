import type { OmniPointHardhat } from '@layerzerolabs/devtools-evm-hardhat'
import type { OAppEnforcedOption } from '@layerzerolabs/ua-devtools'

// [srcContract, dstContract, [requiredDVNs, [optionalDVNs, threshold]], [srcToDstConfirmations, dstToSrcConfirmations]], [enforcedOptionsSrcToDst, enforcedOptionsDstToSrc]
export type TwoWayConfig = [
    OmniPointHardhat, // srcContract
    OmniPointHardhat, // dstContract
    [string[], [string[], number] | []], // [requiredDVNs, [optionalDVNs, threshold]]
    [number, number | undefined], // [srcToDstConfirmations, dstToSrcConfirmations]
    [OAppEnforcedOption[] | undefined, OAppEnforcedOption[] | undefined], // [enforcedOptionsSrcToDst, enforcedOptionsDstToSrc]
]

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
        dvns?: {
            [address: string]: {
                version: number
                canonicalName: string
                id: string
                deprecated?: boolean
                lzReadCompatible?: boolean
            }
        }
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
