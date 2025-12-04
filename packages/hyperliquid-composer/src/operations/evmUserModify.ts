import { Wallet } from 'ethers'

import { HyperliquidClient } from '../signer'
import { EvmUserModifyRequest } from '../types'

export async function useBigBlock(wallet: Wallet, isTestnet: boolean, logLevel: string, skipPrompt: boolean = false) {
    const action: EvmUserModifyRequest['action'] = {
        type: 'evmUserModify',
        usingBigBlocks: true,
    }

    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel, skipPrompt)
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', wallet, action)
    return response
}

export async function useSmallBlock(wallet: Wallet, isTestnet: boolean, logLevel: string, skipPrompt: boolean = false) {
    const action: EvmUserModifyRequest['action'] = {
        type: 'evmUserModify',
        usingBigBlocks: false,
    }

    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel, skipPrompt)
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', wallet, action)
    return response
}
