import { exit } from 'process'

import { BigNumber, Contract, ethers, providers } from 'ethers'

import { promptForConfirmation } from '../../shared/utils'

import type {
    AccountData,
    OmniContractMetadataMapping,
    TxPool,
    TxReceiptJson,
    TxEidMapping,
    eid,
    ExecutionMode,
} from '../utils/types'

import { getNetworkForChainId } from '@layerzerolabs/lz-definitions'
import path from 'path'
import fs from 'fs'

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
    executionMode: ExecutionMode = 'dry-run',
    privateKey: string,
    args: any
) {
    const rootDir = args.rootDir
    const oappConfig = args.oapp_config

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
    console.log(`   • Total EVM chains: ${num_chains}`)
    console.log(`   • Total transactions: ${totalTransactions}`)
    console.log(`   • Mode: ${executionMode}`)

    const flag = await promptForConfirmation(totalTransactions)
    if (!flag) {
        console.log('Operation cancelled.')
        exit(0)
    }

    // Populate executionMode account data - does not need to have an address for each eid because the same deployer accunt is used for all chains
    const accountEidMap: AccountData = {}

    const tx_pool: Record<string, Record<string, TxPool>> = {}
    const tx_pool_receipt: Promise<providers.TransactionResponse>[] = []

    if (executionMode !== 'calldata') {
        for (const [eid, _eidData] of Object.entries(eidMetaData)) {
            /*
             * Create a new provider using the URL from rpcUrlsMap
             * This is required because:
             *  - forkUrl != rpcUrl => fork mode
             *  - forkUrl = rpcUrl => mainnet mode
             *
             * The mapping helps keep track of the different chains and their respective providers
             * We also create a signer object using the private key and provider
             *
             * ------------------------------------------------------------------------------------------------
             * Same workaround as in wire-evm.ts
             * https://github.com/ethers-io/ethers.js/issues/3536
             * ------------------------------------------------------------------------------------------------
             */
            const newProvider = new providers.JsonRpcProvider({
                url: rpcUrlsMap[eid],
                skipFetchSetup: true,
            })
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
    }

    console.log('\n🔄 Processing transactions...')
    let processedTx = 0
    for (const [txType, EidTxsMapping] of Object.entries(TxTypeEidMapping)) {
        if (tx_pool[txType] === undefined) {
            tx_pool[txType] = {}
        }
        for (const [fromEid, TxPool] of Object.entries(EidTxsMapping)) {
            for (const { toEid, populatedTx } of TxPool) {
                processedTx++
                const progress = `[${processedTx}/${totalTransactions}]`
                const network = getNetworkForChainId(Number(fromEid))
                let sendTx: Promise<providers.TransactionResponse> | undefined = undefined

                if (executionMode !== 'calldata') {
                    console.log(
                        `   ${progress} Submitting transaction on chain ${network.chainName}-${network.env} (${txType})...`
                    )
                    /*
                     * ------------------------------------------------------------------------------------------------
                     * Same workaround as in wire-evm.ts
                     * https://github.com/ethers-io/ethers.js/issues/3536
                     * ------------------------------------------------------------------------------------------------
                     */
                    const provider: providers.JsonRpcProvider = new providers.JsonRpcProvider({
                        url: rpcUrlsMap[fromEid],
                        skipFetchSetup: true,
                    })
                    const signer = accountEidMap[fromEid].signer

                    // Try to estimate gas limit, if it fails, use a default value
                    const gasLimit = await provider.estimateGas(populatedTx).catch((error) => {
                        console.error(
                            `Error estimating gas for transaction on chain ${network.chainName}-${network.env}: ${error}`
                        )
                        return BigNumber.from(1_000_000)
                    })

                    populatedTx.gasLimit = gasLimit
                    populatedTx.gasPrice = accountEidMap[fromEid].gasPrice
                    populatedTx.nonce = accountEidMap[fromEid].nonce++

                    sendTx = signer.sendTransaction(populatedTx)
                    tx_pool_receipt.push(sendTx)
                }

                if (tx_pool[txType][fromEid.toString()] === undefined) {
                    tx_pool[txType][fromEid.toString()] = {
                        from_eid: fromEid,
                        to_eid: toEid,
                        raw: populatedTx,
                        response: sendTx,
                    }
                }
            }
        }
    }

    const folderPath = path.join(rootDir, 'transactions', oappConfig, executionMode)
    fs.mkdirSync(folderPath, { recursive: true })

    const runId = fs.readdirSync(folderPath).length + 1

    const filePathRunId = path.join(folderPath, `${runId}.json`)
    const filePathLatest = path.join(folderPath, `latest.json`)
    const txReceiptJson: TxReceiptJson = {}

    for (const [txType, eidTxsMapping] of Object.entries(tx_pool)) {
        if (txReceiptJson[txType] === undefined) {
            txReceiptJson[txType] = []
        }
        for (const [fromEid, txPool] of Object.entries(eidTxsMapping)) {
            let txHash = undefined
            if (txPool.response) {
                txHash = (await txPool.response)?.hash
            }
            txReceiptJson[txType].push({
                src_eid: fromEid,
                dst_eid: txPool.to_eid,
                src_from: txPool.raw?.from ?? '',
                src_to: txPool.raw?.to ?? '',
                tx_hash: txHash,
                data: txPool.raw?.data ?? '',
            })
        }
    }
    fs.writeFileSync(filePathRunId, JSON.stringify(txReceiptJson, null, 2))

    // To make it easier to find the latest transactions
    // we create a new object called {srcRunId} and set it to the txReceiptJson for the latest run
    const latestJson = { srcRunId: runId, txReceiptJson: txReceiptJson }
    fs.writeFileSync(filePathLatest, JSON.stringify(latestJson, null, 2))

    if (executionMode != 'calldata') {
        console.log(
            `\n✅ Successfully ${executionMode === 'broadcast' ? 'executed' : 'simulated'} ${totalTransactions} transactions`
        )
    }
    console.log('Transactions have been saved to ', filePathRunId)
    console.log('Latest transactions have been saved to ', filePathLatest)
}

export function getContractForTxType(oappContract: Contract, epv2Contract: Contract, txType: string) {
    const oappTxTypes = ['setPeer', 'setDelegate', 'setEnforcedOptions']

    if (oappTxTypes.includes(txType)) {
        return oappContract
    }

    return epv2Contract
}
