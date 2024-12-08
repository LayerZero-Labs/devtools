import { BigNumber, providers, Contract } from 'ethers'
import { ContractMetadataMapping, TxEidMapping, eid } from '../utils/types'
import { chainDataMapper } from '../wireEVMOFTs'
import { exit } from 'process'

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

    // Populate simulation account data - does not need to have an address for each eid because the same deployer accunt is used for all chains
    const simulationNonce: Record<eid, number> = {}
    // To check if the user's balance is sufficient to submit all the transactions
    const simulationBalance: Record<eid, BigNumber> = {}

    for (const [eid, eidData] of Object.entries(eidMetaData)) {
        const signer = eidData.contract.signer

        // @todo Fetch from wireEVMOFT.ts instead of performing another await
        simulationNonce[eid] = await signer.getTransactionCount()
        simulationBalance[eid] = await signer.getBalance()
    }

    /*
     * Under the following mapping : f(TxType,eid) = [PopulatedTransaction_{txtype,eid}]
     * Looping through the different transaction types such as setPeer, setDelegate, setEnforcedOptions....
     * We loop through the different eids which corresponds to different chains and collect :
     *      1. oappAddress, 2. ethers contract object, and 3. provider
     * TxPool is an array of the populated transactions to be submitted on-chain.
     *  - It is usually a single element array in the case of setPeer, setDelegate
     *  - setEnforcedOptions can have multiple transactions in the pool for the varied msgTypes
     *
     * We check if the user's balance is sufficient to submit all the transactions.
     */
    for (const [txType, EidTxsMapping] of Object.entries(TxTypeEidMapping)) {
        for (const [eid, TxPool] of Object.entries(EidTxsMapping)) {
            const evmAddress = eidMetaData[eid].evmAddress
            const contract: Contract = eidMetaData[eid].contract
            const provider: providers.JsonRpcProvider = eidMetaData[eid].provider

            for (const tx of TxPool) {
                // Iteratively estimate gas for each transaction and update the balance
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

                // If the balance < 0, we know the user does not have enough funds to submit the transaction and we exit
                if (simulationBalance[eid].lt(0)) {
                    console.error(`Insufficient balance for ${eid} @ ${evmAddress} ${simulationBalance[eid]}`)
                    exit(1)
                }

                const decodedData = contract.interface.parseTransaction({ data: tx.data })
                const methodName = decodedData.name
                const args = decodedData.args

                // static call the method to simulate the transaction
                // - this can catch any errors before submitting the transaction such as incorrect arguments or sender address
                await contract.callStatic[methodName](...args, {
                    gasLimit: gasUsed,
                    gasPrice: chainDataMapper[eid]['gasPrice'],
                    nonce: simulationNonce[eid]++,
                })
                    .then((_result) => {
                        console.log(`Successful ${txType} transaction simulation for ${eid} @ ${evmAddress}`)
                    })
                    .catch((e) => {
                        // @todo Improve error handling
                        console.error(`Error simulating transaction ${eid} @ ${evmAddress}`)
                        console.error(e)
                        return
                    })
            }
        }
    }
    console.log('\nAll transactions have been SIMULATED on the blockchains.')
}
