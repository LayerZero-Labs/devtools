import { PopulatedTransaction, BigNumber } from 'ethers'

import { WireEvm } from '../types'
import { chainDataMapper } from '../../wireEVMOFTs'

/**
 * Sets peer information for connections to wire.
 */
export async function simulateTransactions(txs: PopulatedTransaction[][], wireFactories: WireEvm[]) {
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

    console.log(`Simulating Transactions`)
    console.log(`Total transactions: ${totalTransactions}`)
    console.log(`Skipping transactions (already set): ${nullTxCount}`)
    console.log(`Sending transactions: ${totalTransactions - nullTxCount}`)

    const simulationNonce: Record<number, number> = {}
    const simulationBalance: Record<number, BigNumber> = {}

    for (let j = 0; j < transactions; j++) {
        const eid = wireFactories[j].fromEid
        const signer = wireFactories[j].signer

        simulationNonce[eid] = await signer.getTransactionCount()
        simulationBalance[eid] = await signer.getBalance()
    }

    for (let i = 0; i < steps; i++) {
        const operation = txs[i]

        for (let j = 0; j < transactions; j++) {
            const chainTx = operation[j]

            if (!isNullTx(chainTx)) {
                const { contract, evmAddress, fromEid: eid } = wireFactories[j]
                const provider = contract.provider

                const gasUsed = await provider.estimateGas(chainTx)

                simulationBalance[eid] = simulationBalance[eid].sub(gasUsed.mul(chainDataMapper[eid]['gasPrice']))

                if (simulationBalance[eid].lt(0)) {
                    console.error(`Insufficient balance for ${eid} @ ${evmAddress} ${simulationBalance[eid]}`)
                    return
                }

                const decodedData = contract.interface.parseTransaction({ data: chainTx.data })
                const methodName = decodedData.name
                const args = decodedData.args

                // @todo Fix the error handling
                try {
                    await contract.callStatic[methodName](...args, {
                        gasLimit: gasUsed,
                        gasPrice: chainDataMapper[eid]['gasPrice'],
                        nonce: simulationNonce[eid]++,
                    })
                } catch (e) {
                    console.error(`Error simulating transaction ${i + 1}/${steps} to ${eid} @ ${evmAddress} \n`)
                    console.error(e)
                    return
                }
            }
        }
    }
}

function isNullTx(tx: PopulatedTransaction) {
    return tx.data === '' && tx.from === '' && tx.to === ''
}
