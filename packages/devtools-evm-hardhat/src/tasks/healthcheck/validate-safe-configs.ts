import '@/type-extensions'

import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import { TASK_LZ_VALIDATE_SAFE_CONFIGS } from '@/constants'
import { createLogger, printBoolean } from '@layerzerolabs/io-devtools'
import { printLogo } from '@layerzerolabs/io-devtools/swag'

const SAFE_CONFIG_KEY = 'safeConfig'

const logger = createLogger()

// @dev safeURLs are only considered valid if they are listed here: https://docs.safe.global/core-api/transaction-service-supported-networks
const validateSafeConfig = async (config: any): Promise<boolean> => {
    if (!config.safeAddress) {
        logger.error(`${printBoolean(false)} Missing safeAddress`)
        return false
    }

    if (!config.safeUrl) {
        logger.error(`${printBoolean(false)} Missing safeUrl`)
        return false
    }

    const headers: HeadersInit = {}
    if (config.safeApiKey) {
        headers.Authorization = `Bearer ${config.safeApiKey}`
    }

    try {
        // Make the API request to read safe
        const response = await fetch(`${config.safeUrl}/v1/safes/${config.safeAddress}/`, {
            method: 'GET',
            headers,
        })

        // Check if the response is successful
        if (!response.ok) {
            return false
        }

        return true
    } catch (error) {
        if (error instanceof Error) {
            logger.error(`Validation failed: ${error.message}`)
        } else {
            // Handle other types of errors (if any)
            logger.error('An unknown error occurred')
        }

        return false
    }
}

const action: ActionType<unknown> = async (_, hre) => {
    printLogo()

    const networkNames = Object.keys(hre.userConfig.networks || {})

    logger.info(`...Validating safe configs for ${networkNames.join(', ')}...`)

    for (const networkName of networkNames) {
        const networkConfig = hre.userConfig.networks?.[networkName]

        if (networkConfig && SAFE_CONFIG_KEY in networkConfig) {
            const isValid = await validateSafeConfig(networkConfig.safeConfig)

            if (!isValid) {
                throw new Error(`${printBoolean(false)} Safe config validation failed for network: ${networkName}`)
            }
        }
    }

    logger.info(`${printBoolean(true)} All safe configs are valid!`)
}
task(TASK_LZ_VALIDATE_SAFE_CONFIGS, 'Validate safe configs in hardhat.config.ts', action)
