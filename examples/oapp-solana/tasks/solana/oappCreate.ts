import { publicKey, transactionBuilder } from '@metaplex-foundation/umi'
import bs58 from 'bs58'
import { task, types } from 'hardhat/config'
import { ActionType, HardhatRuntimeEnvironment } from 'hardhat/types'

import { EndpointId } from '@layerzerolabs/lz-definitions'

import { myoapp } from '../../lib/client'

import { deriveConnection, getExplorerTxLink, saveSolanaDeployment } from '.'

interface Args {
    programId: string
    /**
     * The endpoint ID for the Solana network.
     */
    eid: EndpointId
}

const action: ActionType<Args> = async ({ programId, eid }, hre: HardhatRuntimeEnvironment) => {
    // TODO: accept program ID as a param

    const isTestnet = eid == EndpointId.SOLANA_V2_TESTNET

    const myoappInstance: myoapp.MyOApp = new myoapp.MyOApp(publicKey(programId))
    const [oapp] = myoappInstance.pda.oapp()
    const { umi, umiWalletSigner } = await deriveConnection(eid)
    const txBuilder = transactionBuilder().add(myoappInstance.initStore(umiWalletSigner, umiWalletSigner.publicKey))
    const tx = await txBuilder.sendAndConfirm(umi)
    console.log(`createTx: ${getExplorerTxLink(bs58.encode(tx.signature), isTestnet)}`)
    saveSolanaDeployment(eid, programId, oapp)
}

task('lz:oapp:solana:create', 'inits the oapp account', action)
    .addParam('programId', 'The program ID of the OApp', undefined, types.string, false)
    .addParam('eid', 'The endpoint ID for the Solana network.', undefined, types.int, false)
