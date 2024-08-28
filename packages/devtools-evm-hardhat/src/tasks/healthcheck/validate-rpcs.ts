import '@/type-extensions'

import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import { TASK_LZ_VALIDATE_RPCS } from '@/constants'
import { createLogger, printBoolean } from '@layerzerolabs/io-devtools'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import WebSocket from 'ws'

const RPC_URL_KEY = 'url'
const TIMEOUT = 5000 // 5 seconds TODO adjust timeout as needed

const logger = createLogger()

/**
 * TODO -- what determines if an rpc is valid? fetching from the rpc url is not always accurate because some rpcs do not support the fetch method
 */

// // @dev RPC urls are only considered valid if they are responsive within a specifiec timeout
// const validateRpcUrl = async (rpcUrl: string | undefined, networkName: string): Promise<boolean> => {
//     if (!rpcUrl) {
//         logger.error(`${printBoolean(false)} Missing rpc url`)
//         return false
//     }

//     try {
//         const controller = new AbortController()
//         const timeoutId = setTimeout(() => controller.abort(), TIMEOUT)

//         const response = await fetch(rpcUrl, { signal: controller.signal })
//         clearTimeout(timeoutId)

//         if (response.ok) {
//             return true
//         } else {
//             logger.error(`${printBoolean(false)} RPC url for ${networkName} responded with status: ${response.status}`)
//             return false
//         }
//     } catch (error) {
//         if (error instanceof Error) {
//             logger.error(`Validation failed: ${error.message}`)
//         } else {
//             // Handle other types of errors (if any)
//             logger.error('An unknown error occurred')
//         }

//         return false
//     }
// }

const validateRpcUrl = async (rpcUrl: string | undefined): Promise<boolean> => {
    if (!rpcUrl) {
        logger.error(`${printBoolean(false)} Missing rpc url`)
        return false
    }

    if (rpcUrl.startsWith('http://') || rpcUrl.startsWith('https://')) {
        // TODO make this a helper function called validateHttpsRpcUrl
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUT)

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

            return false
        }
    } else if (rpcUrl.startsWith('wss://')) {
        // TODO make this a helper function called validateWebsockerRpcUrl
        return new Promise((resolve) => {
            const ws = new WebSocket(rpcUrl)

            const timeoutId = setTimeout(() => {
                ws.close()
                logger.error(`${printBoolean(false)} WebSocket connection timed out`)
                resolve(false)
            }, TIMEOUT)

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
                    logger.error(
                        `${printBoolean(false)} WebSocket RPC url validation failed: An unknown error occurred`
                    )
                }
                resolve(false)
            }
        })
    }

    return false
}

const action: ActionType<unknown> = async (_, hre) => {
    printLogo()

    const networkNames = Object.keys(hre.userConfig.networks || {})

    logger.info(`...Validating rpc urls for ${networkNames.join(', ')}...`)

    for (const networkName of networkNames) {
        const networkConfig = hre.userConfig.networks?.[networkName]

        if (networkConfig && RPC_URL_KEY in networkConfig) {
            const isValid = await validateRpcUrl(networkConfig.url, networkName)

            if (!isValid) {
                throw new Error(`${printBoolean(false)} RPC url validation failed for network: ${networkName}`)
            }
        }
    }

    logger.info(`${printBoolean(true)} All rpc urls are valid!`)
}
task(TASK_LZ_VALIDATE_RPCS, 'Validate rpc urls in hardhat.config.ts', action)
