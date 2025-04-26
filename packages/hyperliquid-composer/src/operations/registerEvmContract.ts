import { Wallet } from 'ethers'

import { HyperliquidClient } from '../signer'
import { EvmSpotDeploy, FinalizeEvmContract } from '../types'

export async function setRequestEvmContract(
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
    try {
        const response = await hyperliquidClient.submitHyperliquidAction('/exchange', wallet, action)
        return response
    } catch (error) {
        throw new Error(`Error requesting EVM contract: ${error}`)
    }
}

export async function setFinalizeEvmContract(
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
    if (response.status === 'err') {
        throw new Error(response.response)
    }
    return response
}
