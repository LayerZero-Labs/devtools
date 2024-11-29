import { PopulatedTransaction } from 'ethers'
import { WireEvm } from '../types'
import { chainDataMapper } from '../../wireEVMOFTs'

/**
 * Sets peer information for connections to wire.
 */
export async function executeTransactions(txs: PopulatedTransaction[][], wireFactories: WireEvm[]) {
    const steps = txs.length
    const transactions = wireFactories.length
    const totalTransactions = steps * transactions

    // count the number of nullTx in each operation
    let nullTxCount = 0
    for (let i = 0; i < steps; i++) {
        const operation = txs[i]
        for (let j = 0; j < transactions; j++) {
            if (isNullTx(operation[j])) {
                nullTxCount++
            }
        }
    }

    console.log(`Total transactions: ${totalTransactions}`)
    console.log(`Skipping transactions (already set): ${nullTxCount}`)
    console.log(`Sending transactions: ${totalTransactions - nullTxCount}`)

    const tx_pool = []
    for (let i = 0; i < steps; i++) {
        const operation = txs[i]
        for (let j = 0; j < transactions; j++) {
            const chainTx = operation[j]

            if (!isNullTx(chainTx)) {
                const { contract, evmAddress, fromEid: eid } = wireFactories[j]

                const signer = contract.signer
                const provider = contract.provider

                chainTx['gasLimit'] = await provider.estimateGas(chainTx)
                chainTx['gasPrice'] = chainDataMapper[eid]['gasPrice']
                chainTx['nonce'] = chainDataMapper[eid]['nonce']++

                console.log(`Sending transaction ${i + 1}/${steps} to ${eid} @ ${evmAddress}`)
                const signedTransaction = await signer.signTransaction(chainTx)
                tx_pool.push(provider.sendTransaction(signedTransaction))
            }
        }
    }

    await Promise.all(tx_pool)
    console.log('All transactions have been executed on the blockchains.')
}

function isNullTx(tx: PopulatedTransaction) {
    return tx.data === '' && tx.from === '' && tx.to === ''
}
