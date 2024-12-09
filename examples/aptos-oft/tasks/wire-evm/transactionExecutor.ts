import { providers, Contract } from 'ethers'
import type { ContractMetadataMapping, TxEidMapping, AccountData, eid } from '../utils/types'
import { ethers } from 'ethers'

/**
 * @author Shankar
 * @notice Simulates transactions on the blockchains
 * - Fetches the nonce and balance for each chain
 * - Estimates gas for each transaction and updates the balance
 * - Checks if the user's balance is sufficient to submit all the transactions
 * - Simulates transactions on-chain and catches any errors before submitting the transaction
 */
export async function executeTransactions(
    eidMetaData: ContractMetadataMapping,
    TxTypeEidMapping: TxEidMapping,
    rpcUrlsMap: Record<eid, string>
) {
    const num_chains = Object.entries(eidMetaData).length
    const num_transactionTypes = Object.entries(TxTypeEidMapping).length
    let totalTransactions = 0

    for (const key in TxTypeEidMapping) {
        for (const _eid in TxTypeEidMapping[key]) {
            totalTransactions++
        }
    }

    console.log(`Total chains: ${num_chains}`)
    console.log(`Total transaction types: ${num_transactionTypes}`)
    console.log(`Total transactions: ${totalTransactions}\n`)

    // Populate simulation account data - does not need to have an address for each eid because the same deployer accunt is used for all chains
    const accountEidMap: AccountData = {}
    const tx_pool: Promise<providers.TransactionResponse>[] = []

    for (const [eid, _eidData] of Object.entries(eidMetaData)) {
        // Create a new provider using the URL from rpcUrlsMap
        const newProvider = new providers.JsonRpcProvider(rpcUrlsMap[eid])

        // Create a new signer with the same account on the new provider
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY, newProvider)
        // Fetch the nonce for the account
        const nonce = await signer.getTransactionCount()
        const gasPrice = await signer.getGasPrice()

        accountEidMap[eid] = {
            nonce: nonce,
            gasPrice: gasPrice,
            signer: signer,
        }
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
    console.log('Submitting transactions...')
    for (const [_txType, EidTxsMapping] of Object.entries(TxTypeEidMapping)) {
        for (const [eid, TxPool] of Object.entries(EidTxsMapping)) {
            const provider: providers.JsonRpcProvider = new providers.JsonRpcProvider(rpcUrlsMap[eid])
            const signer = accountEidMap[eid].signer

            for (const tx of TxPool) {
                const chainTx = tx

                chainTx.gasLimit = await provider.estimateGas(tx)
                chainTx.gasPrice = accountEidMap[eid].gasPrice
                chainTx.nonce = accountEidMap[eid].nonce++

                tx_pool.push(signer.sendTransaction(chainTx))
            }
        }
    }
    const txReceipts = await Promise.all(tx_pool)

    // @todo Improve the logging to also show the txType
    console.log('Transactions submitted')
    console.log('ChainId\t | TxHash')
    for (let i = 0; i < txReceipts.length; i++) {
        const txReceipt = txReceipts[i]
        console.log(`${txReceipt.chainId}\t | ${txReceipt.hash}`)
    }
}

export function getContractForTxType(oappContract: Contract, epv2Contract: Contract, txType: string) {
    const oappTxTypes = ['setPeer', 'setDelegate', 'setEnforcedOptions']

    if (oappTxTypes.includes(txType)) {
        return oappContract
    }

    return epv2Contract
}
