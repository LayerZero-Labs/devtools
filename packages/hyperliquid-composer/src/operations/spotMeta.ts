import { Wallet } from 'ethers'

import { HyperliquidClient } from '../signer'
import { BaseInfoRequest, SpotMeta, SpotInfo } from '../types'

export async function getSpotMeta(wallet: Wallet | null, isTestnet: boolean, logLevel: string, tokenIndex: string) {
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

export async function getHipTokenInfo(
    wallet: Wallet | null,
    isTestnet: boolean,
    logLevel: string,
    tokenAddress: string
) {
    const action: BaseInfoRequest = {
        type: 'tokenDetails',
        tokenId: tokenAddress,
    }

    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    const response = await hyperliquidClient.submitHyperliquidAction('/info', wallet, action)
    const token = response as SpotInfo

    return token
}
