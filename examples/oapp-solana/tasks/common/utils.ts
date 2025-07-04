import assert from 'assert'

import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import {
    OmniPoint,
    OmniSigner,
    OmniTransactionReceipt,
    OmniTransactionResponse,
    formatEid,
} from '@layerzerolabs/devtools'
import { createConnectedContractFactory } from '@layerzerolabs/devtools-evm-hardhat'
import {
    OmniSignerSolana,
    OmniSignerSolanaSquads,
    createConnectionFactory,
    createRpcUrlFactory,
} from '@layerzerolabs/devtools-solana'
import { ChainType, EndpointId, endpointIdToChainType } from '@layerzerolabs/lz-definitions'
import { UlnProgram } from '@layerzerolabs/lz-solana-sdk-v2'
import { Options } from '@layerzerolabs/lz-v2-utilities'
import { IOApp, OAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { createOAppFactory } from '@layerzerolabs/ua-devtools-evm'
import {
    OAppOmniGraphHardhatSchema,
    SUBTASK_LZ_OAPP_CONFIG_LOAD,
    SubtaskLoadConfigTaskArgs,
    TASK_LZ_OAPP_CONFIG_GET,
} from '@layerzerolabs/ua-devtools-evm-hardhat'

import { createSimpleOAppFactory } from '../../lib/factory'
import { createAptosOAppFactory } from '../aptos'

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
    const aptosSdkFactory = createAptosOAppFactory()
    const solanaSdkFactory = createSimpleOAppFactory(
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
    return async (point: OmniPoint): Promise<IOApp> => {
        if (endpointIdToChainType(point.eid) === ChainType.SOLANA) {
            return solanaSdkFactory(point)
        } else if (endpointIdToChainType(point.eid) === ChainType.EVM) {
            return evmSdkfactory(point)
        } else if (
            endpointIdToChainType(point.eid) === ChainType.APTOS ||
            endpointIdToChainType(point.eid) === ChainType.INITIA
        ) {
            return aptosSdkFactory(point)
        } else {
            console.error(`Unsupported chain type for EID ${point.eid}`)
            throw new Error(`Unsupported chain type for EID ${point.eid}`)
        }
    }
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
    oappPda: PublicKey
) {
    const uln = new UlnProgram.Uln(new PublicKey(ulnAddress))
    const sendConfig = uln.getSendConfigState(connection, new PublicKey(oappPda), remote)

    const receiveConfig = uln.getReceiveConfigState(connection, new PublicKey(oappPda), remote)

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
}

export enum KnownErrors {
    // variable name format: <DOMAIN>_<REASON>
    // e.g. If the user forgets to deploy the OFT Program, the variable name should be:
    // FIX_SUGGESTION_OFT_PROGRAM_NOT_DEPLOYED
    ULN_INIT_CONFIG_SKIPPED = 'ULN_INIT_CONFIG_SKIPPED',
    SOLANA_DEPLOYMENT_NOT_FOUND = 'SOLANA_DEPLOYMENT_NOT_FOUND',
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
    // TODO: verify below (was copied from OFT)
    [KnownErrors.SOLANA_DEPLOYMENT_NOT_FOUND]: {
        tip: 'Did you run `npx hardhat lz:oapp:solana:create` ?',
        info: 'The Solana deployment file is required to run config tasks. The default path is ./deployments/solana-<mainnet/testnet>/OApp.json',
    },
}

export const listEidsInLzConfig = async (hre: HardhatRuntimeEnvironment, oappConfig: string): Promise<EndpointId[]> => {
    if (!oappConfig) throw new Error('Missing oappConfig')

    let graph: OAppOmniGraph
    try {
        graph = await hre.run(SUBTASK_LZ_OAPP_CONFIG_LOAD, {
            configPath: oappConfig,
            schema: OAppOmniGraphHardhatSchema,
            task: TASK_LZ_OAPP_CONFIG_GET,
        } satisfies SubtaskLoadConfigTaskArgs)
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to load OApp configuration: ${error.message}`)
        } else {
            throw new Error('Failed to load OApp configuration: Unknown error')
        }
    }
    // init a Set
    const eids = new Set<EndpointId>()
    // loop through the connections and add the eids to the Set
    for (const { vector } of graph.connections) {
        eids.add(vector.from.eid)
        eids.add(vector.to.eid)
    }

    return Array.from(eids)
}

export function isSolanaEid(eid: EndpointId): boolean {
    return endpointIdToChainType(eid) === ChainType.SOLANA
}

export function isEvmEid(eid: EndpointId): boolean {
    return endpointIdToChainType(eid) === ChainType.EVM
}
