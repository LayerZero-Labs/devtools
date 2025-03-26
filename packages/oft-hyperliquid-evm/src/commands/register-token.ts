import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import { ethers } from 'ethers'

import { RPC_URLS, TxData } from '@/types'
import { getHyperEVMOAppDeployment, getCoreSpotDeployment, writeUpdatedCoreSpotDeployment } from '@/io/parser'
import { getHyperliquidWallet } from '@/signer'
import { requestEvmContract, finalizeEvmContract } from '@/operations'

import assert from 'assert'

export async function registerToken(args: any): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger('register-token', args.logLevel)

    const oappConfig = args.oappConfig
    const hyperAssetIndex = args.tokenIndex
    const network = args.network
    const wallet = await getHyperliquidWallet()
    const isTestnet = network == 'testnet'

    logger.info(`Found public key ${wallet.address} from .env file`)
    const { deployment } = await getHyperEVMOAppDeployment(oappConfig, network, logger)

    if (!deployment) {
        logger.error(`Deployment file not found for ${network}`)
        return
    }

    const txHash = deployment['transactionHash']
    logger.verbose(`Tx hash: ${txHash}`)

    const provider = new ethers.providers.JsonRpcProvider({
        url: RPC_URLS[network.toUpperCase()],
        skipFetchSetup: true,
    })

    const tx = await provider.getTransaction(txHash)
    const nonce = tx?.nonce
    const from = tx?.from
    logger.verbose(`Nonce: ${nonce}, From: ${from}`)

    const contract = new ethers.Contract(deployment['address'], deployment['abi'], provider)
    const tokenName = await contract.name()
    const decimals = await contract.decimals()
    logger.verbose(`Token name: ${tokenName}, Decimals: ${decimals}`)

    const coreSpot = getCoreSpotDeployment(hyperAssetIndex, isTestnet, logger)
    const weiDiff = decimals - coreSpot.nativeSpot.weiDecimals
    logger.verbose(`Wei diff: ${weiDiff}`)

    assert(coreSpot.nativeSpot.evmContract, 'Native spot EVM contract is not set')

    const txData: TxData = {
        txHash,
        nonce,
        from,
        weiDiff,
        connected: true,
    }

    logger.verbose(`txData: \n ${JSON.stringify(txData, null, 2)}`)

    const hyperAssetIndexInt = parseInt(hyperAssetIndex)

    logger.info(`Request EVM contract`)
    await requestEvmContract(
        wallet,
        isTestnet,
        coreSpot.nativeSpot.evmContract.address,
        weiDiff,
        hyperAssetIndexInt,
        args.loglevel
    )

    logger.info(`Finalize EVM contract`)
    await finalizeEvmContract(wallet, isTestnet, hyperAssetIndexInt, nonce, args.logLevel)

    writeUpdatedCoreSpotDeployment(hyperAssetIndex, isTestnet, tokenName, deployment['address'], txData, logger)

    logger.info(`Token ${hyperAssetIndex} registered on ${network}`)
}
