import '@/type-extensions'

import { ActionType } from 'hardhat/types'
import { task, types } from 'hardhat/config'
import { TASK_LZ_VALIDATE_RPCS } from '@/constants'
import { createLogger, printBoolean } from '@layerzerolabs/io-devtools'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import WebSocket from 'ws'

interface TaskArguments {
    timeout: number
}

const RPC_URL_KEY = 'url'
const TIMEOUT = 1000 // 1 second

const logger = createLogger()

// TODO refactor/cleanup
const validateHttpsRpcUrl = async (rpcUrl: string, timeout: number): Promise<boolean> => {
    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_blockNumber',
                params: [],
                id: 1,
            }),
            signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (response.ok) {
            const data = await response.json()
            if (data.result) {
                return true
            } else {
                logger.error(`${printBoolean(false)} RPC url responded with invalid data: ${JSON.stringify(data)}`)
                return false
            }
        } else {
            logger.error(`${printBoolean(false)} RPC url responded with status: ${response.status}`)
            return false
        }
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Validation failed: ${error.message}`)
        } else {
            // Handle other types of errors (if any)
            logger.error('An unknown error occurred')
        }
        // TODO log url being validated
        return false
    }
}

const validateWebSocketRpcUrl = (rpcUrl: string, timeout: number): Promise<boolean> => {
    return new Promise((resolve) => {
        const ws = new WebSocket(rpcUrl)

        const timeoutId = setTimeout(() => {
            ws.close()
            logger.error(`${printBoolean(false)} WebSocket connection timed out`)
            resolve(false)
        }, timeout)

        ws.onopen = () => {
            clearTimeout(timeoutId)
            ws.close()
            resolve(true)
        }

        ws.onerror = (error) => {
            clearTimeout(timeoutId)

            if (error instanceof Error) {
                logger.error(`${printBoolean(false)} WebSocket RPC url validation failed: ${error.message}`)
            } else {
                logger.error(`${printBoolean(false)} WebSocket RPC url validation failed: An unknown error occurred`)
            }
            resolve(false)
        }
    })
}

const validateRpcUrl = async (rpcUrl: string | undefined, timeout: number): Promise<boolean> => {
    if (!rpcUrl) {
        logger.error(`${printBoolean(false)} Missing rpc url`)
        return false
    }

    if (rpcUrl.startsWith('http://') || rpcUrl.startsWith('https://')) {
        return await validateHttpsRpcUrl(rpcUrl, timeout)
    } else if (rpcUrl.startsWith('wss://')) {
        return await validateWebSocketRpcUrl(rpcUrl, timeout)
    }

    return false
}

// TODO consider validating all rpc urls so if multiple are incorrect they can all be fixed before the next run?
const action: ActionType<TaskArguments> = async (taskArgs, hre) => {
    printLogo()

    const networkNames = Object.keys(hre.userConfig.networks || {})

    logger.info(`...Validating rpc urls with ${taskArgs.timeout}ms timeout for ${networkNames.join(', ')}...`)

    if (networkNames.length === 0) {
        logger.info(`No networks found in hardhat.config.ts`)
        return
    }

    for (const networkName of networkNames) {
        const networkConfig = hre.userConfig.networks?.[networkName]

        if (networkConfig && RPC_URL_KEY in networkConfig) {
            const isValid = await validateRpcUrl(networkConfig.url, taskArgs.timeout)

            if (!isValid) {
                throw new Error(`${printBoolean(false)} RPC url validation failed for network: ${networkName}`)
            }
        }
    }

    logger.info(`${printBoolean(true)} All rpc urls are valid!`)
}
task(
    TASK_LZ_VALIDATE_RPCS,
    'Validate rpc urls in hardhat.config.ts. RPCs are only considered valid if they respond within the specified timeout.',
    action
).addParam(
    'timeout',
    `Maximum amount of time (in milliseconds) that the rpc urls have to respond. If unspecified, default timeout of ${TIMEOUT}ms will be used.`,
    TIMEOUT,
    types.int,
    true
)

// TODO potentially implement a feature flag that runs this task/validation inside hardhat config?
