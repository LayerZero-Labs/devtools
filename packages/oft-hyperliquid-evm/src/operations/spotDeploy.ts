import { HyperliquidClient } from '@/signer'
import { EvmSpotDeployRequest } from '@/types'
import { Wallet } from 'ethers'

export async function requestEvmContract(
    wallet: Wallet,
    isTestnet: boolean,
    evmSpotTokenAddress: string,
    evmExtraWeiDecimals: number,
    nativeSpotTokenId: number,
    logLevel: string
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

    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', wallet, action)
    return response
}
