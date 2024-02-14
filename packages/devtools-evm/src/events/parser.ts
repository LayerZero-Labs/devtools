import type { Contract, LogDescription, TransactionReceipt } from 'ethers'

/**
 * Parse event logs.
 * @param {TransactionReceipt} receipt
 * @param {Contract} contract
 * @returns {LogDescription[]}
 */
export const parseLogs = (receipt: TransactionReceipt, contract: Contract): LogDescription[] =>
    receipt.logs?.flatMap((log) => {
        try {
            const parsed = contract.interface.parseLog(log)

            return parsed == null ? [] : [parsed]
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
    parseLogs(receipt, contract).filter((log) => log.name === name)
