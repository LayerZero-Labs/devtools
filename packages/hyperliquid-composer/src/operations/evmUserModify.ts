import { HyperliquidClient, IHyperliquidSigner } from '../signer'
import { EvmUserModifyRequest } from '../types'

export async function useBigBlock(
    signer: IHyperliquidSigner,
    isTestnet: boolean,
    logLevel: string,
    skipPrompt: boolean = false
) {
    const action: EvmUserModifyRequest['action'] = {
        type: 'evmUserModify',
        usingBigBlocks: true,
    }

    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel, skipPrompt)
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', signer, action)
    return response
}

export async function useSmallBlock(
    signer: IHyperliquidSigner,
    isTestnet: boolean,
    logLevel: string,
    skipPrompt: boolean = false
) {
    const action: EvmUserModifyRequest['action'] = {
        type: 'evmUserModify',
        usingBigBlocks: false,
    }

    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel, skipPrompt)
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', signer, action)
    return response
}
