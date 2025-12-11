import { HyperliquidClient, IHyperliquidSigner } from '../signer'
import {
    BaseInfoRequest,
    SpotMeta,
    SpotInfo,
    SpotDeployStates,
    SpotMetaUniverse,
    SpotPair,
    SpotPairsWithMetadata,
    SpotPairDeployAuctionStatus,
} from '../types'
import { HYPE_INDEX } from '../types/constants'

export async function getSpotMeta(
    signer: IHyperliquidSigner | null,
    isTestnet: boolean,
    logLevel: string,
    tokenIndex: string
) {
    const action: BaseInfoRequest = {
        type: 'spotMeta',
    }

    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    const response = await hyperliquidClient.submitHyperliquidAction('/info', signer, action)
    const tokens = (response as SpotMeta).tokens
    const token = tokens.find((token) => token.index === parseInt(tokenIndex))
    if (!token) {
        throw new Error(`Token ${tokenIndex} not found`)
    }
    return token
}

export async function getHipTokenInfo(
    signer: IHyperliquidSigner | null,
    isTestnet: boolean,
    logLevel: string,
    tokenAddress: string
) {
    const action: BaseInfoRequest = {
        type: 'tokenDetails',
        tokenId: tokenAddress,
    }

    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    const response = await hyperliquidClient.submitHyperliquidAction('/info', signer, action)
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
 * Gets all spot trading pairs for a given coreSpot token index along with token metadata.
 * This function fetches both the pairs and token metadata for name resolution.
 *
 * @param isTestnet Whether to query testnet or mainnet
 * @param tokenIndex The token index to find pairs for
 * @param logLevel Logging level for the client
 * @returns Object containing filtered pairs and token metadata
 */
export async function getSpotPairsWithMetadata(
    isTestnet: boolean,
    tokenIndex: number,
    logLevel: string
): Promise<SpotPairsWithMetadata> {
    const action: BaseInfoRequest = {
        type: 'spotMeta',
    }

    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    const response = await hyperliquidClient.submitHyperliquidAction('/info', null, action)
    const spotMetaUniverse = response as SpotMetaUniverse

    // Filter pairs that include the specified token index
    const filteredPairs = spotMetaUniverse.universe.filter((pair) => pair.tokens.includes(tokenIndex))

    return {
        pairs: filteredPairs,
        tokens: spotMetaUniverse.tokens,
    }
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

/**
 * Checks if a token is a quote asset by looking at HYPE trading pairs.
 * When any core spot is promoted to a quote asset (fee token), the Hyperliquid protocol
 * automatically deploys a new spot market for HYPE/QUOTE_ASSET.
 *
 * @param isTestnet Whether to query testnet or mainnet
 * @param tokenIndex The token index to check (optional - if not provided, returns all quote assets)
 * @param logLevel Logging level for the client
 * @returns Object containing isQuoteAsset boolean and tokenName string
 */
export async function isQuoteAsset(
    isTestnet: boolean,
    tokenIndex: number | null,
    logLevel: string
): Promise<{ isQuoteAsset: boolean; tokenName: string; allQuoteAssets?: Array<{ index: number; name: string }> }> {
    // Get HYPE token index based on network
    const hypeTokenIndex = isTestnet ? HYPE_INDEX.TESTNET : HYPE_INDEX.MAINNET

    // Get all HYPE trading pairs with metadata
    const { pairs, tokens } = await getSpotPairsWithMetadata(isTestnet, hypeTokenIndex, logLevel)

    // Extract all quote assets paired with HYPE
    const quoteAssets = pairs
        .map((pair) => {
            // Find the token that's NOT HYPE
            const quoteTokenIndex = pair.tokens.find((token) => token !== hypeTokenIndex)
            if (quoteTokenIndex === undefined) {
                return null
            }

            // Find the token metadata
            const tokenMetadata = tokens.find((token) => token.index === quoteTokenIndex)
            return {
                index: quoteTokenIndex,
                name: tokenMetadata?.name || `Token-${quoteTokenIndex}`,
            }
        })
        .filter((asset): asset is { index: number; name: string } => asset !== null)

    // If no tokenIndex provided, return all quote assets
    if (tokenIndex === null) {
        return {
            isQuoteAsset: false,
            tokenName: '',
            allQuoteAssets: quoteAssets,
        }
    }

    // Check if the provided tokenIndex is in the list of quote assets
    const matchedAsset = quoteAssets.find((asset) => asset.index === tokenIndex)

    return {
        isQuoteAsset: matchedAsset !== undefined,
        tokenName: matchedAsset?.name || '',
    }
}
