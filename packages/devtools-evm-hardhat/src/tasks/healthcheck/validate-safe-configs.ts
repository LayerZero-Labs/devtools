import '@/type-extensions'
import assert from 'assert'

import { TASK_LZ_VALIDATE_SAFE_CONFIGS } from '@/constants'
import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import { printLogo } from '@layerzerolabs/io-devtools/swag'
import { createLogger, printBoolean } from '@layerzerolabs/io-devtools'

const SAFE_CONFIG_KEY = 'safeConfig'

// @dev safeURLs are only considered valid if they are listed here: https://docs.safe.global/core-api/transaction-service-supported-networks
const validateSafeConfig = async (config: any): Promise<boolean> => {
    assert(config.safeAddress != null, 'Missing safeAddress')
    assert(config.safeUrl != null, 'Missing safeUrl')

    // Construct the API URL to query the Safe's balance
    // TODO which api endpoint to use?
    // const apiUrl = `${config.safeUrl}/api/v1/safes/${config.safeAddress}/balances/`
    const apiUrl = `${config.safeUrl}/api/v1/safes/${config.safeAddress}/`

    try {
        // Make the API request to check the Safe's balance
        const response = await fetch(apiUrl)

        // Check if the response is successful
        if (!response.ok) {
            return false
            // throw new Error(`Failed to fetch Safe balance: ${response.statusText}`)
        }

        return true
    } catch (error) {
        if (error instanceof Error) {
            console.error('Validation failed:', error.message)
        } else {
            // Handle other types of errors (if any)
            console.error('An unknown error occurred')
        }

        return false
    }
}

const action: ActionType<unknown> = async (_, hre) => {
    printLogo()

    const logger = createLogger()

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
