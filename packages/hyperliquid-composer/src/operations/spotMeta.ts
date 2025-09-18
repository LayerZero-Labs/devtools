import { Wallet } from 'ethers'

import { HyperliquidClient } from '../signer'
import {
    BaseInfoRequest,
    SpotMeta,
    SpotInfo,
    SpotDeployStates,
    SpotMetaUniverse,
    SpotPair,
    SpotPairDeployAuctionStatus,
} from '../types'

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

export async function getSpotDeployState(deployerAddres: string, isTestnet: boolean, logLevel: string) {
    const action: BaseInfoRequest = {
        type: 'spotDeployState',
        user: deployerAddres,
    }

    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    const response = await hyperliquidClient.submitHyperliquidAction('/info', null, action)
    const deployState = response as SpotDeployStates
    return deployState
}

/**
 * Gets all spot trading pairs for a given coreSpot token index.
 * This function fetches the complete spotMeta universe and filters for pairs
 * that include the specified token index.
 *
 * @param isTestnet Whether to query testnet or mainnet
 * @param tokenIndex The token index to find pairs for
 * @param logLevel Logging level for the client
 * @returns Array of spot pairs that include the specified token
 */
export async function getSpotPairs(isTestnet: boolean, tokenIndex: number, logLevel: string): Promise<SpotPair[]> {
    const action: BaseInfoRequest = {
        type: 'spotMeta',
    }

    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    const response = await hyperliquidClient.submitHyperliquidAction('/info', null, action)
    const spotMetaUniverse = response as SpotMetaUniverse

    // Filter pairs that include the specified token index
    const filteredPairs = spotMetaUniverse.universe.filter((pair) => pair.tokens.includes(tokenIndex))

    return filteredPairs
}

/**
 * Gets the current spot pair deploy auction status.
 * This shows information about the ongoing auction for spot pair deployments.
 *
 * @param isTestnet Whether to query testnet or mainnet
 * @param logLevel Logging level for the client
 * @returns Current auction status information
 */
export async function getSpotPairDeployAuctionStatus(
    isTestnet: boolean,
    logLevel: string
): Promise<SpotPairDeployAuctionStatus> {
    const action: BaseInfoRequest = {
        type: 'spotPairDeployAuctionStatus',
    }

    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    const response = await hyperliquidClient.submitHyperliquidAction('/info', null, action)
    return response as SpotPairDeployAuctionStatus
}

/**
 * Gets the quote tokens that a given core spot token is already paired with.
 * This is useful to check what trading pairs already exist before deploying new ones.
 *
 * @param isTestnet Whether to query testnet or mainnet
 * @param tokenIndex The token index to check existing pairs for
 * @param logLevel Logging level for the client
 * @returns Array of quote token indices that the token is already paired with
 */
export async function getExistingQuoteTokens(
    isTestnet: boolean,
    tokenIndex: number,
    logLevel: string
): Promise<number[]> {
    const pairs = await getSpotPairs(isTestnet, tokenIndex, logLevel)

    // Extract the quote tokens (other token in each pair)
    const quoteTokens = pairs
        .map((pair) => {
            // Find the token that's NOT the input tokenIndex
            return pair.tokens.find((token) => token !== tokenIndex)
        })
        .filter((token): token is number => token !== undefined)

    return [...new Set(quoteTokens)] // Remove duplicates
}
