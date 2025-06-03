import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'

import { getERC20abi, getHyperEVMOAppDeployment, writeCoreSpotDeployment } from '@/io'
import { getSpotMeta, getHipTokenInfo, getSpotDeployState } from '@/operations'
import { toAssetBridgeAddress } from '@/types'
import type { CoreSpotDeployment, CoreSpotMetaData, SpotDeployStates, SpotInfo, TxData, UserGenesis } from '@/types'
import { ethers } from 'ethers'
import { RPC_URLS } from '@/types'

import inquirer from 'inquirer'

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
        let oft_txHash: string
        let oft_address: string

        try {
            const { deployment } = await getHyperEVMOAppDeployment(oappConfig, network, logger)
            if (!deployment) {
                logger.error(`Deployment file not found for ${network}`)
                return
            }

            oft_txHash = deployment['transactionHash']
            oft_address = deployment['address']
            logger.verbose(`Tx hash: ${oft_txHash}, address: ${oft_address}`)
        } catch {
            logger.error(
                `Error fetching deployment for ${network} for oapp-config ${oappConfig}. \n\n Can you please provide the oft address and tx hash manually?`
            )

            const { oftAddress, oftTxHash } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'oftAddress',
                    message: 'Enter the oft address',
                },
                {
                    type: 'input',
                    name: 'oftTxHash',
                    message: 'Enter the oft tx hash',
                },
            ])

            let shouldQuit = false
            oft_txHash = ethers.utils.isHexString(oftTxHash) ? oftTxHash : ''
            if (!oft_txHash) {
                logger.error('Invalid oft tx hash')
                shouldQuit = true
            }

            oft_address = ethers.utils.isAddress(oftAddress) ? oftAddress : ''
            if (!oft_address) {
                logger.error('Invalid oft address')
                shouldQuit = true
            }

            if (shouldQuit) {
                logger.info('Quitting...')
                process.exit(1)
            }
        }

        const oft_abi = await getERC20abi()
        if (!oft_abi) {
            logger.error(`ERC20 abi not found for ${network}`)
            return
        }

        const provider = new ethers.providers.JsonRpcProvider({
            url: RPC_URLS[network.toUpperCase()],
            skipFetchSetup: true,
        })

        const tx = await provider.getTransaction(oft_txHash)
        const nonce = tx?.nonce
        const from = tx?.from
        logger.verbose(`Nonce: ${nonce}, From: ${from}`)

        const contract = new ethers.Contract(oft_address, oft_abi, provider)
        const tokenName = await contract.name()
        const decimals = await contract.decimals()
        logger.verbose(`Token name: ${tokenName}, Decimals: ${decimals}`)

        const weiDiff = decimals - coreSpot.weiDecimals
        logger.verbose(`Wei diff: ${weiDiff}`)

        const assetBridgeAddress = toAssetBridgeAddress(tokenIndex)
        logger.verbose(`Asset bridge address: ${assetBridgeAddress}`)

        const txData: TxData = {
            txHash: oft_txHash,
            nonce: nonce,
            from: from,
            weiDiff: weiDiff,
            assetBridgeAddress: assetBridgeAddress,
            connected: coreSpot.evmContract ? true : false,
        }

        logger.info('Populating userAndWei with the asset bridge address')

        const existingTokenAndWei: { token: number; wei: string }[] = []
        const msg =
            'Do you want to distribute some part of the genesis to the holders of an existing token (this is uncommon and optional)?'
        const { usingExistingTokenAndWei } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'usingExistingTokenAndWei',
                message: `${msg} (y/N)`,
            },
        ])

        if (usingExistingTokenAndWei === 'y') {
            existingTokenAndWei.push({
                token: 0,
                wei: '',
            })
        }

        const userGenesis: UserGenesis = {
            userAndWei: [
                {
                    address: assetBridgeAddress,
                    wei: '',
                },
            ],
            existingTokenAndWei: existingTokenAndWei,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function hipTokenInfo(args: any): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger('hip-token-info', args.logLevel)

    const tokenIndex = args.tokenIndex
    const network = args.network

    const isTestnet = network === 'testnet'
    const coreSpot: CoreSpotMetaData = await getSpotMeta(null, isTestnet, args.logLevel, tokenIndex)
    const coreSpotInfo: SpotInfo = await getHipTokenInfo(null, isTestnet, args.logLevel, coreSpot.tokenId)

    logger.info(JSON.stringify(coreSpotInfo, null, 2))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function spotDeployState(args: any): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger('get-deploy-state', args.logLevel)

    const tokenIndex = args.tokenIndex
    const network = args.network

    const isTestnet = network === 'testnet'
    let deployerAddress: string
    if (args.deployAddress) {
        deployerAddress = args.deployAddress
    } else {
        const coreSpot: CoreSpotMetaData = await getSpotMeta(null, isTestnet, args.logLevel, tokenIndex)
        const coreSpotInfo: SpotInfo = await getHipTokenInfo(null, isTestnet, args.logLevel, coreSpot.tokenId)
        deployerAddress = coreSpotInfo.deployer
        logger.info(
            `Using deployer address: ${deployerAddress} for token ${coreSpotInfo.name} with index ${tokenIndex}`
        )
    }

    const deployState = (await getSpotDeployState(deployerAddress, isTestnet, args.logLevel)) as SpotDeployStates
    logger.verbose(`All deployment states for ${deployerAddress}: ${JSON.stringify(deployState, null, 2)}`)

    // iterate through deployState and print out the one with the same "token" as tokenIndex
    const state = deployState.states.find((state) => state.token === parseInt(tokenIndex))
    if (!state) {
        logger.error(
            `No in progress deployment state found for token ${tokenIndex}. This means your token is deployed.`
        )
        process.exit(1)
    }
    logger.info(JSON.stringify(state, null, 2))
}
