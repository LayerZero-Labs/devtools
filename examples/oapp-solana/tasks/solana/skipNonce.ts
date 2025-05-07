import { publicKey, transactionBuilder } from '@metaplex-foundation/umi'
import bs58 from 'bs58'
import { task, types } from 'hardhat/config'
import { ActionType, HardhatRuntimeEnvironment } from 'hardhat/types'

import { normalizePeer } from '@layerzerolabs/devtools'
import { types as devtoolsTypes } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'

import { myoapp } from '../../lib/client'

import { deriveConnection, getExplorerTxLink, getLayerZeroScanLink, getSolanaDeployment } from '.'

interface Args {
    sender: string
    fromEid: EndpointId
    toEid: EndpointId
    nonce: number
}

const action: ActionType<Args> = async (args, hre: HardhatRuntimeEnvironment) => {
    const { fromEid, sender, nonce, toEid } = args
    const solanaDeployment = getSolanaDeployment(toEid)
    const counter: myoapp.MyOApp = new myoapp.MyOApp(publicKey(solanaDeployment.programId))
    const { connection, umi, umiWalletSigner } = await deriveConnection(toEid)

    const params: Pick<myoapp.instructions.SkipInboundNonceInstructionDataArgs, 'srcEid' | 'sender' | 'nonce'> = {
        srcEid: fromEid,
        sender: normalizePeer(sender, fromEid),
        nonce: nonce,
    }
    const ixn = counter.skipInboundNonce(umiWalletSigner, params)

    const txBuilder = transactionBuilder().add([ixn])

    const { signature } = await txBuilder.sendAndConfirm(umi)
    const transactionSignatureBase58 = bs58.encode(signature)

    const isTestnet = fromEid == EndpointId.SOLANA_V2_TESTNET
    console.log(`View Solana transaction here: ${getExplorerTxLink(transactionSignatureBase58.toString(), isTestnet)}`)
    console.log(`Track cross-chain transfer here: ${getLayerZeroScanLink(transactionSignatureBase58, isTestnet)}`)
}

task('lz:oapp:solana:skip-nonce', 'gets the oapp address', action)
    .addParam('toEid', 'The destination endpoint ID', undefined, devtoolsTypes.eid)
    .addParam('fromEid', 'The source endpoint ID', undefined, devtoolsTypes.eid)
    .addParam('sender', 'The sender address', undefined, types.string, false)
    .addParam('nonce', 'The nonce to skip', undefined, types.int, false)
