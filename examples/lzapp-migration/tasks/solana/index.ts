import assert from 'assert'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import {
    fetchAddressLookupTable,
    mplToolbox,
    setComputeUnitLimit,
    setComputeUnitPrice,
} from '@metaplex-foundation/mpl-toolbox'
import {
    AddressLookupTableInput,
    EddsaInterface,
    Instruction,
    KeypairSigner,
    PublicKey,
    TransactionBuilder,
    Umi,
    createSignerFromKeypair,
    publicKey,
    signerIdentity,
    transactionBuilder,
} from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { createWeb3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js'
import { toWeb3JsInstruction, toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { AddressLookupTableAccount, Connection, Keypair } from '@solana/web3.js'
import { getSimulationComputeUnits } from '@solana-developers/helpers'
import bs58 from 'bs58'
import { backOff } from 'exponential-backoff'

import { formatEid } from '@layerzerolabs/devtools'
import { getPrioritizationFees } from '@layerzerolabs/devtools-solana'
import { promptToContinue } from '@layerzerolabs/io-devtools'
import { EndpointId, endpointIdToNetwork } from '@layerzerolabs/lz-definitions'
import { OftPDA } from '@layerzerolabs/oft-v2-solana-sdk'

import { createSolanaConnectionFactory } from '../common/utils'

const LOOKUP_TABLE_ADDRESS: Partial<Record<EndpointId, PublicKey>> = {
    [EndpointId.SOLANA_V2_MAINNET]: publicKey('AokBxha6VMLLgf97B5VYHEtqztamWmYERBmmFvjuTzJB'),
    [EndpointId.SOLANA_V2_TESTNET]: publicKey('9thqPdbR27A1yLWw2spwJLySemiGMXxPnEvfmXVk4KuK'),
}

const getFromEnv = (key: string): string => {
    const value = process.env[key]
    if (!value) {
        throw new Error(`${key} is not defined in the environment variables.`)
    }
    return value
}

/**
 * Extracts the SOLANA_PRIVATE_KEY from the environment.  This is purposely not exported for encapsulation purposes.
 */
const getSolanaPrivateKeyFromEnv = () => getFromEnv('SOLANA_PRIVATE_KEY')

/**
 * Derive common connection and UMI objects for a given endpoint ID.
 * @param eid {EndpointId}
 */
export const deriveConnection = async (eid: EndpointId, readOnly = false) => {
    const privateKey = readOnly ? bs58.encode(Keypair.generate().secretKey) : getSolanaPrivateKeyFromEnv()
    const connectionFactory = createSolanaConnectionFactory()
    const connection = await connectionFactory(eid)
    const umi = createUmi(connection.rpcEndpoint).use(mplToolbox())
    const umiWalletKeyPair = umi.eddsa.createKeypairFromSecretKey(bs58.decode(privateKey))
    const umiWalletSigner = createSignerFromKeypair(umi, umiWalletKeyPair)
    umi.use(signerIdentity(umiWalletSigner))
    return {
        connection,
        umi,
        umiWalletKeyPair,
        umiWalletSigner,
    }
}

export const useWeb3Js = () => {
    const privateKey = getSolanaPrivateKeyFromEnv()
    const secretKeyBytes = bs58.decode(privateKey)
    const keypair = Keypair.fromSecretKey(secretKeyBytes)
    return {
        web3JsKeypair: keypair,
    }
}

/**
 * Derive the keys needed for the OFT program.
 * @param programIdStr {string}
 */
export const deriveKeys = (programIdStr: string) => {
    const programId = publicKey(programIdStr)
    const eddsa: EddsaInterface = createWeb3JsEddsa()
    const oftDeriver = new OftPDA(programId)
    const lockBox = eddsa.generateKeypair()
    const escrowPK = lockBox.publicKey
    const [oftStorePda] = oftDeriver.oftStore(escrowPK)
    return {
        programId,
        lockBox,
        escrowPK,
        oftStorePda,
        eddsa,
    }
}

/**
 * Outputs the OFT accounts to a JSON file.
 * @param eid {EndpointId}
 * @param programId {string}
 * @param mint {string}
 * @param mintAuthority {string}
 * @param escrow {string}
 * @param oftStore {string}
 */
export const saveSolanaDeployment = (
    eid: EndpointId,
    programId: string,
    mint: string,
    mintAuthority: string,
    escrow: string,
    oftStore: string
) => {
    const outputDir = `./deployments/${endpointIdToNetwork(eid)}`
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true })
    }
    writeFileSync(
        `${outputDir}/OFT.json`,
        JSON.stringify(
            {
                programId,
                mint,
                mintAuthority,
                escrow,
                oftStore,
            },
            null,
            4
        )
    )
    console.log(`Accounts have been saved to ${outputDir}/OFT.json`)
}

/**
 * Reads the OFT deployment info from disk for the given endpoint ID.
 * @param eid {EndpointId}
 * @returns The contents of the OFT.json file as a JSON object.
 */
export const getSolanaDeployment = (
    eid: EndpointId
): {
    programId: string
    mint: string
    mintAuthority: string
    escrow: string
    oftStore: string
} => {
    const outputDir = path.join('deployments', endpointIdToNetwork(eid))
    const filePath = path.join(outputDir, 'OFT.json') // Note: if you have multiple deployments, change this filename to refer to the desired deployment file

    if (!existsSync(filePath)) {
        throw new Error(`Could not find Solana deployment file for eid ${eid} at: ${filePath}`)
    }

    const fileContents = readFileSync(filePath, 'utf-8')
    return JSON.parse(fileContents)
}

export const getLayerZeroScanLink = (hash: string, isTestnet = false) =>
    isTestnet ? `https://testnet.layerzeroscan.com/tx/${hash}` : `https://layerzeroscan.com/tx/${hash}`

export const getExplorerTxLink = (hash: string, isTestnet = false) =>
    `https://solscan.io/tx/${hash}?cluster=${isTestnet ? 'devnet' : 'mainnet-beta'}`

export const getAddressLookupTable = async (connection: Connection, umi: Umi, fromEid: EndpointId) => {
    // Lookup Table Address and Priority Fee Calculation
    const lookupTableAddress = LOOKUP_TABLE_ADDRESS[fromEid]
    assert(lookupTableAddress != null, `No lookup table found for ${formatEid(fromEid)}`)
    const addressLookupTableInput: AddressLookupTableInput = await fetchAddressLookupTable(umi, lookupTableAddress)
    if (!addressLookupTableInput) {
        throw new Error(`No address lookup table found for ${lookupTableAddress}`)
    }
    const { value: lookupTableAccount } = await connection.getAddressLookupTable(toWeb3JsPublicKey(lookupTableAddress))
    if (!lookupTableAccount) {
        throw new Error(`No address lookup table account found for ${lookupTableAddress}`)
    }
    return {
        lookupTableAddress,
        addressLookupTableInput,
        lookupTableAccount,
    }
}

export enum TransactionType {
    CreateToken = 'CreateToken',
    CreateMultisig = 'CreateMultisig',
    InitOft = 'InitOft',
    SetAuthority = 'SetAuthority',
    InitConfig = 'InitConfig',
    SendOFT = 'SendOFT',
}

const TransactionCuEstimates: Record<TransactionType, number> = {
    // for the sample values, they are: devnet, mainnet
    [TransactionType.CreateToken]: 125_000, // actual sample: (59073, 123539), 55785 (more volatile as it has CPI to Metaplex)
    [TransactionType.CreateMultisig]: 5_000, // actual sample: 3,230
    [TransactionType.InitOft]: 70_000, // actual sample: 59207, 65198 (note: this is the only transaction that createOFTAdapter does)
    [TransactionType.SetAuthority]: 8_000, // actual sample: 6424, 6472
    [TransactionType.InitConfig]: 42_000, // actual sample: 33157, 40657
    [TransactionType.SendOFT]: 230_000, // actual sample: 217,784
}

export const getComputeUnitPriceAndLimit = async (
    connection: Connection,
    ixs: Instruction[],
    wallet: KeypairSigner,
    lookupTableAccount: AddressLookupTableAccount,
    transactionType: TransactionType
) => {
    const { averageFeeExcludingZeros } = await getPrioritizationFees(connection)
    const priorityFee = Math.round(averageFeeExcludingZeros)
    const computeUnitPrice = BigInt(priorityFee)

    let computeUnits

    try {
        computeUnits = await backOff(
            () =>
                getSimulationComputeUnits(
                    connection,
                    ixs.map((ix) => toWeb3JsInstruction(ix)),
                    toWeb3JsPublicKey(wallet.publicKey),
                    [lookupTableAccount]
                ),
            {
                maxDelay: 10000,
                numOfAttempts: 3,
            }
        )
    } catch (e) {
        console.error(`Error retrieving simulations compute units from RPC:`, e)
        const continueByUsingHardcodedEstimate = await promptToContinue(
            'Failed to call simulateTransaction on the RPC. This can happen when the network is congested. Would you like to use hardcoded estimates (TransactionCuEstimates) ? This may result in slightly overpaying for the transaction.'
        )
        if (!continueByUsingHardcodedEstimate) {
            throw new Error(
                'Failed to call simulateTransaction on the RPC and user chose to not continue with hardcoded estimate.'
            )
        }
        console.log(
            `Falling back to hardcoded estimate for ${transactionType}: ${TransactionCuEstimates[transactionType]} CUs`
        )
        computeUnits = TransactionCuEstimates[transactionType]
    }

    if (!computeUnits) {
        throw new Error('Unable to compute units')
    }

    return {
        computeUnitPrice,
        computeUnits,
    }
}

export const addComputeUnitInstructions = async (
    connection: Connection,
    umi: Umi,
    eid: EndpointId,
    txBuilder: TransactionBuilder,
    umiWalletSigner: KeypairSigner,
    computeUnitPriceScaleFactor: number,
    transactionType: TransactionType
) => {
    const computeUnitLimitScaleFactor = 1.1 // hardcoded to 1.1 as the estimations are not perfect and can fall slightly short of the actual CU usage on-chain
    const { addressLookupTableInput, lookupTableAccount } = await getAddressLookupTable(connection, umi, eid)
    const { computeUnitPrice, computeUnits } = await getComputeUnitPriceAndLimit(
        connection,
        txBuilder.getInstructions(),
        umiWalletSigner,
        lookupTableAccount,
        transactionType
    )
    // Since transaction builders are immutable, we must be careful to always assign the result of the add and prepend
    // methods to a new variable.
    const newTxBuilder = transactionBuilder()
        .add(
            setComputeUnitPrice(umi, {
                microLamports: computeUnitPrice * BigInt(Math.floor(computeUnitPriceScaleFactor)),
            })
        )
        .add(setComputeUnitLimit(umi, { units: computeUnits * computeUnitLimitScaleFactor }))
        .setAddressLookupTables([addressLookupTableInput])
        .add(txBuilder)
    return newTxBuilder
}
