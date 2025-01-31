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
    console.log(`   • Total chains: ${num_chains}`)
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
    }

    console.log('\n🔄 Processing transactions...')
    let processedTx = 0
    for (const [txType, EidTxsMapping] of Object.entries(TxTypeEidMapping)) {
        if (tx_pool[txType] === undefined) {
            tx_pool[txType] = {}
        }
        for (const [eid, TxPool] of Object.entries(EidTxsMapping)) {
            for (const { toEid, populatedTx } of TxPool) {
                processedTx++
                const progress = `[${processedTx}/${totalTransactions}]`
                const network = getNetworkForChainId(Number(eid))
                let sendTx: Promise<providers.TransactionResponse> | undefined = undefined

                if (executionMode !== 'calldata') {
                    console.log(
                        `   ${progress} Submitting transaction on chain ${network.chainName}-${network.env} (${txType})...`
                    )
                    const provider: providers.JsonRpcProvider = new providers.JsonRpcProvider(rpcUrlsMap[eid])
                    const signer = accountEidMap[eid].signer

                    // Try to estimate gas limit, if it fails, use a default value
                    const gasLimit = await provider.estimateGas(populatedTx).catch((error) => {
                        console.error(
                            `Error estimating gas for transaction on chain ${network.chainName}-${network.env}: ${error}`
                        )
                        return BigNumber.from(1_000_000)
                    })

                    populatedTx.gasLimit = gasLimit
                    populatedTx.gasPrice = accountEidMap[eid].gasPrice
                    populatedTx.nonce = accountEidMap[eid].nonce++

                    sendTx = signer.sendTransaction(populatedTx)
                    tx_pool_receipt.push(sendTx)
                }

                if (tx_pool[txType][toEid.toString()] === undefined) {
                    tx_pool[txType][toEid.toString()] = {
                        from_eid: eid,
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

    const filePath = path.join(folderPath, `${runId}.json`)
    const txReceiptJson: TxReceiptJson = {}

    for (const [txType, eidTxsMapping] of Object.entries(tx_pool)) {
        if (txReceiptJson[txType] === undefined) {
            txReceiptJson[txType] = []
        }
        for (const [to_eid, txPool] of Object.entries(eidTxsMapping)) {
            let txHash = undefined
            if (txPool.response) {
                txHash = (await txPool.response)?.hash
            }
            txReceiptJson[txType].push({
                src_eid: txPool.from_eid,
                dst_eid: to_eid,
                src_from: txPool.raw?.from ?? '',
                src_to: txPool.raw?.to ?? '',
                tx_hash: txHash,
                data: txPool.raw?.data ?? '',
            })
        }
    }
    fs.writeFileSync(filePath, JSON.stringify(txReceiptJson, null, 2))

    if (executionMode != 'calldata') {
        console.log(
            `\n✅ Successfully ${executionMode === 'broadcast' ? 'executed' : 'simulated'} ${totalTransactions} transactions`
        )
    }
    console.log('Transactions have been saved to ', filePath)
}

export function getContractForTxType(oappContract: Contract, epv2Contract: Contract, txType: string) {
    const oappTxTypes = ['setPeer', 'setDelegate', 'setEnforcedOptions']

    if (oappTxTypes.includes(txType)) {
        return oappContract
    }

    return epv2Contract
}
