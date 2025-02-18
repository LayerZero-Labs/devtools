import type { LogDescription } from '@ethersproject/abi'
import { Contract } from '@ethersproject/contracts'
import { TransactionReceipt } from '@ethersproject/providers'

/**
 * Parse event logs.
 * @param {TransactionReceipt} receipt
 * @param {Contract} contract
 * @returns {LogDescription[]}
 */
export const parseLogs = (receipt: TransactionReceipt, contract: Contract): LogDescription[] =>
    receipt.logs?.flatMap((log) => {
        // ensure the log address matches the contract address
        if (log.address !== contract.address) {
            return []
        }
        try {
            return [contract.interface.parseLog(log)]
        } catch {
            return []
        }
    }) ?? []

/**
 * Parse event logs with a specific name.
 * @param {TransactionReceipt} receipt
 * @param {Contract} contract
 * @param {string} name
 * @returns {LogDescription[]}
 */
export const parseLogsWithName = (receipt: TransactionReceipt, contract: Contract, name: string): LogDescription[] =>
    parseLogs(receipt, contract).filter((log) => log.eventFragment.name === name)
