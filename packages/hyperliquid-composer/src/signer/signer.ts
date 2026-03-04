import { encode } from '@msgpack/msgpack'
import { ethers, Wallet } from 'ethers'
import { keccak256 } from 'ethers/lib/utils'

import { loadEnv, loadFordefiConfig, loadFireblocksConfig } from '@/io'
import { Hex } from '@layerzerolabs/lz-utilities'
import { LogLevel, createModuleLogger } from '@layerzerolabs/io-devtools'

import { EthersSigner } from './ethers-signer'
import { FordefiSigner } from './fordefi-signer'
import { FireblocksSigner } from './fireblocks-signer'
import type { IHyperliquidSigner, FordefiConfig, FireblocksConfig } from './interfaces'

import type { ValueType } from '@/types'
import { LOGGER_MODULES } from '@/types/cli-constants'

const logger = createModuleLogger(LOGGER_MODULES.BASE_SIGNER, LogLevel.info)

/**
 * Converts a hex string address to a Buffer.
 * Removes the "0x" prefix if present.
 *
 * @param address - The vault address as a hex string.
 * @returns The address as a Buffer.
 */
function addressToBytes(address: string): Buffer {
    // Remove '0x' prefix if it exists.
    if (address.startsWith('0x')) {
        address = address.slice(2)
    }
    return Buffer.from(address, 'hex')
}

/**
 * @dev Creates a keccak hash based on the packed action, nonce, and vault address.
 * @dev I just ripped off - https://github.com/hyperliquid-dex/hyperliquid-python-sdk/blob/master/hyperliquid/utils/signing.py#L137-L145
 *
 * @param action - The action data to be packed with MessagePack.
 * @param vaultAddress - The vault address as a hex string or null.
 * @param nonce - A numeric nonce.
 *
 * @returns The keccak hash as a hex string.
 */
export function computeL1ActionHash(action: ValueType, nonce: number, vaultAddress: string | null): string {
    const actionPacked = encode(action)

    const nonceBuffer: Buffer = Buffer.alloc(8)
    nonceBuffer.writeBigUInt64BE(BigInt(nonce))

    let vaultBuffer: Buffer
    if (vaultAddress === null) {
        vaultBuffer = Buffer.from([0x00])
    } else {
        vaultBuffer = Buffer.concat([Buffer.from([0x01]), addressToBytes(vaultAddress)])
    }

    const data = Buffer.concat([actionPacked, nonceBuffer, vaultBuffer])

    const hash = keccak256(data)
    return hash
}

/**
 * Sign an L1 action.
 *
 * @dev Signature generation depends on the order of the action keys.
 * @dev I just ripped off - https://github.com/hyperliquid-dex/hyperliquid-python-sdk/blob/master/hyperliquid/utils/signing.py#L152-L177
 *
 * @param args.signer - Signer to sign the action.
 * @param args.action - The action to be signed.
 * @param args.nonce - Unique request identifier (recommended current timestamp in ms).
 * @param args.isTestnet - Indicates if the action is for the testnet. Default is `false`.
 * @param args.vaultAddress - Optional vault address used in the action.
 *
 * @returns The signature components r, s, and v.
 */
export async function signL1Action(args: {
    signer: IHyperliquidSigner
    action: ValueType
    nonce: number
    isTestnet?: boolean
    vaultAddress: Hex | null
}): Promise<{ r: Hex; s: Hex; v: number }> {
    const { signer, action, nonce, isTestnet = false, vaultAddress } = args

    const domain = {
        name: 'Exchange',
        version: '1',
        chainId: 1337,
        verifyingContract: '0x0000000000000000000000000000000000000000',
    } as const
    const types = {
        Agent: [
            { name: 'source', type: 'string' },
            { name: 'connectionId', type: 'bytes32' },
        ],
    }

    const actionHash = computeL1ActionHash(action, nonce, vaultAddress)
    const message = {
        source: isTestnet ? 'b' : 'a',
        connectionId: actionHash,
    }
    const signature = await abstractSignTypedData({ signer, domain, types, message })
    return splitSignature(signature)
}

/**
 * @dev Signs typed data using the provided signer
 */
async function abstractSignTypedData(args: {
    signer: IHyperliquidSigner
    domain: {
        name: string
        version: string
        chainId: number
        verifyingContract: Hex
    }
    types: {
        [key: string]: {
            name: string
            type: string
        }[]
    }
    message: { [key: string]: unknown }
}): Promise<Hex> {
    const { signer, domain, types, message } = args

    // Sign using the signer interface (works for both Ethers and Fordefi)
    const signature = await signer.signTypedData(domain, types, message)

    // Verify signature matches signer address
    const signedBy = ethers.utils.verifyTypedData(domain, types, message, signature)
    const signerAddress = await signer.getAddress()

    if (signedBy.toLowerCase() !== signerAddress.toLowerCase()) {
        throw new Error('Invalid signature: signed address does not match signer address')
    }

    return signature as Hex
}

/** Splits a signature hexadecimal string into its components. */
function splitSignature(signature: Hex): { r: Hex; s: Hex; v: number } {
    const r = `0x${signature.slice(2, 66)}` as const
    const s = `0x${signature.slice(66, 130)}` as const
    const v = parseInt(signature.slice(130, 132), 16)
    return { r, s, v }
}

export function getTimestampMs(): number {
    return Date.now()
}

/**
 * Get a Hyperliquid signer from environment variables or CLI args.
 * Supports private key (Ethers), Fordefi, and Fireblocks signing.
 *
 * Priority:
 * 1. Fordefi config (if provided via args or env)
 * 2. Fireblocks config (if provided via args or env)
 * 3. Private key (if provided via args or env)
 *
 * @param privateKey - Optional private key override
 * @param fordefiConfig - Optional Fordefi configuration override
 * @param fireblocksConfig - Optional Fireblocks configuration override
 * @returns IHyperliquidSigner implementation
 */
export async function getHyperliquidSigner(
    privateKey?: string,
    fordefiConfig?: FordefiConfig,
    fireblocksConfig?: FireblocksConfig
): Promise<IHyperliquidSigner> {
    // Try Fordefi first (from args or env)
    const fordefiConfigResolved = fordefiConfig ?? loadFordefiConfig()
    if (fordefiConfigResolved) {
        logger.info('Using Fordefi signer for Hyperliquid actions')
        return new FordefiSigner(fordefiConfigResolved)
    }

    // Try Fireblocks second (from args or env)
    const fireblocksConfigResolved = fireblocksConfig ?? loadFireblocksConfig()
    if (fireblocksConfigResolved) {
        logger.info('Using Fireblocks signer for Hyperliquid actions')
        return new FireblocksSigner(fireblocksConfigResolved)
    }

    // Fall back to private key
    if (privateKey) {
        return new EthersSigner(privateKey)
    }

    const env = loadEnv()
    const envPrivateKey = env.PRIVATE_KEY_HYPERLIQUID
    if (!envPrivateKey) {
        logger.error(
            'No signing method configured. Please set either:\n' +
                '  - PRIVATE_KEY_HYPERLIQUID (for Ethers signing), or\n' +
                '  - FORDEFI_ACCESS_TOKEN, FORDEFI_PRIVATE_KEY, FORDEFI_VAULT_ID, FORDEFI_CHAIN (for Fordefi signing), or\n' +
                '  - FIREBLOCKS_API_KEY, FIREBLOCKS_SECRET_KEY, FIREBLOCKS_VAULT_ACCOUNT_ID (for Fireblocks signing)'
        )
        process.exit(1)
    }

    return new EthersSigner(envPrivateKey)
}

/**
 * @deprecated Use getHyperliquidSigner instead. This is kept for backward compatibility.
 */
export async function getHyperliquidWallet(privateKey?: string): Promise<Wallet> {
    if (privateKey) {
        return new Wallet(privateKey)
    }

    const env = loadEnv()
    const envPrivateKey = env.PRIVATE_KEY_HYPERLIQUID
    if (!envPrivateKey) {
        logger.error('PRIVATE_KEY_HYPERLIQUID is not set in .env file')
        process.exit(1)
    }

    return new Wallet(envPrivateKey)
}
