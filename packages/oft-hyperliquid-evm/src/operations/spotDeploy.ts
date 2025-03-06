import { Wallet } from 'ethers'
import { HyperliquidClient } from '@/signer'
import { EvmSpotDeployRequest } from '@/types'

export async function requestEvmContract(
    wallet: Wallet,
    isTestnet: boolean,
    evmSpotTokenAddress: string,
    evmExtraWeiDecimals: number,
    nativeSpotTokenId: number
) {
    const requestEvmContract: EvmSpotDeployRequest['action']['requestEVMContract'] = {
        type: 'requestEvmContract',
        token: nativeSpotTokenId,
        address: evmSpotTokenAddress,
        evmExtraWeiDecimals: evmExtraWeiDecimals,
    }

    const action: EvmSpotDeployRequest['action'] = {
        type: 'spotDeploy',
        requestEVMContract: requestEvmContract,
    }

    const hyperliquidClient = new HyperliquidClient(isTestnet)
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', wallet, action)
    return response
}
