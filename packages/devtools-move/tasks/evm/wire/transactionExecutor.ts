import { exit } from 'process'

import { Contract, ethers, providers } from 'ethers'

import { promptForConfirmation } from '../../shared/utils'

import type { AccountData, OmniContractMetadataMapping, TxEidMapping, eid } from '../utils/types'
import { getNetworkForChainId } from '@layerzerolabs/lz-definitions'

/**
 * @notice Simulates transactions on the blockchains
 * - Fetches the nonce and balance for each chain
 * - Estimates gas for each transaction and updates the balance
 * - Checks if the user's balance is sufficient to submit all the transactions
 * - Simulates transactions on-chain and catches any errors before submitting the transaction
 */
export async function executeTransactions(
    eidMetaData: OmniContractMetadataMapping,
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

    if (totalTransactions == 0) {
        console.log('✨ No transactions to submit')
        return
    }

    console.log(`\n📦 Transaction Summary:`)
    console.log(`   • Total chains: ${num_chains}`)
    console.log(`   • Total transactions: ${totalTransactions}`)
    console.log(`   • Mode: ${simulation === 'dry-run' ? 'SIMULATION (dry-run)' : 'EXECUTION (broadcast)'}`)

    const flag = await promptForConfirmation(totalTransactions)
    if (!flag) {
        console.log('Operation cancelled.')
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

        const network = getNetworkForChainId(Number(eid))
        console.log(
            `   • Balance on ${network.chainName}-${network.env} for ${signer.address}: ${ethers.utils.formatEther(
                await newProvider.getBalance(signer.address)
            )} ETH`
        )
    }

    console.log('\n🔄 Processing transactions...')
    let processedTx = 0
    for (const [txType, EidTxsMapping] of Object.entries(TxTypeEidMapping)) {
        for (const [eid, TxPool] of Object.entries(EidTxsMapping)) {
            for (const tx of TxPool) {
                processedTx++
                const progress = `[${processedTx}/${totalTransactions}]`
                const network = getNetworkForChainId(Number(eid))
                console.log(
                    `   ${progress} Submitting transaction on chain ${network.chainName}-${network.env} (${txType})...`
                )

                const provider: providers.JsonRpcProvider = new providers.JsonRpcProvider(rpcUrlsMap[eid])
                const signer = accountEidMap[eid].signer

                console.log(signer.address)
                tx.gasLimit = await provider.estimateGas(tx)
                tx.gasPrice = accountEidMap[eid].gasPrice
                tx.nonce = accountEidMap[eid].nonce++

                tx_pool.push(signer.sendTransaction(tx))
            }
        }
    }

    const txReceipts = await Promise.all(tx_pool)

    console.log('\n🎉 Transaction Summary:')
    console.log('   ChainId | TxHash')
    console.log('   ---------|----------')
    for (const txReceipt of txReceipts) {
        console.log(`   ${txReceipt.chainId.toString().padEnd(8)} | ${txReceipt.hash}`)
    }
    console.log(
        `\n✅ Successfully ${simulation === 'dry-run' ? 'simulated' : 'executed'} ${txReceipts.length} transactions`
    )
}

export function getContractForTxType(oappContract: Contract, epv2Contract: Contract, txType: string) {
    const oappTxTypes = ['setPeer', 'setDelegate', 'setEnforcedOptions']

    if (oappTxTypes.includes(txType)) {
        return oappContract
    }

    return epv2Contract
}
