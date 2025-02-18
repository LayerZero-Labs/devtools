import { SubmitForVerificationProps, VerificationResponse } from '../common/etherscan'
import type { NetworkName, NetworkConfig } from '../common/types'

export interface VerifyHardhatPathsConfig {
    deployments: string
}

export type VerifyHardhatFilterConfig = boolean | string | string[] | RegExp | VerifyHardhatFilterFunction

export type VerifyHardhatFilterFunction = (name: string, path: string, networkName: NetworkName) => boolean

export interface VerifyHardhatBaseConfig {
    paths?: Partial<VerifyHardhatPathsConfig>
    networks?: Record<NetworkName, Partial<NetworkConfig>>
    dryRun?: boolean
}

export interface VerifyHardhatTargetConfig extends VerifyHardhatBaseConfig {
    filter?: VerifyHardhatFilterConfig
}

export interface VerifyHardhatContractConfig {
    network: NetworkName
    address: string
    deployment: string
    contractName: string
    constructorArguments?: unknown[] | string
}

export interface VerifyHardhatNonTargetConfig extends VerifyHardhatBaseConfig {
    contracts: VerifyHardhatContractConfig[]
}

export interface VerificationArtifact {
    networkName: string
    networkConfig: NetworkConfig
    submitProps: SubmitForVerificationProps
}

export interface VerificationResult {
    artifact: VerificationArtifact
    response?: VerificationResponse
    error?: unknown
}
