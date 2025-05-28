import { PublicKey } from '@solana/web3.js'

import { OmniPoint, firstFactory } from '@layerzerolabs/devtools'
import { createConnectedContractFactory } from '@layerzerolabs/devtools-evm-hardhat'
import { createSolanaConnectionFactory, createSolanaSignerFactory } from '@layerzerolabs/devtools-solana'
import { createLogger } from '@layerzerolabs/io-devtools'
import { IOApp } from '@layerzerolabs/ua-devtools'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import { createOFTFactory } from '@layerzerolabs/ua-devtools-solana'

const logger = createLogger()

export { createSolanaConnectionFactory }

export const createSdkFactory = (
    userAccount: PublicKey,
    programId: PublicKey,
    connectionFactory = createSolanaConnectionFactory()
) => {
    // To create a EVM/Solana SDK factory we need to merge the EVM and the Solana factories into one
    //
    // We do this by using the firstFactory helper function that is provided by the devtools package.
    // This function will try to execute the factories one by one and return the first one that succeeds.
    const evmSdkfactory = createOAppFactory(createConnectedContractFactory())
    const solanaSdkFactory = createOFTFactory(
        // The first parameter to createOFTFactory is a user account factory
        //
        // This is a function that receives an OmniPoint ({ eid, address } object)
        // and returns a user account to be used with that SDK.
        //
        // For our purposes this will always be the user account coming from the secret key passed in
        () => userAccount,
        // The second parameter is a program ID factory
        //
        // This is a function that receives an OmniPoint ({ eid, address } object)
        // and returns a program ID to be used with that SDK.
        //
        // Since we only have one OFT deployed, this will always be the program ID passed as a CLI parameter.
        //
        // In situations where we might have multiple configs with OFTs using multiple program IDs,
        // this function needs to decide which one to use.
        () => programId,
        // Last but not least the SDK will require a connection
        connectionFactory
    )

    // We now "merge" the two SDK factories into one.
    //
    // We do this by using the firstFactory helper function that is provided by the devtools package.
    // This function will try to execute the factories one by one and return the first one that succeeds.
    return firstFactory<[OmniPoint], IOApp>(evmSdkfactory, solanaSdkFactory)
}

export { createSolanaSignerFactory }

export class DebugLogger {
    static keyValue(key: string, value: any, indentLevel = 0) {
        const indent = ' '.repeat(indentLevel * 2)
        console.log(`${indent}\x1b[33m${key}:\x1b[0m ${value}`)
    }

    static keyHeader(key: string, indentLevel = 0) {
        const indent = ' '.repeat(indentLevel * 2)
        console.log(`${indent}\x1b[33m${key}:\x1b[0m`)
    }

    static header(text: string) {
        console.log(`\x1b[36m${text}\x1b[0m`)
    }

    static separator() {
        console.log('\x1b[90m----------------------------------------\x1b[0m')
    }

    /**
     * Logs an error (in red) and corresponding fix suggestion (in blue).
     * Uses the ERRORS_FIXES_MAP to retrieve text based on the known error type.
     *
     * @param type Required KnownErrors enum member
     * @param errorMsg Optional string message to append to the error.
     */
    static printErrorAndFixSuggestion(type: KnownErrors, errorMsg?: string) {
        const fixInfo = ERRORS_FIXES_MAP[type]
        if (!fixInfo) {
            // Fallback if the error type is not recognized
            console.log(`\x1b[31mError:\x1b[0m Unknown error type "${type}"`)
            return
        }

        // If errorMsg is specified, append it in parentheses
        const errorOutput = errorMsg ? `${type}: (${errorMsg})` : type

        // Print the error type in red
        console.log(`\x1b[31mError:\x1b[0m ${errorOutput}`)

        // Print the tip in green
        console.log(`\x1b[32mFix suggestion:\x1b[0m ${fixInfo.tip}`)

        // Print the info in blue
        if (fixInfo.info) {
            console.log(`\x1b[34mElaboration:\x1b[0m ${fixInfo.info}`)
        }

        // log empty line to separate error messages
        console.log()
    }

    /**
     * Logs a warning (in yellow).
     */
    static printWarning(type: KnownWarnings, message?: string) {
        const label = `\x1b[33mWarning:\x1b[0m`
        console.log(`${label} ${type}${message ? ` – ${message}` : ''}`)
    }

    /**
     * Logs a LayerZero-specific output in purple.
     * @param type one of the KnownOutputs
     * @param payload optional extra info to log
     */
    static printLayerZeroOutput(type: KnownOutputs, payload?: string) {
        // \x1b[35m = purple, \x1b[0m = reset
        logger.info(`${payload ? ' ' + payload : ''}`)
    }
}

export enum KnownErrors {
    // variable name format: <DOMAIN>_<REASON>
    // e.g. If the user forgets to deploy the OFT Program, the variable name should be:
    // FIX_SUGGESTION_OFT_PROGRAM_NOT_DEPLOYED
    ULN_INIT_CONFIG_SKIPPED = 'ULN_INIT_CONFIG_SKIPPED',
    ERROR_QUOTING_NATIVE_GAS_COST = 'ERROR_QUOTING_NATIVE_GAS_COST',
    ERROR_SENDING_TRANSACTION = 'ERROR_SENDING_TRANSACTION',
    ERROR_GETTING_HRE = 'ERROR_GETTING_HARDHAT_RUNTIME_ENVIRONMENT_FOR_NETWORK',
}

export enum KnownWarnings {
    OFT_PROGRAM_NOT_DEPLOYED = 'OFT Program Not Deployed',
    USING_OVERRIDE_OFT = 'Using address provided as an OFT deployment',
    SOLANA_DEPLOYMENT_MISSING_OFT_STORE = 'Solana deployment missing OFT store',
    SOLANA_DEPLOYMENT_NOT_FOUND = 'SOLANA_DEPLOYMENT_NOT_FOUND',
    ERROR_LOADING_SOLANA_DEPLOYMENT = 'Error loading local Solana deployment',
}

export enum KnownOutputs {
    TX_HASH = 'Transaction hash',
    EXPLORER_LINK = 'LayerZero scan link',
    SENT_VIA_OFT = 'OFT sent successfully',
}

interface ErrorFixInfo {
    tip: string
    info?: string
}

export const ERRORS_FIXES_MAP: Record<KnownErrors, ErrorFixInfo> = {
    [KnownErrors.ULN_INIT_CONFIG_SKIPPED]: {
        tip: 'Did you run `npx hardhat lz:oft:solana:init-config --oapp-config <LZ_CONFIG_FILE_NAME> ?',
        info: 'You must run lz:oft:solana:init-config once before you run lz:oapp:wire. If you have added new pathways, you must also run lz:oft:solana:init-config again.',
    },
    [KnownErrors.ERROR_QUOTING_NATIVE_GAS_COST]: {
        tip: 'Have you run `npx hardhat lz:oapp:config:get --oapp-config <LZ_CONFIG_FILE_NAME>` and checked that you correctly configured the pathway?',
        info: 'LayerZero pathways require that a default Endpoint, Message Library, and DVN configuration exists for messaging to work. See https://layerzeroscan.com/tools/defaults for more information.',
    },
    [KnownErrors.ERROR_SENDING_TRANSACTION]: {
        tip: 'Have you correctly passed the quoteSend() result to the send() function?',
        info: 'To quote the native gas cost needed to send a message, you must pass the result of quoteSend() to the send() function.',
    },
    [KnownErrors.ERROR_GETTING_HRE]: {
        tip: 'Have you added the srcEid network to your `./hardhat.config.ts` file?',
        info: 'If you loaded a custom OFT deployment from an EVM network, you must add the deployment srcEid to your `./hardhat.config.ts` file for the OFT to be found.',
    },
}

export const WARNINGS_FIXES_MAP: Record<KnownWarnings, ErrorFixInfo> = {
    [KnownWarnings.SOLANA_DEPLOYMENT_NOT_FOUND]: {
        tip: 'Did you run `npx hardhat lz:oft:solana:create` ?',
        info: 'The Solana deployment file is required to run config tasks. The default path is ./deployments/solana-<mainnet/testnet>/OFT.json',
    },
    [KnownWarnings.OFT_PROGRAM_NOT_DEPLOYED]: {
        tip: 'Deploy the OFT program first',
        info: 'The OFT program must be deployed before proceeding with other operations',
    },
    [KnownWarnings.USING_OVERRIDE_OFT]: {
        tip: 'Using external OFT deployment',
        info: 'This is expected when using an external OFT deployment',
    },
    [KnownWarnings.SOLANA_DEPLOYMENT_MISSING_OFT_STORE]: {
        tip: 'OFT store is missing from deployment',
        info: 'The OFT store must be initialized in the deployment',
    },
    [KnownWarnings.ERROR_LOADING_SOLANA_DEPLOYMENT]: {
        tip: 'Failed to load Solana deployment',
        info: 'Check if the deployment file exists and is properly formatted',
    },
}
