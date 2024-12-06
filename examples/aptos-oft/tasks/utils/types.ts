import { ethers, PopulatedTransaction } from 'ethers'
import type { OAppNodeConfig, OAppEdgeConfig } from '@layerzerolabs/toolbox-hardhat'

export type TxTypes = 'setPeer' | 'setDelegate' | 'setEnforcedOptions'
export type EidTxMap = Record<eid, [PopulatedTransaction]>
export type eid = number
export type address = string

export type deploymentFile = {
    address: address
    abi: []
    transactionHash: ''
    receipt: object
    args: []
    numDeployments: 1
    solcInputHash: ''
    metadata: ''
    bytecode: ''
    deployedBytecode: ''
    devdoc: object
    storageLayout: object
}

export type AptosOFTMetadata = {
    eid: eid
    aptosAddress: string
    rpc: string
}

export type EidMetadata = {
    evmAddress: address
    contract: ethers.Contract
    provider: ethers.providers.JsonRpcProvider
    configAccount: OAppNodeConfig
    configOapp: OAppEdgeConfig
}
//[TxTypes][eid] = PopulatedTransaction
export type TxEidMapping = Record<TxTypes, EidTxMap>

//[number][address] = EidMetadata
export type EidMetadataMapping = Record<eid, EidMetadata>
