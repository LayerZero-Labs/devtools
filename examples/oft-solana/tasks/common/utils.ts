import assert from 'assert'

import { Connection, Keypair, PublicKey } from '@solana/web3.js'

import {
    OmniPoint,
    OmniSigner,
    OmniTransactionReceipt,
    OmniTransactionResponse,
    firstFactory,
    formatEid,
} from '@layerzerolabs/devtools'
import { createConnectedContractFactory } from '@layerzerolabs/devtools-evm-hardhat'
import {
    OmniSignerSolana,
    OmniSignerSolanaSquads,
    createConnectionFactory,
    createRpcUrlFactory,
} from '@layerzerolabs/devtools-solana'
import { createLogger } from '@layerzerolabs/io-devtools'
import { ChainType, EndpointId, endpointIdToChainType, endpointIdToNetwork } from '@layerzerolabs/lz-definitions'
import { UlnProgram } from '@layerzerolabs/lz-solana-sdk-v2'
import { Options } from '@layerzerolabs/lz-v2-utilities'
import { IOApp } from '@layerzerolabs/ua-devtools'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import { createOFTFactory } from '@layerzerolabs/ua-devtools-solana'

const logger = createLogger()

export const deploymentMetadataUrl = 'https://metadata.layerzero-api.com/v1/metadata/deployments'

/**
 * Given a srcEid and on-chain tx hash, return
 * `https://…blockExplorers[0].url/tx/<txHash>`, or undefined.
 */
export async function getBlockExplorerLink(srcEid: number, txHash: string): Promise<string | undefined> {
    const network = endpointIdToNetwork(srcEid) // e.g. "animechain-mainnet"
    const res = await fetch(deploymentMetadataUrl)
    if (!res.ok) return
    const all = (await res.json()) as Record<string, any>
    const meta = all[network]
    const explorer = meta?.blockExplorers?.[0]?.url
    if (explorer) {
        // many explorers use `/tx/<hash>`
        return `${explorer.replace(/\/+$/, '')}/tx/${txHash}`
    }
    return
}

export const createSolanaConnectionFactory = () =>
    createConnectionFactory(
        createRpcUrlFactory({
            [EndpointId.SOLANA_V2_MAINNET]: process.env.RPC_URL_SOLANA,
            [EndpointId.SOLANA_V2_TESTNET]: process.env.RPC_URL_SOLANA_TESTNET,
        })
    )

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

export const createSolanaSignerFactory = (
    wallet: Keypair,
    connectionFactory = createSolanaConnectionFactory(),
    multisigKey?: PublicKey
) => {
    return async (eid: EndpointId): Promise<OmniSigner<OmniTransactionResponse<OmniTransactionReceipt>>> => {
        assert(
            endpointIdToChainType(eid) === ChainType.SOLANA,
            `Solana signer factory can only create signers for Solana networks. Received ${formatEid(eid)}`
        )

        return multisigKey
            ? new OmniSignerSolanaSquads(eid, await connectionFactory(eid), multisigKey, wallet)
            : new OmniSignerSolana(eid, await connectionFactory(eid), wallet)
    }
}

export function uint8ArrayToHex(uint8Array: Uint8Array, prefix = false): string {
    const hexString = Buffer.from(uint8Array).toString('hex')
    return prefix ? `0x${hexString}` : hexString
}

function formatBigIntForDisplay(n: bigint) {
    return n.toLocaleString().replace(/,/g, '_')
}

export function decodeLzReceiveOptions(hex: string): string {
    try {
        // Handle empty/undefined values first
        if (!hex || hex === '0x') return 'No options set'
        const options = Options.fromOptions(hex)
        const lzReceiveOpt = options.decodeExecutorLzReceiveOption()
        return lzReceiveOpt
            ? `gas: ${formatBigIntForDisplay(lzReceiveOpt.gas)} , value: ${formatBigIntForDisplay(lzReceiveOpt.value)} wei`
            : 'No executor options'
    } catch (e) {
        return `Invalid options (${hex.slice(0, 12)}...)`
    }
}

export async function getSolanaUlnConfigPDAs(
    remote: EndpointId,
    connection: Connection,
    ulnAddress: PublicKey,
    oftStore: PublicKey
) {
    const uln = new UlnProgram.Uln(new PublicKey(ulnAddress))
    const sendConfig = uln.getSendConfigState(connection, new PublicKey(oftStore), remote)

    const receiveConfig = uln.getReceiveConfigState(connection, new PublicKey(oftStore), remote)

    return await Promise.all([sendConfig, receiveConfig])
}

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
}

export enum KnownWarnings {
    OFT_PROGRAM_NOT_DEPLOYED = 'OFT Program Not Deployed',
    USING_OVERRIDE_OFT = 'Loading external OFT deployment',
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
        tip: 'Did you run `npx hardhat lz:oft:solana:init-config --oapp-config <LZ_CONFIG_FILE_NAME> --solana-eid <SOLANA_EID>` ?',
        info: 'You must run lz:oft:solana:init-config once before you run lz:oapp:wire. If you have added new pathways, you must also run lz:oft:solana:init-config again.',
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
