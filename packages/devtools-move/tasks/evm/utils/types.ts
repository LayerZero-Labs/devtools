import { ChildProcess } from 'child_process'

import { PopulatedTransaction, ethers } from 'ethers'

import type { OAppEdgeConfig, OAppNodeConfig } from '@layerzerolabs/toolbox-hardhat'

export type TxTypes =
    | 'setPeer'
    | 'setDelegate'
    | 'setEnforcedOptions'
    | 'setSendLibrary'
    | 'setReceiveLibrary'
    | 'setReceiveLibraryTimeout'
    | 'sendConfig'
    | 'receiveConfig'

export type eid = string
export type EidTxMap = Record<eid, [PopulatedTransaction]>
export type address = string

type WireOntoOapp = {
    eid: eid
    address: address
}

export type ContractMetadata = {
    address: {
        oapp: address
        epv2: address
    }
    contract: {
        oapp: ethers.Contract
        epv2: ethers.Contract
    }
    wireOntoOapps: WireOntoOapp[]
    provider: ethers.providers.JsonRpcProvider
    configAccount: OAppNodeConfig
    configOapp: OAppEdgeConfig | undefined
}

export type AccountData = {
    [eid: string]: {
        gasPrice: ethers.BigNumber
        nonce: number
        signer: ethers.Wallet
    }
}
//[TxTypes][eid] = PopulatedTransaction
export type TxEidMapping = Record<TxTypes, EidTxMap>

//[fromEid as number] = ContractMetadata
export type OmniContractMetadataMapping = Record<eid, ContractMetadata>

export type enforcedOptionParam = {
    eid: eid
    msgType: number
    options: string
}

export type RecvLibParam = {
    lib: address
    isDefault: boolean
}

export type RecvLibraryTimeoutConfig = {
    lib: address
    expiry: bigint
}

export type SetConfigParam = {
    eid: eid
    configType: number
    config: string
}

export type AnvilNode = { process: ChildProcess; rpcUrl: string }

export function returnChecksums(addresses: string[]): string[] {
    const checksumAddresses: string[] = []
    for (const address of addresses) {
        try {
            checksumAddresses.push(returnChecksum(address))
        } catch (error) {
            console.error(`Invalid address: ${address}. Error: ${error}`)
        }
    }
    return checksumAddresses
}

export function returnChecksum(address: string): string {
    try {
        return ethers.utils.getAddress(address)
    } catch (error) {
        throw new Error(`Invalid address: ${address}. Error: ${error}`)
    }
}
