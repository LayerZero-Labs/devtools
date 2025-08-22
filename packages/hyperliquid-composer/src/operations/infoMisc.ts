import { HyperliquidClient } from '../signer'
import { SpotBalancesResponse, SpotClearinghouseState } from '../types'

export async function spotClearinghouseState(
    user: string,
    isTestnet: boolean,
    logLevel: string
): Promise<SpotBalancesResponse> {
    const action: SpotClearinghouseState['action'] = {
        type: 'spotClearinghouseState',
        user: user,
    }

    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    const response = await hyperliquidClient.submitHyperliquidAction('/info', null, action)
    return response as SpotBalancesResponse
}
