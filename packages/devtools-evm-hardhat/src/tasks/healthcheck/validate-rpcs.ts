import '@/type-extensions'

import { ActionType } from 'hardhat/types'
import { task, types } from 'hardhat/config'
import { TASK_LZ_VALIDATE_RPCS } from '@/constants'
import { createLogger, printBoolean } from '@layerzerolabs/io-devtools'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import { getEidsByNetworkName } from '@/runtime'
import WebSocket from 'ws'

interface TaskArguments {
    timeout: number
}

const RPC_URL_KEY = 'url'
const JSON_RPC = '2.0'

const HTTP_URL = 'http://'
const HTTPS_URL = 'https://'

const WS_URL = 'ws://'
const WSS_URL = 'wss://'

const TIMEOUT = 1000 // 1 second

const logger = createLogger()

const validateHttpsRpcUrl = async (rpcUrl: string, timeout: number, networkName: string): Promise<boolean> => {
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
            logger.error(`RPC URL ${rpcUrl} for network ${networkName} responded with status: ${response.status}`)
            return false
        }

        const data = await response.json()
        if (data.result) {
            return true
        }

        logger.error(
            `RPC URL ${rpcUrl} for network ${networkName} responded with invalid data: ${JSON.stringify(data)}`
        )
        return false
    } catch (error) {
        logger.error(
            `Validation failed for RPC URL ${rpcUrl} for network ${networkName}: ${error instanceof Error ? error.message : 'An unknown error occurred'}`
        )
        return false
    }
}

const validateWebSocketRpcUrl = async (rpcUrl: string, timeout: number, networkName: string): Promise<boolean> => {
    return new Promise((resolve) => {
        const ws = new WebSocket(rpcUrl)
        const timeoutId = setTimeout(() => {
            ws.close()
            logger.error(`WebSocket connection timed out for RPC URL ${rpcUrl} for network ${networkName}`)
            resolve(false)
        }, timeout)

        const cleanup = (success: boolean, message?: string) => {
            clearTimeout(timeoutId)
            if (message) {
                logger.error(message)
            }
            ws.close()
            resolve(success)
        }

        ws.onopen = () => {
            const rpcRequest = JSON.stringify({
                jsonrpc: JSON_RPC,
                method: 'eth_blockNumber',
                params: [],
                id: 1,
            })
            ws.send(rpcRequest)
        }

        ws.onmessage = (event) => {
            try {
                const response = JSON.parse(event.data.toString())
                if (response.jsonrpc === JSON_RPC && !!response.result) {
                    cleanup(true)
                } else {
                    cleanup(false, `Invalid RPC URL ${rpcUrl} for network ${networkName} response: ${event.data}`)
                }
            } catch (error) {
                cleanup(false, `Error parsing RPC response for ${rpcUrl} for network ${networkName}: ${error}`)
            }
        }

        ws.onerror = (error) => {
            cleanup(
                false,
                `Validation failed for ${rpcUrl} for network ${networkName}: ${error instanceof Error ? error.message : 'An unknown error occurred'}`
            )
        }

        ws.onclose = () => {
            cleanup(
                false,
                `Validation failed for ${rpcUrl} for network ${networkName}: WebSocket connection closed unexpectedly`
            )
        }
    })
}

const validateRpcUrl = async (rpcUrl: string | undefined, timeout: number, networkName: string): Promise<boolean> => {
    if (!rpcUrl || rpcUrl.trim() === '') {
        logger.error(`Missing RPC URL for network: ${networkName}`)
        return false
    }

    if (rpcUrl.startsWith(HTTP_URL) || rpcUrl.startsWith(HTTPS_URL)) {
        return await validateHttpsRpcUrl(rpcUrl, timeout, networkName)
    } else if (rpcUrl.startsWith(WS_URL) || rpcUrl.startsWith(WSS_URL)) {
        return await validateWebSocketRpcUrl(rpcUrl, timeout, networkName)
    }

    logger.error(`Unsupported RPC protocol in network: ${networkName}`)

    return false
}

const action: ActionType<TaskArguments> = async (taskArgs, hre) => {
    printLogo()

    const networks = hre.userConfig.networks || {}
    const eidByNetworkName = getEidsByNetworkName(hre)
    const networkNames = Object.keys(networks).filter((networkName) => !!eidByNetworkName[networkName])

    logger.info(
        `========== Validating RPC URLs with ${taskArgs.timeout}ms timeout for networks: ${networkNames.join(', ')}`
    )

    const networksWithInvalidRPCs: string[] = []

    const validationPromises = networkNames.map(async (networkName) => {
        const rpcUrl = networks[networkName]?.[RPC_URL_KEY]

        if (rpcUrl && !(await validateRpcUrl(rpcUrl, taskArgs.timeout, networkName))) {
            networksWithInvalidRPCs.push(networkName)
        }
    })

    await Promise.all(validationPromises)

    if (networksWithInvalidRPCs.length !== 0) {
        logger.error(
            `${printBoolean(false)} ========== RPC URL validation failed for network(s): ${networksWithInvalidRPCs.join(', ')}`
        )
    } else {
        logger.info(`${printBoolean(true)} ========== All RPC URLs are valid!`)
    }
}
task(
    TASK_LZ_VALIDATE_RPCS,
    'Validate RPC URLs in hardhat.config.ts. RPCs are only considered valid if they use the https or wss protocol and respond within the specified timeout.',
    action
).addParam(
    'timeout',
    `Maximum amount of time (in milliseconds) that the RPC URLs have to respond. If unspecified, default timeout of ${TIMEOUT}ms will be used.`,
    TIMEOUT,
    types.int,
    true
)
