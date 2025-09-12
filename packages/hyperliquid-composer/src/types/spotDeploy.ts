/**
 * This is an optional action that can be performed at any time after
 * RegisterToken2. While the fee share defaults to 100%, this action
 * can be resent multiple times as long as the fee share is not increasing.
 * @param token - The token
 * @param share - The deployer trading fee share. Range: ["0%", "100%"]. Examples: "0.012%", "99.4%"
 */
export interface SetDeployerTradingFeeShare {
    token: number
    share: string
}

/**
 * UserGenesis can be called multiple times
 * @param token - The token involved in the genesis.
 * @param userAndWei - A list of tuples of user address and genesis amount (wei).
 * @param existingTokenAndWei - A list of tuples of existing token and total genesis amount for holders of that token (wei).
 * @param blacklistUsers - A list of tuples of users and blacklist status (True if blacklist, False to remove existing blacklisted user).
 */
export interface UserGenesis {
    token: number
    userAndWei: Array<[string, string]>
    existingTokenAndWei: Array<[number, string]>
    blacklistUsers?: Array<[string, boolean]>
}

/**
 * Genesis denotes the initial creation of a token with a maximum supply.
 * @param maxSupply - Checksum ensureing all calls to UserGenesis succeeded
 * @param noHyperliquidity - Set hyperliquidity balance to 0.
 */
export interface Genesis {
    token: number
    maxSupply: string
    noHyperliquidity: boolean
}

/**
 * @param tokens - [base token index,  quote token index]
 * @dev The base token index is the token index of the token that will be used as the base for the spot.
 * @dev The quote token index is the token index of the token that will be used as the quote for the spot - this is the token that will be used to pay the trading fee like USDC.
 */
export interface RegisterSpot {
    tokens: [number, number]
}

/**
 * @param spot - The spot index (different from base token index)
 * @param startPx - The starting price.
 * @param orderSz - The size of each order (float, not wei)
 * @param nOrders - The number of orders. If "noHyperliquidity" was set to True, then this must be 0.
 * @param nSeededLevels - The number of levels the deployer wishes to seed with usdc instead of tokens.
 */
export interface RegisterHyperliquidity {
    spot: number
    startPx: string
    orderSz: string
    nOrders: number
    nSeededLevels?: number
}

/**
 * Enables freeze privilege for a token, allowing the deployer to freeze/unfreeze users
 * @param token - The token index
 */
export interface EnableFreezePrivilege {
    token: number
}

/**
 * Freezes or unfreezes a specific user for a token
 * @param token - The token index
 * @param user - The user address to freeze/unfreeze
 * @param freeze - True to freeze, false to unfreeze
 */
export interface FreezeUser {
    token: number
    user: string
    freeze: boolean
}

/**
 * Revokes freeze privilege for a token, permanently disabling the ability to freeze users
 * @param token - The token index
 */
export interface RevokeFreezePrivilege {
    token: number
}

/**
 * Enables a token to be used as a quote asset in trading pairs
 * @param token - The token index
 */
export interface EnableQuoteToken {
    token: number
}
