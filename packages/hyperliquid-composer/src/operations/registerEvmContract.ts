import { Wallet } from 'ethers'

import { HyperliquidClient } from '../signer'
import { EvmSpotDeploy, FinalizeEvmContract } from '../types'

export async function requestEvmContract(
    wallet: Wallet,
    isTestnet: boolean,
    evmSpotTokenAddress: string,
    evmExtraWeiDecimals: number,
    coreSpotTokenId: number,
    logLevel: string
) {
    const requestEvmContract: EvmSpotDeploy['action']['requestEvmContract'] = {
        token: coreSpotTokenId,
        address: evmSpotTokenAddress.toLowerCase(),
        evmExtraWeiDecimals: evmExtraWeiDecimals,
    }

    const action: EvmSpotDeploy['action'] = {
        type: 'spotDeploy',
        requestEvmContract: requestEvmContract,
    }

    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', wallet, action)
    return response
}

export async function finalizeEvmContract(
    wallet: Wallet,
    isTestnet: boolean,
    coreSpotTokenId: number,
    nonce: number,
    logLevel: string
) {
    const action: FinalizeEvmContract['action'] = {
        type: 'finalizeEvmContract',
        token: coreSpotTokenId,
        input: {
            create: {
                nonce: nonce,
            },
        },
    }

    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', wallet, action)
    return response
}
