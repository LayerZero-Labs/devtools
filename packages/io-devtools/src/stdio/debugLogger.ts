import { createLogger } from './logger'

/**
 * Provides simple console logging helpers used across devtools examples.
 */
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

    static printErrorAndFixSuggestion(type: KnownErrors, errorMsg?: string) {
        const fixInfo = ERRORS_FIXES_MAP[type]
        if (!fixInfo) {
            console.log(`\x1b[31mError:\x1b[0m Unknown error type "${type}"`)
            return
        }

        const errorOutput = errorMsg ? `${type}: (${errorMsg})` : type

        console.log(`\x1b[31mError:\x1b[0m ${errorOutput}`)
        console.log(`\x1b[32mFix suggestion:\x1b[0m ${fixInfo.tip}`)
        if (fixInfo.info) {
            console.log(`\x1b[34mElaboration:\x1b[0m ${fixInfo.info}`)
        }
        console.log()
    }

    static printWarning(type: KnownWarnings, message?: string) {
        const label = `\x1b[33mWarning:\x1b[0m`
        console.log(`${label} ${type}${message ? ` – ${message}` : ''}`)
    }

    static printLayerZeroOutput(type: KnownOutputs, payload?: string) {
        logger.info(`${payload ? ' ' + payload : ''}`)
    }
}

export enum KnownErrors {
    ULN_INIT_CONFIG_SKIPPED = 'ULN_INIT_CONFIG_SKIPPED',
    ERROR_QUOTING_NATIVE_GAS_COST = 'ERROR_QUOTING_NATIVE_GAS_COST',
    ERROR_SENDING_TRANSACTION = 'ERROR_SENDING_TRANSACTION',
    ERROR_GETTING_HRE = 'ERROR_GETTING_HARDHAT_RUNTIME_ENVIRONMENT_FOR_NETWORK',
    SOLANA_INVALID_OWNER_OR_DELEGATE = 'SOLANA_INVALID_OWNER_OR_DELEGATE',
    SOLANA_OWNER_OR_DELEGATE_CANNOT_BE_MULTISIG_ACCOUNT = 'SOLANA_OWNER_OR_DELEGATE_MULTISIG_ACCOUNT',
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
    [KnownErrors.SOLANA_INVALID_OWNER_OR_DELEGATE]: {
        tip: 'The owner or delegate of the Solana OApp must either be a regular on curve address or a Squads Vault Account.',
        info: 'Ensure that you are using a regular on-curve Solana address or a Squads Vault PDA as the owner or delegate of the OApp.',
    },
    [KnownErrors.SOLANA_OWNER_OR_DELEGATE_CANNOT_BE_MULTISIG_ACCOUNT]: {
        tip: 'The owner or delegate of the Solana OApp must not be the Squads multisig account address.',
        info: 'If you intend to use Squads Multisig, ensure that you are providing a Squads Vault address as the owner or delegate of the OApp. The Squads Multisig account address cannot be the owner or delegate.',
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

const logger = createLogger()
