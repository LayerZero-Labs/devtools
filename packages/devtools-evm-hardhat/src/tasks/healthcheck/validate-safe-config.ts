import '@/type-extensions'
import assert from 'assert'

import { TASK_LZ_VALIDATE_SAFE_CONFIGS } from '@/constants'
import { ActionType /* HardhatUserConfig*/ } from 'hardhat/types'
import { task } from 'hardhat/config'
// import { printLogo } from '@layerzerolabs/io-devtools/swag'
// import { createLogger } from '@layerzerolabs/io-devtools'

// TODO this will only work if the safe url is always one of the supported networks here https://docs.safe.global/core-api/transaction-service-supported-networks
// which seems to be the case for ZROClaim at least
const validateSafeConfig = async (config: any): Promise<boolean> => {
    assert(config.safeAddress != null, 'Missing safeAddress')
    assert(config.safeUrl != null, 'Missing safeUrl')

    // Construct the API URL to query the Safe's balance
    const apiUrl = `${config.safeUrl}/api/v1/safes/${config.safeAddress}/balances/`
    // const apiUrl = `${config.safeUrl}/api/v1/safes/${config.safeAddress}/`; // TODO or should we use this general info api endpoint

    try {
        // Make the API request to check the Safe's balance
        const response = await fetch(apiUrl)

        // Check if the response is successful
        if (!response.ok) {
            throw new Error(`Failed to fetch Safe balance: ${response.statusText}`)
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
    // TODO should we be validating all safe configs in the hardhat.config.ts file or only for the network specified when this task is run?
    // perhaps we can do both with a flag?

    // const logger = createLogger()

    // Grab the safe config for provided network
    const userConfig = hre.userConfig

    console.log('userConfig', userConfig)

    const networkNames = Object.keys(hre.userConfig.networks || {})
    for (const networkName of networkNames) {
        const networkConfig = hre.userConfig.networks?.[networkName]
        if (networkConfig && 'safeConfig' in networkConfig) {
            const isValid = await validateSafeConfig(networkConfig.safeConfig)
            if (!isValid) {
                throw new Error(`Safe config validation failed for network: ${networkName}`)
            }
        }
    }

    console.log('All safe configs are valid') // TODO improve this message
    // TODO use logger

    // printLogo()
}
task(TASK_LZ_VALIDATE_SAFE_CONFIGS, 'Validate safe configs in hardhat.config.ts', action)
