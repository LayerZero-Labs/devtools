import { Contract } from 'starknet'

import { createConnectionFactory, createRpcUrlFactory } from '@layerzerolabs/devtools-starknet'
import { EndpointId, Stage, endpointIdToStage } from '@layerzerolabs/lz-definitions'

import { SendResult } from '../common/types'
import { getLayerZeroScanLink } from '../solana'
import { parseDecimalToUnits } from '../solana/utils'

import { assertStarknetEid, getStarknetAccountFromEnv } from './utils'

/**
 * Convert hex string to a string for Cairo ByteArray.
 * In starknet.js v8, ByteArray parameters accept plain strings.
 *
 * NOTE: This uses latin1 encoding which can be corrupted by starknet.js's
 * UTF-8 re-encoding for bytes >= 128. For enforced options which typically
 * contain 0x80-0xFF bytes, use hexToByteArrayCalldata() with raw calldata.
 */
const hexToString = (hex?: string): string => {
    if (!hex || hex === '0x' || hex === '') {
        return ''
    }
    const clean = hex.replace(/^0x/, '')
    const buffer = Buffer.from(clean, 'hex')
    return buffer.toString('latin1')
}

export interface StarknetArgs {
    amount: string
    to: string
    srcEid: EndpointId
    dstEid: EndpointId
    minAmount?: string
    extraOptions?: string
    composeMsg?: string
    oftAddress: string
    tokenDecimals?: number
}

export async function sendStarknet({
    amount,
    to,
    srcEid,
    dstEid,
    minAmount,
    extraOptions,
    composeMsg,
    oftAddress,
    tokenDecimals = 18,
}: StarknetArgs): Promise<SendResult> {
    assertStarknetEid(srcEid)

    // Use createRpcUrlFactory() to read from environment variables (RPC_URL_STARKNET)
    const providerFactory = createConnectionFactory(createRpcUrlFactory())
    const provider = await providerFactory(srcEid)
    const account = await getStarknetAccountFromEnv(srcEid)

    const oftContract = await getOftMintBurnAdapterContract(oftAddress, account)

    const amountUnits = parseDecimalToUnits(amount, tokenDecimals)
    const minAmountUnits = minAmount ? parseDecimalToUnits(minAmount, tokenDecimals) : amountUnits

    const sendParam = {
        dst_eid: dstEid,
        to: { value: BigInt(to) },
        amount_ld: amountUnits,
        min_amount_ld: minAmountUnits,
        extra_options: hexToString(extraOptions),
        compose_msg: hexToString(composeMsg),
        oft_cmd: hexToString(),
    }

    const feeQuote = await oftContract.quote_send(sendParam, false)
    const call = await oftContract.populateTransaction.send(
        sendParam,
        {
            native_fee: feeQuote.native_fee,
            lz_token_fee: feeQuote.lz_token_fee,
        },
        account.address
    )

    const response = await account.execute([call])
    const txHash = response.transaction_hash
    await provider.waitForTransaction(txHash)

    const isTestnet = endpointIdToStage(srcEid) !== Stage.MAINNET
    return {
        txHash,
        scanLink: getLayerZeroScanLink(txHash, isTestnet),
    }
}

function getOftMintBurnAdapterAbi(): unknown {
    // Load the ABI from the package's main export
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('@layerzerolabs/oft-mint-burn-starknet')
    const abi = pkg.abi?.oFTMintBurnAdapter
    if (!abi) {
        throw new Error('Unable to locate OFTMintBurnAdapter ABI in @layerzerolabs/oft-mint-burn-starknet')
    }
    return abi
}

async function getOftMintBurnAdapterContract(address: string, providerOrAccount: any) {
    const abi = getOftMintBurnAdapterAbi()
    return new Contract({ abi: abi as any, address, providerOrAccount })
}
