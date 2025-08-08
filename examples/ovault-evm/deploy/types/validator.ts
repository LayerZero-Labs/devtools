import { ethers } from 'ethers'
import { HardhatRuntimeEnvironment } from 'hardhat/types/runtime'

import { type NetworkConfigOvaultExtension } from '../../type-extensions'

import { ContractAddress, OFTAddress, Token, TokenDeployConfig } from './extensions'

function isVaultChain(networkConfig: NetworkConfigOvaultExtension) {
    return networkConfig.isVaultChain == true
}

function isTokenDeployConfig(token: Token): token is TokenDeployConfig {
    return typeof token === 'object'
}

function isContractAddress(token: Token): token is OFTAddress {
    return typeof token === 'string' && ethers.utils.isAddress(token)
}

function getTokenType(token: Token): 'TokenDeployConfig' | 'ContractAddress' | 'OFTAddress' {
    if (typeof token === 'string') {
        return 'ContractAddress'
    } else {
        return 'TokenDeployConfig'
    }
}

async function checkAddressOrGetDeployment(hre: HardhatRuntimeEnvironment, token: Token): Promise<string> {
    if (isContractAddress(token)) {
        return token as ContractAddress
    } else if (isTokenDeployConfig(token)) {
        const tokenConfig = token as TokenDeployConfig
        const deploymentOrNull = await hre.deployments.getOrNull(tokenConfig.contractName)
        if (!deploymentOrNull) {
            throw new Error(
                `Could not find token address in tokenConfig or deployments for contract: ${tokenConfig.contractName}`
            )
        }
        return deploymentOrNull.address
    } else {
        const contractName = token as ContractAddress
        const deploymentOrNull = await hre.deployments.getOrNull(contractName)
        if (!deploymentOrNull) {
            throw new Error(`Could not find token address in tokenConfig or deployments for contract: ${contractName}`)
        }
        return deploymentOrNull.address
    }
}

function onlyDeployVault() {
    if (process.env.ONLY_VAULT) {
        console.log(
            `Skipping share OFT adapter deployment as only vault deployment is requested. Executing the same without 'ONLY_VAULT=1' will resume the share OFT adapter deployment.`
        )
        return true
    }
    return false
}

export {
    isTokenDeployConfig,
    isContractAddress,
    isVaultChain,
    getTokenType,
    checkAddressOrGetDeployment,
    onlyDeployVault,
}
