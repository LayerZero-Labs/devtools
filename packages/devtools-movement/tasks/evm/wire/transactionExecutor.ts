import { exit } from 'process'

import { Contract, ethers, providers } from 'ethers'

import { promptForConfirmation } from '../../shared/utils'

import type { AccountData, ContractMetadataMapping, TxEidMapping, eid } from '../utils/types'

/**
 * @notice Simulates transactions on the blockchains
 * - Fetches the nonce and balance for each chain
 * - Estimates gas for each transaction and updates the balance
 * - Checks if the user's balance is sufficient to submit all the transactions
 * - Simulates transactions on-chain and catches any errors before submitting the transaction
 */
export async function executeTransactions(
    eidMetaData: ContractMetadataMapping,
    TxTypeEidMapping: TxEidMapping,
    rpcUrlsMap: Record<eid, string>,
    simulation = 'dry-run',
    privateKey: string
) {
    const num_chains = Object.entries(eidMetaData).length
    let totalTransactions = 0

    Object.entries(TxTypeEidMapping).forEach(([_key, eidMapping]) => {
        Object.entries(eidMapping).forEach(([_eid, txArray]) => {
            totalTransactions += txArray.length
        })
    })

    if (simulation == 'dry-run') {
        console.log('IN SIMULATION (dry-run) MODE')
    } else {
        console.log('IN EXECUTION (broadcast) MODE')
    }

    if (totalTransactions == 0) {
        console.log('No transactions to submit')
        return
    }

    console.log(`Total chains: ${num_chains}`)
    console.log(`Total transactions: ${totalTransactions}`)
    const flag = await promptForConfirmation(totalTransactions)

    if (!flag) {
        console.log('Not submitting transactions.. exiting')
        exit(0)
    }

    // Populate simulation account data - does not need to have an address for each eid because the same deployer accunt is used for all chains
    const accountEidMap: AccountData = {}
    const tx_pool: Promise<providers.TransactionResponse>[] = []

    for (const [eid, _eidData] of Object.entries(eidMetaData)) {
        /*
         * Create a new provider using the URL from rpcUrlsMap
         * This is required because:
         *  - forkUrl != rpcUrl => fork mode
         *  - forkUrl = rpcUrl => mainnet mode
         *
         * The mapping helps keep track of the different chains and their respective providers
         * We also create a signer object using the private key and provider
         */
        const newProvider = new providers.JsonRpcProvider(rpcUrlsMap[eid])
        const signer = new ethers.Wallet(privateKey, newProvider)

        accountEidMap[eid] = {
            nonce: await signer.getTransactionCount(),
            gasPrice: await signer.getGasPrice(),
            signer: signer,
        }

        console.log(
            `Balance for chain ${eid}: ${ethers.utils.formatEther(await newProvider.getBalance(signer.address))}`
        )
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
                tx.gasLimit = await provider.estimateGas(tx)
                tx.gasPrice = accountEidMap[eid].gasPrice
                tx.nonce = accountEidMap[eid].nonce++

                tx_pool.push(signer.sendTransaction(tx))
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
