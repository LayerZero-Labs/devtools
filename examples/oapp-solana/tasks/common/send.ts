import { publicKey, transactionBuilder } from '@metaplex-foundation/umi'
import bs58 from 'bs58'
import { task, types } from 'hardhat/config'
import { ActionType, HardhatRuntimeEnvironment } from 'hardhat/types'

import { ChainType, endpointIdToChainType } from '@layerzerolabs/lz-definitions'
import { Options } from '@layerzerolabs/lz-v2-utilities'

import { myoapp } from '../../lib/client'
import { TransactionType, addComputeUnitInstructions, deriveConnection, getSolanaDeployment } from '../solana/index'
import { getLayerZeroScanLink, isV2Testnet } from '../utils'

interface TaskArguments {
    fromEid: number
    dstEid: number
    message: string
    computeUnitPriceScaleFactor: number
    contractName: string
}

const action: ActionType<TaskArguments> = async (
    { fromEid, dstEid, message, computeUnitPriceScaleFactor, contractName },
    hre: HardhatRuntimeEnvironment
) => {
    if (endpointIdToChainType(fromEid) === ChainType.SOLANA) {
        await sendFromSolana(fromEid, dstEid, message, computeUnitPriceScaleFactor)
    } else if (endpointIdToChainType(fromEid) === ChainType.EVM) {
        await sendFromEvm(dstEid, message, contractName, hre)
    } else {
        throw new Error(`Unsupported ChainType for fromEid ${fromEid}`)
    }
}

async function sendFromSolana(fromEid: number, dstEid: number, message: string, computeUnitPriceScaleFactor: number) {
    const solanaEid = fromEid
    const solanaDeployment = getSolanaDeployment(solanaEid)
    const { connection, umi, umiWalletSigner } = await deriveConnection(solanaEid)

    const counter: myoapp.MyOApp = new myoapp.MyOApp(publicKey(solanaDeployment.programId))

    const options = Options.newOptions().toBytes() // leaving empty, relying on enforced options instead

    const { nativeFee } = await counter.quote(umi.rpc, umiWalletSigner.publicKey, {
        dstEid,
        message,
        options,
        payInLzToken: false,
    })

    console.log('🔖 Native fee quoted:', nativeFee.toString())

    let txBuilder = transactionBuilder().add(
        await counter.send(umi.rpc, umiWalletSigner.publicKey, {
            dstEid,
            message,
            options,
            nativeFee,
        })
    )
    txBuilder = await addComputeUnitInstructions(
        connection,
        umi,
        fromEid,
        txBuilder,
        umiWalletSigner,
        computeUnitPriceScaleFactor,
        TransactionType.SendMessage
    )
    const tx = await txBuilder.sendAndConfirm(umi)
    const txHash = bs58.encode(tx.signature)

    console.log('✉️  Cross-chain message:', `"${message}"`, '→ endpointId', dstEid)
    console.log('🧾 Transaction hash:', txHash)
    console.log('🌐 Track transfer:', getLayerZeroScanLink(txHash, isV2Testnet(dstEid)))
}

async function sendFromEvm(dstEid: number, message: string, contractName: string, hre: HardhatRuntimeEnvironment) {
    const signer = await hre.ethers.getNamedSigner('deployer')

    // @ts-expect-error signer is fine
    const myOApp = (await hre.ethers.getContract(contractName)).connect(signer)

    const options = Options.newOptions().toHex().toString() // leaving empty, relying on enforced options instead

    const [nativeFee] = await myOApp.quote(dstEid, message, options, false)

    console.log('🔖 Native fee quoted:', nativeFee.toString())

    const txResponse = await myOApp.send(dstEid, message, options, {
        value: nativeFee,
    })
    const txReceipt = await txResponse.wait()

    console.log('✉️  Cross-chain message:', `"${message}"`, '→ endpointId', dstEid)
    console.log('🧾 Transaction hash:', txReceipt.transactionHash)
    console.log('🌐 Track transfer:', getLayerZeroScanLink(txReceipt.transactionHash, isV2Testnet(dstEid)))
}

// Note: for testing reference, Optimism Sepolia's eid is 40232 and Solana Devnet's eid is 40168
task('lz:oapp:send', 'Sends a string message cross-chain', action)
    .addParam('fromEid', 'Source endpoint ID', undefined, types.int, false)
    .addParam('dstEid', 'Destination endpoint ID', undefined, types.int, false)
    .addParam('message', 'String message to send', undefined, types.string, false)
    .addParam('computeUnitPriceScaleFactor', 'The compute unit price scale factor', 4, types.float, true) // only if fromEid is Solana
    .addOptionalParam('contractName', 'Name of the OApp contract in deployments folder', 'MyOApp', types.string) // only if fromEid is EVM
