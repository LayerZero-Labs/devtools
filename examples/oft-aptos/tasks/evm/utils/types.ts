import { ethers, PopulatedTransaction, providers } from 'ethers'
import type { OAppNodeConfig, OAppEdgeConfig } from '@layerzerolabs/toolbox-hardhat'
import { ChildProcess } from 'child_process'

export type TxTypes =
    | 'setPeer'
    | 'setDelegate'
    | 'setEnforcedOptions'
    | 'setSendLibrary'
    | 'setReceiveLibrary'
    | 'setReceiveLibraryTimeout'
    | 'sendConfig'
    | 'receiveConfig'

export type EidTxMap = Record<eid, [PopulatedTransaction]>
export type eid = number
export type address = string

export type NonEvmOAppMetadata = {
    address: address
    eid: eid
    rpc: string
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
    provider: ethers.providers.JsonRpcProvider
    configAccount: OAppNodeConfig
    configOapp: OAppEdgeConfig
}

export type AccountData = {
    [eid: number]: {
        gasPrice: ethers.BigNumber
        nonce: number
        signer: providers.JsonRpcSigner
    }
}
//[TxTypes][eid] = PopulatedTransaction
export type TxEidMapping = Record<TxTypes, EidTxMap>

//[number][address] = ContractMetadata
export type ContractMetadataMapping = Record<eid, ContractMetadata>

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
            console.error(`Invalid address: ${address}. Error: ${error.message}`)
        }
    }
    return checksumAddresses
}

export function returnChecksum(address: string): string {
    try {
        return ethers.utils.getAddress(address)
    } catch (error) {
        console.error(`Invalid address: ${address}. Error: ${error.message}`)
    }
}
