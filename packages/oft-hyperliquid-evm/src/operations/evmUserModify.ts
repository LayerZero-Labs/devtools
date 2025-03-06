import { HyperliquidClient } from '@/signer'
import { EvmUserModifyRequest } from '@/types'
import { Wallet } from 'ethers'

export async function useBigBlock(wallet: Wallet, isTestnet: boolean) {
    const action: EvmUserModifyRequest['action'] = {
        type: 'evmUserModify',
        usingBigBlocks: true,
    }

    const hyperliquidClient = new HyperliquidClient(isTestnet)
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', wallet, action)
    return response
}

export async function useSmallBlock(wallet: Wallet, isTestnet: boolean) {
    const action: EvmUserModifyRequest['action'] = {
        type: 'evmUserModify',
        usingBigBlocks: false,
    }

    const hyperliquidClient = new HyperliquidClient(isTestnet)
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', wallet, action)
    return response
}
