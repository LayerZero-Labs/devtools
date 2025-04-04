import { Wallet } from 'ethers'

import { HyperliquidClient } from '../signer'
import { SpotDeployAction } from '../types'

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
