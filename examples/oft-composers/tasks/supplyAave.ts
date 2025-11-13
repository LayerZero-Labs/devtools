import { BigNumber } from 'ethers'
import { task } from 'hardhat/config'

import { createModuleLogger } from '@layerzerolabs/io-devtools'
import { Options } from '@layerzerolabs/lz-v2-utilities'

import type { HardhatRuntimeEnvironment } from 'hardhat/types'

const logger = createModuleLogger('stargate:supply-aave')

type SendArgs = {
    stargate: string
    dstEid: string
    composer: string
    composeGasLimit: string
    amountLd: string
    tokenReceiver: string
    refundAddress?: string
    payInLzToken?: string
    oftCmd?: string
}

const isReceiptObject = (value: unknown): value is { amountReceivedLD?: BigNumber } => {
    if (!value || typeof value !== 'object' || value === null) {
        return false
    }

    const candidate = value as { amountReceivedLD?: unknown }
    if (!('amountReceivedLD' in candidate)) {
        return false
    }

    const { amountReceivedLD } = candidate
    return amountReceivedLD === undefined || BigNumber.isBigNumber(amountReceivedLD)
}

const getAmountFromArray = (values: unknown[]): BigNumber | undefined => {
    const candidate = values[1] ?? values[0]
    return BigNumber.isBigNumber(candidate) ? candidate : undefined
}

async function sendSupply(hre: HardhatRuntimeEnvironment, args: SendArgs) {
    const { ethers } = hre
    const signer = (await ethers.getSigners())[0]
    const abiCoder = ethers.utils.defaultAbiCoder

    logger.info(
        `Preparing Stargate supply compose send to ${args.tokenReceiver ?? signer.address} on chain ${args.dstEid}`
    )

    // 1. Build compose message payload expected by AaveV3Composer (address)
    const composeMsg = abiCoder.encode(['address'], [args.tokenReceiver ?? signer.address])

    const composeGasLimit = ethers.BigNumber.from(args.composeGasLimit ?? '200000').toString()

    const extraOptions = Options.newOptions()
        .addExecutorComposeOption(
            0, // compose index
            composeGasLimit,
            0 // no native drop
        )
        .toHex()

    const dstEid = Number(args.dstEid) // uint32 destination endpoint
    if (!Number.isSafeInteger(dstEid)) {
        throw new Error(`dstEid must be a safe integer: got ${args.dstEid}`)
    }

    const amountLD = ethers.BigNumber.from(args.amountLd)
    const payInLzToken = (args.payInLzToken ?? 'false').toLowerCase() === 'true'

    const refundAddress = args.refundAddress ?? signer.address

    const stargateAbi = await hre.artifacts.readArtifact('IStargate')
    const pool = await ethers.getContractAt(stargateAbi.abi, args.stargate, signer)
    logger.debug(`Connected to Stargate pool: ${pool.address}`)

    // 2. Assemble initial SendParam tuple (minAmountLD will be filled after quoteOFT)
    const sendParamTuple = [
        dstEid,
        ethers.utils.hexZeroPad(args.composer, 32),
        amountLD,
        ethers.constants.Zero,
        extraOptions,
        composeMsg,
        args.oftCmd ?? '0x',
    ]

    const [, , receipt] = await pool.quoteOFT(sendParamTuple)
    logger.debug(`QuoteOFT receipt: ${receipt}`)

    // 3. Update minAmount + compose payload using quoted amountReceivedLD
    const amountReceivedLD = (() => {
        if (isReceiptObject(receipt)) {
            return receipt.amountReceivedLD
        }

        if (Array.isArray(receipt)) {
            return getAmountFromArray(receipt)
        }

        return undefined
    })()

    if (!amountReceivedLD) {
        logger.error(`quoteOFT returned an unexpected receipt format: ${receipt}`)
        throw new Error('quoteOFT returned an unexpected receipt format')
    }

    // Update minAmountLD (index 3) and the compose payload (index 5)
    sendParamTuple[3] = amountReceivedLD
    logger.debug('Updated send param', { sendParamTuple })

    const quoteSendResult = await pool.quoteSend(sendParamTuple, payInLzToken)
    logger.debug('QuoteSend result', { quoteSendResult })

    const messagingFee = (() => {
        if (Array.isArray(quoteSendResult)) {
            return [
                quoteSendResult[0] ?? quoteSendResult[quoteSendResult.length - 2],
                quoteSendResult[1] ?? quoteSendResult[quoteSendResult.length - 1],
            ]
        }
        throw new Error('quoteSend returned an unexpected format')
    })()

    const valueToSend = messagingFee[0]

    // 4. Ensure ERC20 approval if pool is token-based
    const tokenAddress = await pool.token()

    if (tokenAddress !== ethers.constants.AddressZero) {
        const erc20Abi = await hre.artifacts.readArtifact('IERC20')
        const erc20 = await ethers.getContractAt(erc20Abi.abi, tokenAddress, signer)

        const currentAllowance = await erc20.allowance(signer.address, pool.address)
        logger.info(`Checking current allowance.`)

        if (currentAllowance.lt(amountLD)) {
            logger.info(`Approving pool to spend tokens.`)
            const approveTx = await erc20.approve(pool.address, amountLD)
            await approveTx.wait()
            logger.info(`Approval confirmed: ${approveTx.hash}`)
        }
    }

    // 5. Execute Stargate send with computed params and fees
    const tx = await pool.send(sendParamTuple, messagingFee, refundAddress, {
        value: valueToSend,
    })

    logger.info(`Stargate transaction submitted: ${tx.hash}`)
    await tx.wait()
    logger.info(`Stargate transaction confirmed.`)
}

task('stargate:supply-aave', 'Sends tokens through Stargate and composes into AaveV3Composer')
    .addParam('stargate', 'Stargate pool address')
    .addParam('dstEid', 'Destination endpoint ID')
    .addParam('composer', 'Composer contract address on the destination chain')
    .addParam('amountLd', 'Token amount in local decimals to bridge')
    .addOptionalParam('tokenReceiver', 'Recipient address on the destination chain')
    .addOptionalParam('composeGasLimit', 'Gas limit to allocate for the compose call')
    .addOptionalParam('refundAddress', 'Address receiving any leftover native fee')
    .addOptionalParam('payInLzToken', 'Set to true to pay LayerZero fees with the LZ token (default false)', 'false')
    .setAction(async (args: SendArgs, hre) => sendSupply(hre, args))

/*
pnpm hardhat stargate:supply-aave --network arbitrum-mainnet --stargate 0xe8cdf27acd73a434d661c84887215f7598e7d0d3 --dst-eid 30184 --composer 0xb38c4fc4b7c7672EfdA6f8b3a386e615049eed30 --amount-ld 1000000
*/
