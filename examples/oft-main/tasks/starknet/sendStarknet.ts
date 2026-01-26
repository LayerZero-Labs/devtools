import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

import { Contract } from 'starknet'

import { createConnectionFactory } from '@layerzerolabs/devtools-starknet'
import { EndpointId, Stage, endpointIdToStage } from '@layerzerolabs/lz-definitions'

import { SendResult } from '../common/types'
import { getLayerZeroScanLink } from '../solana'
import { parseDecimalToUnits } from '../solana/utils'

import { assertStarknetEid, getStarknetAccountFromEnv } from './utils'

const hexToBytes = (value?: string) =>
    value ? Uint8Array.from(Buffer.from(value.replace(/^0x/, ''), 'hex')) : new Uint8Array()

const toCairoByteArray = (hex?: string) => {
    const clean = (hex ?? '').replace(/^0x/, '')
    if (!clean) {
        return { data: [], pending_word: '0x0', pending_word_len: 0 }
    }
    const bytes = Buffer.from(clean, 'hex')
    const chunkSize = 31
    const data: string[] = []
    for (let offset = 0; offset + chunkSize <= bytes.length; offset += chunkSize) {
        data.push(`0x${bytes.subarray(offset, offset + chunkSize).toString('hex')}`)
    }
    const remainder = bytes.length % chunkSize
    const pendingBytes = remainder ? bytes.subarray(bytes.length - remainder) : Buffer.alloc(0)
    return {
        data,
        pending_word: pendingBytes.length ? `0x${pendingBytes.toString('hex')}` : '0x0',
        pending_word_len: pendingBytes.length,
    }
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

    const providerFactory = createConnectionFactory()
    const provider = await providerFactory(srcEid)
    const account = await getStarknetAccountFromEnv(srcEid)

    const oftContract = await getOftMintBurnAdapterContract(oftAddress, provider)
    oftContract.connect(account)

    const amountUnits = parseDecimalToUnits(amount, tokenDecimals)
    const minAmountUnits = minAmount ? parseDecimalToUnits(minAmount, tokenDecimals) : amountUnits

    const sendParam = {
        dst_eid: dstEid,
        to: { value: BigInt(to) },
        amount_ld: amountUnits,
        min_amount_ld: minAmountUnits,
        extra_options: toCairoByteArray(extraOptions),
        compose_msg: toCairoByteArray(composeMsg),
        oft_cmd: toCairoByteArray(),
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
    const require = createRequire(import.meta.url)
    const pkgRoot = path.dirname(require.resolve('@layerzerolabs/oft-mint-burn-starknet/package.json'))
    const candidates = [
        'dist/generated/abi/o-f-t-mint-burn-adapter.cjs',
        'dist/generated/abi/o-f-t-mint-burn-adapter.js',
        'contracts/oft_mint_burn/target/release/oft_mint_burn_OFTMintBurnAdapter.contract_class.json',
        'contracts/oft_mint_burn/target/dev/oft_mint_burn_OFTMintBurnAdapter.contract_class.json',
        'contracts/oft_mint_burn/target/release/oft_mint_burn_OFTMintBurnAdapter.compiled_contract_class.json',
        'contracts/oft_mint_burn/target/dev/oft_mint_burn_OFTMintBurnAdapter.compiled_contract_class.json',
    ]

    for (const relPath of candidates) {
        const fullPath = path.join(pkgRoot, relPath)
        if (fs.existsSync(fullPath)) {
            if (fullPath.endsWith('.js') || fullPath.endsWith('.cjs')) {
                return require(fullPath)
            }
            const json = JSON.parse(fs.readFileSync(fullPath, 'utf8'))
            return json.abi ?? json
        }
    }

    throw new Error('Unable to locate OFTMintBurnAdapter ABI in @layerzerolabs/oft-mint-burn-starknet')
}

async function getOftMintBurnAdapterContract(
    address: string,
    provider: ReturnType<typeof createConnectionFactory> extends () => Promise<infer T> ? T : never
) {
    const abi = getOftMintBurnAdapterAbi()
    return new Contract({ abi: abi as any, address, providerOrAccount: provider as any })
}
