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

const validateHttpsRpcUrl = async (rpcUrl: string, timeout: number): Promise<boolean> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
            signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
            logger.error(`RPC URL ${rpcUrl} responded with status: ${response.status}`)
            return false
        }

        const data = await response.json()
        if (data.result) {
            return true
        }

        logger.error(`RPC URL ${rpcUrl} responded with invalid data: ${JSON.stringify(data)}`)
        return false
    } catch (error) {
        logger.error(
            `Validation failed for RPC URL ${rpcUrl}: ${error instanceof Error ? error.message : 'An unknown error occurred'}`
        )
        return false
    }
}

const validateWebSocketRpcUrl = async (rpcUrl: string, timeout: number): Promise<boolean> => {
    return new Promise((resolve) => {
        const ws = new WebSocket(rpcUrl)
        const timeoutId = setTimeout(() => {
            ws.close()
            logger.error(`WebSocket connection timed out for RPC URL ${rpcUrl}`)
            resolve(false)
        }, timeout)

        ws.onopen = () => {
            clearTimeout(timeoutId)
            ws.close()
            resolve(true)
        }

        ws.onerror = (error) => {
            clearTimeout(timeoutId)
            logger.error(
                `Validation failed for RPC URL ${rpcUrl}: ${error instanceof Error ? error.message : 'An unknown error occurred'}`
            )
            resolve(false)
        }
    })
}

const validateRpcUrl = async (rpcUrl: string | undefined, timeout: number, networkName: string): Promise<boolean> => {
    if (!rpcUrl) {
        logger.error(`${printBoolean(false)} Missing RPC URL for network: ${networkName}`)
        return false
    }

    logger.info(`...Validating RPC URL ${rpcUrl} for ${networkName}...`)

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

    const networks = hre.userConfig.networks || {}
    const networkNames = Object.keys(networks)

    logger.info(
        `========== Validating RPC URLs with ${taskArgs.timeout}ms timeout for networks: ${networkNames.join(', ')}`
    )

    if (!networkNames.length) {
        logger.info(`No networks found in hardhat.config.ts`)
        return
    }

    for (const networkName of networkNames) {
        const rpcUrl = networks[networkName]?.[RPC_URL_KEY]

        if (rpcUrl && !(await validateRpcUrl(rpcUrl, taskArgs.timeout, networkName))) {
            throw new Error(`RPC URL validation failed for network: ${networkName}`)
        }
    }

    logger.info(`All RPC URLs are valid!`)
}
task(
    TASK_LZ_VALIDATE_RPCS,
    'Validate RPC URLs in hardhat.config.ts. RPCs are only considered valid if they respond within the specified timeout.',
    action
).addParam(
    'timeout',
    `Maximum amount of time (in milliseconds) that the RPC URLs have to respond. If unspecified, default timeout will be used.`,
    TIMEOUT,
    types.int,
    true
)

// TODO potentially implement a feature flag that runs this task/validation inside hardhat config?
