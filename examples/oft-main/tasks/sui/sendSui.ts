import { Transaction } from '@mysten/sui/transactions'

import { createConnectionFactory, createRpcUrlFactory } from '@layerzerolabs/devtools-sui'
import { EndpointId, Stage, endpointIdToStage } from '@layerzerolabs/lz-definitions'
import { OFT } from '@layerzerolabs/lz-sui-oft-sdk-v2'
import { SDK } from '@layerzerolabs/lz-sui-sdk-v2'
import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'

import { SendResult } from '../common/types'
import { getLayerZeroScanLink } from '../solana'
import { parseDecimalToUnits } from '../solana/utils'

import { assertSuiEid, getSuiKeypairFromEnv } from './utils'

const hexToBytes = (value?: string) =>
    value ? Uint8Array.from(Buffer.from(value.replace(/^0x/, ''), 'hex')) : new Uint8Array()

const toBytes32 = (value: string) => {
    const clean = value.replace(/^0x/, '')
    if (clean.length === 64) {
        return Uint8Array.from(Buffer.from(clean, 'hex'))
    }
    return addressToBytes32(value)
}

export interface SuiArgs {
    amount: string
    to: string
    srcEid: EndpointId
    dstEid: EndpointId
    minAmount?: string
    extraOptions?: string
    composeMsg?: string
    oftPackageId: string
    oftObjectId: string
    oappObjectId: string
    tokenType: string
}

export async function sendSui({
    amount,
    to,
    srcEid,
    dstEid,
    minAmount,
    extraOptions,
    composeMsg,
    oftPackageId,
    oftObjectId,
    oappObjectId,
    tokenType,
}: SuiArgs): Promise<SendResult> {
    assertSuiEid(srcEid)

    const keypair = getSuiKeypairFromEnv()
    const sender = keypair.getPublicKey().toSuiAddress()
    const connectionFactory = createConnectionFactory(createRpcUrlFactory())
    const client = await connectionFactory(srcEid)

    const stage = endpointIdToStage(srcEid) as Stage
    const sdk = new SDK({ client, stage })
    const oft = new OFT(sdk, oftPackageId, oftObjectId, tokenType, oappObjectId)

    const metadata = await client.getCoinMetadata({ coinType: tokenType })
    if (!metadata) {
        throw new Error(`Unable to fetch Sui coin metadata for ${tokenType}`)
    }

    const amountUnits = parseDecimalToUnits(amount, metadata.decimals)
    const minAmountUnits = minAmount ? parseDecimalToUnits(minAmount, metadata.decimals) : amountUnits

    const sendParam = {
        dstEid,
        to: Buffer.from(toBytes32(to)),
        amountLd: amountUnits,
        minAmountLd: minAmountUnits,
        extraOptions: hexToBytes(extraOptions),
        composeMsg: hexToBytes(composeMsg),
        oftCmd: new Uint8Array(),
    }

    const fee = await oft.quoteSend(sender, sendParam, false)

    const tx = new Transaction()
    const coinProvided = await oft.splitCoinMoveCall(tx, sender, sendParam.amountLd)
    await oft.sendMoveCall(tx, sender, sendParam, coinProvided, fee.nativeFee, fee.zroFee, sender)
    tx.transferObjects([coinProvided], sender)

    const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
        options: { showObjectChanges: true },
    })

    await client.waitForTransaction({ digest: result.digest })

    const isTestnet = endpointIdToStage(srcEid) !== Stage.MAINNET
    return {
        txHash: result.digest,
        scanLink: getLayerZeroScanLink(result.digest, isTestnet),
    }
}
