import { ethers } from 'ethers'
import type { OAppNodeConfig, OAppEdgeConfig } from '@layerzerolabs/toolbox-hardhat'

export type deploymentFile = {
    address: string
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

export type WireEvm = {
    evmAddress: string
    signer: ethers.Wallet
    contract: ethers.Contract
    fromEid: number
    configAccount: OAppNodeConfig
    configOapp: OAppEdgeConfig
}

export type AptosOFTMetadata = {
    eid: number
    aptosAddress: string
    rpc: string
}
