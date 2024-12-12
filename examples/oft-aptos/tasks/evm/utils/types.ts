import { ChildProcess } from 'child_process'

import { PopulatedTransaction, ethers, providers } from 'ethers'

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
