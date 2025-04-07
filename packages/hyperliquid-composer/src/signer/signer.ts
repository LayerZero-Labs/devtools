import { encode } from '@msgpack/msgpack'
import { Wallet } from 'ethers'
import { keccak256 } from 'ethers/lib/utils'
import { Wallet as ethersV6Wallet } from 'ethers-v6'

import { loadEnv } from '@/io'
import { Hex } from '@layerzerolabs/lz-utilities'

import { isAbstractEthersV5Signer } from './utils'

import type { ValueType } from '@/types'

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
 * @param args.wallet - Wallet to sign the action.
 * @param args.action - The action to be signed.
 * @param args.nonce - Unique request identifier (recommended current timestamp in ms).
 * @param args.isTestnet - Indicates if the action is for the testnet. Default is `false`.
 * @param args.vaultAddress - Optional vault address used in the action.
 *
 * @returns The signature components r, s, and v.
 */
export async function signL1Action(args: {
    wallet: Wallet
    action: ValueType
    nonce: number
    isTestnet?: boolean
    vaultAddress: Hex | null
}): Promise<{ r: Hex; s: Hex; v: number }> {
    const { wallet, action, nonce, isTestnet = false, vaultAddress } = args

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
    const signature = await abstractSignTypedData({ wallet, domain, types, message })
    return splitSignature(signature)
}

/**
 * @dev Signs typed data with the provided wallet using EIP-712.
 */
async function abstractSignTypedData(args: {
    wallet: Wallet
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
    const { wallet, domain, types, message } = args

    if (isAbstractEthersV5Signer(wallet)) {
        /**
         * @dev Note we need ethers-v6 to sign typed data - this is because ethers-v5 EIP-712 signing is not stable.
         *
         * @dev Experimental feature (this method name will change)
         * @dev https://docs.ethers.org/v5/api/signer/#Signer-signTypedData
         *
         * @dev This does not have the warning and is stable.
         * @dev https://docs.ethers.org/v6/api/providers/#Signer-signTypedData
         */
        const signerv6 = new ethersV6Wallet(wallet.privateKey)
        const signature = await signerv6.signTypedData(domain, types, message)
        return signature as Hex
    } else {
        throw new Error('Unsupported wallet for signing typed data')
    }
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

export async function getHyperliquidWallet(privateKey?: string) {
    if (privateKey) {
        return new Wallet(privateKey)
    } else {
        const env = loadEnv()
        const privateKey = env.PRIVATE_KEY_HYPERLIQUID
        if (!privateKey) {
            console.error('PRIVATE_KEY_HYPERLIQUID is not set in .env file')
            process.exit(1)
        }

        return new Wallet(privateKey)
    }
}
