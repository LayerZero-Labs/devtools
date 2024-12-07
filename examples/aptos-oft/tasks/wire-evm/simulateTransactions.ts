import { BigNumber, providers, Contract } from 'ethers'
import { ContractMetadataMapping, TxEidMapping } from '../utils/types'
import { chainDataMapper } from '../wireEVMOFTs'

/**
 * Sets peer information for connections to wire.
 */
export async function simulateTransactions(eidMetaData: ContractMetadataMapping, TxTypeEidMapping: TxEidMapping) {
    const chains = Object.entries(eidMetaData).length
    const transactionTypes = Object.entries(TxTypeEidMapping).length
    let totalTransactions = 0

    for (const key in TxTypeEidMapping) {
        for (const _eid in TxTypeEidMapping[key]) {
            totalTransactions++
        }
    }

    console.log(`Total chains: ${chains}`)
    console.log(`Total transaction types: ${transactionTypes}`)
    console.log(`Total transactions: ${totalTransactions}\n`)

    const simulationNonce: Record<number, number> = {}
    const simulationBalance: Record<number, BigNumber> = {}

    for (const [eid, eidData] of Object.entries(eidMetaData)) {
        const signer = eidData.contract.signer

        simulationNonce[eid] = await signer.getTransactionCount()
        simulationBalance[eid] = await signer.getBalance()
    }

    for (const [_txType, EidTxsMapping] of Object.entries(TxTypeEidMapping)) {
        for (const [eid, TxPool] of Object.entries(EidTxsMapping)) {
            const evmAddress = eidMetaData[eid].evmAddress
            const contract: Contract = eidMetaData[eid].contract
            const provider: providers.JsonRpcProvider = eidMetaData[eid].provider

            for (const tx of TxPool) {
                const gasUsed = await provider
                    .estimateGas(tx)
                    .then((gasUsed) => {
                        simulationBalance[eid] = simulationBalance[eid].sub(
                            gasUsed.mul(chainDataMapper[eid]['gasPrice'])
                        )
                        return gasUsed
                    })
                    .catch((e) => {
                        console.error(`Error estimating gas for ${eid} @ ${evmAddress}`)
                        console.error(e)
                    })

                if (simulationBalance[eid].lt(0)) {
                    console.error(`Insufficient balance for ${eid} @ ${evmAddress} ${simulationBalance[eid]}`)
                    return
                }

                const decodedData = contract.interface.parseTransaction({ data: tx.data })
                const methodName = decodedData.name
                const args = decodedData.args

                // // @todo Fix the error handling
                await contract.callStatic[methodName](...args, {
                    gasLimit: gasUsed,
                    gasPrice: chainDataMapper[eid]['gasPrice'],
                    nonce: simulationNonce[eid]++,
                })
                    .then((_result) => {
                        console.log(`Successful transaction simulation for ${eid} @ ${evmAddress}`)
                    })
                    .catch((e) => {
                        console.error(`Error simulating transaction ${eid} @ ${evmAddress}`)
                        console.error(e)
                        return
                    })
            }
        }
    }
    console.log('\nAll transactions have been SIMULATED on the blockchains.')
}
