import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'

import { getHyperEVMOAppDeployment, writeCoreSpotDeployment } from '@/io'
import { getSpotMeta } from '@/operations'
import { toAssetBridgeAddress } from '@/types'
import type { CoreSpotDeployment, CoreSpotMetaData, TxData, UserGenesis } from '@/types'
import { ethers } from 'ethers'
import { RPC_URLS } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function coreSpotDeployment(args: any): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger('core-spot-deployment', args.logLevel)

    const oappConfig = args.oappConfig
    const network = args.network
    const tokenIndex = args.tokenIndex
    const action = args.action
    const isTestnet = args.network === 'testnet'

    const coreSpot: CoreSpotMetaData = await getSpotMeta(null, isTestnet, args.logLevel, tokenIndex)

    if (action === 'create') {
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

        const weiDiff = decimals - coreSpot.weiDecimals
        logger.verbose(`Wei diff: ${weiDiff}`)

        const assetBridgeAddress = toAssetBridgeAddress(tokenIndex)
        logger.verbose(`Asset bridge address: ${assetBridgeAddress}`)

        const txData: TxData = {
            txHash,
            nonce,
            from,
            weiDiff,
            assetBridgeAddress,
            connected: coreSpot.evmContract ? true : false,
        }

        const userGenesis: UserGenesis = {
            userAndWei: [
                {
                    address: from,
                    wei: '',
                },
                {
                    address: assetBridgeAddress,
                    wei: '',
                },
                {
                    address: '0x',
                    wei: '',
                },
            ],
            existingTokenAndWei: [
                {
                    token: 0,
                    wei: '',
                },
            ],
            blacklistUsers: [],
        }

        const coreSpotDeployment: CoreSpotDeployment = {
            coreSpot,
            txData,
            userGenesis,
        }

        writeCoreSpotDeployment(tokenIndex, isTestnet, coreSpotDeployment, logger)
    } else if (action === 'get') {
        logger.info(JSON.stringify(coreSpot, null, 2))
    }
}
