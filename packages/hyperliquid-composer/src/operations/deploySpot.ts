import { createModuleLogger } from '@layerzerolabs/io-devtools'
import { Wallet } from 'ethers'

import { HyperliquidClient } from '../signer'
import { SpotDeployAction } from '../types'
import { getCoreSpotDeployment } from '@/io/parser'

export async function setTradingFeeShare(
    wallet: Wallet,
    isTestnet: boolean,
    nativeSpotTokenId: number,
    share: string,
    logLevel: string
) {
    const action: SpotDeployAction['action'] = {
        type: 'spotDeploy',
        setDeployerTradingFeeShare: {
            token: nativeSpotTokenId,
            share: share,
        },
    }

    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', wallet, action)
    return response
}

export async function setUserGenesis(
    wallet: Wallet,
    isTestnet: boolean,
    nativeSpotTokenId: number,
    action: string,
    logLevel: string
) {
    const logger = createModuleLogger('setUserGenesis', logLevel)
    const coreSpotDeployment = getCoreSpotDeployment(nativeSpotTokenId, isTestnet, logger)

    const userGenesis = coreSpotDeployment.userGenesis

    let userAndWei: Array<[string, string]> = []
    let existingTokenAndWei: Array<[number, string]> = []
    let blacklistUsers: Array<[string, boolean]> = []

    switch (action) {
        case 'userAndWei':
            userAndWei = userGenesis.userAndWei.map((user) => [user.address.toLowerCase(), user.wei])
            break
        case 'existingTokenAndWei':
            existingTokenAndWei = userGenesis.existingTokenAndWei.map((token) => [token.token, token.wei])
            break
        case 'blacklistUsers':
            blacklistUsers = userGenesis.blacklistUsers.map((user) => [user, true])
            break
        default:
            userAndWei = userGenesis.userAndWei.map((user) => [user.address.toLowerCase(), user.wei])
            existingTokenAndWei = userGenesis.existingTokenAndWei.map((token) => [token.token, token.wei])
            blacklistUsers = userGenesis.blacklistUsers.map((user) => [user, true])
    }

    let responseForUserGenesis = {}
    let responseForBlacklistUsers = {}

    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)

    if (userAndWei.length > 0 || existingTokenAndWei.length > 0) {
        const actionForUserGenesis: SpotDeployAction['action'] = {
            type: 'spotDeploy',
            userGenesis: {
                token: nativeSpotTokenId,
                userAndWei: userAndWei,
                existingTokenAndWei: existingTokenAndWei,
            },
        }

        logger.info('Setting userAndWei and existingTokenAndWei')
        responseForUserGenesis = await hyperliquidClient.submitHyperliquidAction(
            '/exchange',
            wallet,
            actionForUserGenesis
        )
    }

    if (blacklistUsers.length > 0) {
        const actionForBlacklistUsers: SpotDeployAction['action'] = {
            type: 'spotDeploy',
            userGenesis: {
                token: nativeSpotTokenId,
                userAndWei: [],
                existingTokenAndWei: [],
                blacklistUsers: blacklistUsers,
            },
        }

        logger.info('Setting blacklistUsers')
        responseForBlacklistUsers = await hyperliquidClient.submitHyperliquidAction(
            '/exchange',
            wallet,
            actionForBlacklistUsers
        )
    }

    return { responseForUserGenesis, responseForBlacklistUsers }
}
