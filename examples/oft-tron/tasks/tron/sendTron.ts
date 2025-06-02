import bs58 from 'bs58'
import { parseUnits } from 'ethers/lib/utils'

import { makeBytes32 } from '@layerzerolabs/devtools'
import { createLogger } from '@layerzerolabs/io-devtools'
import { EndpointId, endpointIdToNetwork } from '@layerzerolabs/lz-definitions'

import { initTronWeb } from '../common/taskHelper'
import { SendResult } from '../common/types'

const logger = createLogger()

export interface TronArgs {
    srcEid: number
    dstEid: number
    amount: string
    to: string
    minAmount?: string
    extraOptions?: string
    composeMsg?: string
    oftAddress?: string
}

export async function sendTron({
    srcEid,
    dstEid,
    amount,
    to,
    minAmount,
    extraOptions,
    composeMsg,
    oftAddress,
}: TronArgs): Promise<SendResult> {
    // Check if source chain is Tron
    if (srcEid !== EndpointId.TRON_V2_MAINNET && srcEid !== EndpointId.TRON_V2_TESTNET) {
        throw new Error(`non-Tron srcEid (${srcEid}) not supported here`)
    }

    // Initialize TronWeb
    const network = srcEid === EndpointId.TRON_V2_MAINNET ? 'mainnet' : 'testnet'
    const tronWeb = initTronWeb(network, process.env.PRIVATE_KEY ?? '')

    // Load the OFT contract ABI
    const ioftArtifact = require('@layerzerolabs/oft-evm/artifacts/contracts/interfaces/IOFT.sol/IOFT.json')
    const oft = await tronWeb.contract(ioftArtifact.abi, oftAddress)

    // Get the underlying token address and decimals
    const underlying = await oft.token().call()
    const erc20 = await tronWeb.contract(require('@openzeppelin/contracts/build/contracts/ERC20.json').abi, underlying)
    const decimals = await erc20.decimals().call()

    // Normalize the user-supplied amount
    const amountUnits = parseUnits(amount, decimals)

    // Decide how to encode `to` based on target chain
    const isSolana = dstEid === EndpointId.SOLANA_V2_MAINNET || dstEid === EndpointId.SOLANA_V2_TESTNET
    let toBytes: string
    if (isSolana) {
        // Base58→32-byte buffer
        toBytes = makeBytes32(bs58.decode(to))
    } else {
        // hex string → Uint8Array → zero-pad to 32 bytes
        toBytes = makeBytes32(to)
    }

    // Build sendParam
    const sendParam = {
        dstEid,
        to: toBytes,
        amountLD: amountUnits.toString(),
        minAmountLD: minAmount ? parseUnits(minAmount, decimals).toString() : amountUnits.toString(),
        extraOptions: extraOptions ? extraOptions.toString() : '0x',
        composeMsg: composeMsg ? composeMsg.toString() : '0x',
        oftCmd: '0x',
    }

    // Quote the native gas cost
    logger.info('Quoting the native gas cost for the send transaction...')
    let msgFee: { nativeFee: string; lzTokenFee: string }
    try {
        msgFee = await oft.quoteSend(sendParam, false).call()
    } catch (error) {
        logger.error(`Error quoting native gas cost for network: ${endpointIdToNetwork(srcEid)}, OFT: ${oftAddress}`)
        throw error
    }

    // Send the transaction
    logger.info('Sending the transaction...')
    let tx
    try {
        tx = await oft
            .send(sendParam, msgFee, tronWeb.address.toHex(), {
                value: msgFee.nativeFee,
            })
            .send()
    } catch (error) {
        logger.error(`Error sending transaction for network: ${endpointIdToNetwork(srcEid)}, OFT: ${oftAddress}`)
        throw error
    }

    const txHash = tx.txid
    const scanLink = `https://scan.layerzero.network/tx/${txHash}`

    return { txHash, scanLink }
}
