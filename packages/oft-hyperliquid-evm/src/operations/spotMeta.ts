import { Wallet } from 'ethers'

import { HyperliquidClient } from '../signer'
import { BaseInfoRequest, SpotMeta, CoreSpotDeployment } from '../types'

export async function getSpotMeta(wallet: Wallet, isTestnet: boolean, logLevel: string, tokenIndex: string) {
    const action: BaseInfoRequest = {
        type: 'spotMeta',
    }

    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    const response = await hyperliquidClient.submitHyperliquidAction('/info', wallet, action)
    const tokens = (response as SpotMeta).tokens
    const token = tokens.find((token) => token.index === parseInt(tokenIndex))
    if (!token) {
        throw new Error(`Token ${tokenIndex} not found`)
    }
    return token
}

export async function createCoreSpotDeployment(
    wallet: Wallet,
    isTestnet: boolean,
    logLevel: string,
    tokenIndex: string
) {
    const token = await getSpotMeta(wallet, isTestnet, logLevel, tokenIndex)

    let coreSpotDeployment: CoreSpotDeployment

    if (token.evmContract) {
        coreSpotDeployment = {
            nativeSpot: token,
            txData: {
                weiDiff: token.evmContract.evm_extra_wei_decimals,
                connected: true,
            },
        }
    } else {
        coreSpotDeployment = {
            nativeSpot: token,
            txData: {
                connected: false,
            },
        }
    }
    return coreSpotDeployment
}
