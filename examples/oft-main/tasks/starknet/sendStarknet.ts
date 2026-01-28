import { Contract } from 'starknet'

import { createConnectionFactory, createRpcUrlFactory } from '@layerzerolabs/devtools-starknet'
import { EndpointId, Stage, endpointIdToStage } from '@layerzerolabs/lz-definitions'

import { SendResult } from '../common/types'
import { getLayerZeroScanLink } from '../solana'
import { parseDecimalToUnits } from '../solana/utils'

import { assertStarknetEid, getStarknetAccountFromEnv } from './utils'

// STRK token address on Starknet mainnet
const STRK_TOKEN_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d'

// Minimal ERC20 ABI for approve
const ERC20_ABI = [
    {
        name: 'approve',
        type: 'function',
        inputs: [
            { name: 'spender', type: 'core::starknet::contract_address::ContractAddress' },
            { name: 'amount', type: 'core::integer::u256' },
        ],
        outputs: [{ type: 'core::bool' }],
        state_mutability: 'external',
    },
]

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

    // Create STRK approval for the native fee (with 10% buffer for price fluctuation)
    const feeWithBuffer = (BigInt(feeQuote.native_fee) * 110n) / 100n
    const strkContract = new Contract({
        abi: ERC20_ABI as any,
        address: STRK_TOKEN_ADDRESS,
        providerOrAccount: account,
    })
    const approveCall = strkContract.populateTransaction.approve(oftAddress, { low: feeWithBuffer, high: 0n })

    const sendCall = oftContract.populateTransaction.send(
        sendParam,
        {
            native_fee: feeQuote.native_fee,
            lz_token_fee: feeQuote.lz_token_fee,
        },
        account.address
    )

    // Execute approval and send in a single multicall
    const response = await account.execute([approveCall, sendCall])
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
