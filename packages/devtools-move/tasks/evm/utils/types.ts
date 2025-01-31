import { ChildProcess } from 'child_process'

import { PopulatedTransaction, ethers, providers } from 'ethers'

import type { OAppEdgeConfig, OAppNodeConfig } from '@layerzerolabs/toolbox-hardhat'

export type ExecutionMode = 'calldata' | 'broadcast' | 'dry-run'
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
type EidTx = {
    toEid: eid
    populatedTx: PopulatedTransaction
}
export type EidTxMap = Record<eid, EidTx[]>
export type address = string

type PeerOApp = {
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
    peers: PeerOApp[]
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

export type TxPool = {
    from_eid: eid
    raw: ethers.PopulatedTransaction
    response: Promise<providers.TransactionResponse> | undefined
}

export type TxReceipt = {
    src_eid: string
    dst_eid: string
    src_from: string
    src_to: string
    tx_hash: string | undefined
    data: string
}
export type TxReceiptJson = Record<string, TxReceipt[]> // txType -> txReceipt

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
