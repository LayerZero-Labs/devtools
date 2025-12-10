import * as crypto from 'crypto'
import type { TypedDataDomain, TypedDataField } from 'ethers-v6'
import type { FordefiConfig, IHyperliquidSigner } from './interfaces'
import { LOGGER_MODULES } from '@/types/cli-constants'
import { createModuleLogger, LogLevel } from '@layerzerolabs/io-devtools'

const logger = createModuleLogger(LOGGER_MODULES.FORDEFI_SIGNER, LogLevel.info)

const DEFAULT_FORDEFI_API_URL = 'https://api.fordefi.com'

/**
 * Transaction state from Fordefi API
 */
type FordefiTransactionState = 'pending' | 'approved' | 'completed' | 'failed' | 'rejected' | 'cancelled' | 'expired'

/**
 * Fordefi transaction response
 */
interface FordefiTransaction {
    id: string
    state: FordefiTransactionState
    signatures?: Array<{
        data: string
    }>
}

/**
 * Fordefi create transaction request for EIP-712 typed data
 */
interface FordefiCreateMessageRequest {
    signer_type: 'api_signer' | 'initiator' | 'end_user' | 'multiple_signers'
    type: 'evm_message'
    details: {
        type: 'typed_message_type'
        raw_data: string // hex-encoded JSON
        chain: string | number // Accepts chain name, integer chain ID, or evm_<chain_id> format
    }
    vault_id: string
    note?: string
}

/**
 * Signer implementation using Fordefi API for signing
 */
export class FordefiSigner implements IHyperliquidSigner {
    private config: Required<FordefiConfig>
    private address: string | null = null

    constructor(config: FordefiConfig) {
        this.config = {
            ...config,
            apiUrl: config.apiUrl ?? DEFAULT_FORDEFI_API_URL,
            signatureTimeout: config.signatureTimeout ?? 300000,
            pollingInterval: config.pollingInterval ?? 2000,
        }
    }

    /**
     * Sign a request according to Fordefi's authentication requirements
     * Signs: ${path}|${timestamp}|${requestBody}
     * Using ECDSA signature scheme over the NIST P-256 curve
     */
    private signRequest(path: string, timestamp: number, requestBody: string): string {
        const message = `${path}|${timestamp}|${requestBody}`
        const sign = crypto.createSign('SHA256')
        sign.update(message)
        sign.end()
        return sign.sign(this.config.privateKey, 'base64')
    }

    /**
     * Get the address associated with this vault
     */
    async getAddress(): Promise<string> {
        if (this.address) {
            return this.address
        }

        const response = await fetch(`${this.config.apiUrl}/api/v1/vaults/${this.config.vaultId}`, {
            headers: {
                Authorization: `Bearer ${this.config.accessToken}`,
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch vault details: ${response.status} ${response.statusText}`)
        }

        const vault = await response.json()

        logger.debug('Vault details response: %O', vault)

        let evmAddress = vault.address

        if (!evmAddress && vault.addresses) {
            evmAddress = vault.addresses.find((addr: { type: string }) => addr.type === 'evm')?.address
        }

        if (!evmAddress) {
            throw new Error(`No EVM address found in vault ${this.config.vaultId}`)
        }

        this.address = evmAddress
        return evmAddress
    }

    /**
     * Sign EIP-712 typed data using Fordefi API
     */
    async signTypedData(
        domain: TypedDataDomain,
        types: Record<string, Array<TypedDataField>>,
        value: Record<string, unknown>
    ): Promise<string> {
        // ForDefi requires the EIP712Domain type to be included in the types object
        // but ethers.js doesn't expect it, so we add it only for ForDefi
        const typesWithDomain = {
            ...types,
            EIP712Domain: [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'chainId', type: 'uint256' },
                { name: 'verifyingContract', type: 'address' },
            ],
        }

        const primaryType = Object.keys(types).find((key) => key !== 'EIP712Domain') ?? Object.keys(types)[0]

        const typedData = {
            types: typesWithDomain,
            primaryType,
            domain,
            message: value,
        }

        const jsonString = JSON.stringify(typedData)
        const hexData = '0x' + Buffer.from(jsonString, 'utf8').toString('hex')

        // Fordefi supports signing with chainId 1337 for Hyperliquid,
        // but this may need to be enabled on your vault by Fordefi.
        // Use the chainId from the domain (1337) directly as the chain parameter
        // See: https://github.com/FordefiHQ/api-examples/blob/main/typescript/evm/hyperliquid-hypercore/src/wallet-adapter.ts
        const domainChainId = (domain as { chainId?: number }).chainId
        const chainToUse = domainChainId ?? this.config.chain
        const createRequest: FordefiCreateMessageRequest = {
            signer_type: 'api_signer',
            type: 'evm_message',
            details: {
                type: 'typed_message_type',
                raw_data: hexData,
                chain: chainToUse,
            },
            vault_id: this.config.vaultId,
            note: 'Hyperliquid L1 action signature',
        }

        logger.debug('Creating transaction with request: %O', {
            type: createRequest.type,
            details: {
                type: createRequest.details.type,
                raw_data_length: hexData.length,
                raw_data_preview: hexData.substring(0, 100) + '...',
                chain: createRequest.details.chain,
            },
            vault_id: createRequest.vault_id,
            note: createRequest.note,
        })
        logger.debug('Typed data being signed: %O', typedData)

        const path = '/api/v1/transactions'
        const timestamp = Date.now()
        const requestBody = JSON.stringify(createRequest)
        const signature = this.signRequest(path, timestamp, requestBody)

        const createResponse = await fetch(`${this.config.apiUrl}${path}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.config.accessToken}`,
                'Content-Type': 'application/json',
                'x-signature': signature,
                'x-timestamp': timestamp.toString(),
            },
            body: requestBody,
        })

        if (!createResponse.ok) {
            const errorText = await createResponse.text()
            logger.error('Transaction creation failed: %O', {
                status: createResponse.status,
                statusText: createResponse.statusText,
                error: errorText,
            })
            throw new Error(
                `Failed to create Fordefi transaction: ${createResponse.status} ${createResponse.statusText}\n${errorText}`
            )
        }

        const transaction: FordefiTransaction = await createResponse.json()
        const transactionId = transaction.id

        return await this.waitForSignature(transactionId)
    }

    /**
     * Poll Fordefi API until signature is complete
     */
    private async waitForSignature(transactionId: string): Promise<string> {
        const startTime = Date.now()

        while (Date.now() - startTime < this.config.signatureTimeout) {
            const response = await fetch(`${this.config.apiUrl}/api/v1/transactions/${transactionId}`, {
                headers: {
                    Authorization: `Bearer ${this.config.accessToken}`,
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch transaction status: ${response.status} ${response.statusText}`)
            }

            const transaction: FordefiTransaction = await response.json()

            logger.debug('Transaction status response: %O', transaction)

            if (transaction.state === 'completed' && transaction.signatures && transaction.signatures.length > 0) {
                const signature = transaction.signatures[0]?.data
                if (!signature) {
                    throw new Error(`No signature found in completed transaction: ${transactionId}`)
                }
                const signatureBuffer = Buffer.from(signature, 'base64')
                const hexSignature = '0x' + signatureBuffer.toString('hex')
                return hexSignature
            }

            if (transaction.state === 'failed') {
                throw new Error(`Fordefi transaction failed: ${transactionId}`)
            }

            if (transaction.state === 'rejected') {
                throw new Error(`Fordefi transaction was rejected: ${transactionId}`)
            }

            if (transaction.state === 'cancelled') {
                throw new Error(`Fordefi transaction was cancelled: ${transactionId}`)
            }

            if (transaction.state === 'expired') {
                throw new Error(`Fordefi transaction expired: ${transactionId}`)
            }

            await new Promise((resolve) => setTimeout(resolve, this.config.pollingInterval))
        }

        throw new Error(
            `Fordefi signature timeout after ${this.config.signatureTimeout}ms for transaction ${transactionId}`
        )
    }
}
