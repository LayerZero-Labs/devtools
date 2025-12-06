import * as crypto from 'crypto'
import type { TypedDataDomain, TypedDataField } from 'ethers-v6'
import type { FireblocksConfig, IHyperliquidSigner } from './interfaces'
import { LOGGER_MODULES } from '@/types/cli-constants'
import { createModuleLogger, LogLevel } from '@layerzerolabs/io-devtools'

const logger = createModuleLogger(LOGGER_MODULES.FIREBLOCKS_SIGNER, LogLevel.info)

const DEFAULT_FIREBLOCKS_API_URL = 'https://api.fireblocks.io'

/**
 * Transaction state from Fireblocks API
 */
type FireblocksTransactionState =
    | 'SUBMITTED'
    | 'QUEUED'
    | 'PENDING_SIGNATURE'
    | 'PENDING_AUTHORIZATION'
    | 'PENDING_3RD_PARTY_MANUAL_APPROVAL'
    | 'PENDING_3RD_PARTY'
    | 'BROADCASTING'
    | 'CONFIRMING'
    | 'COMPLETED'
    | 'PENDING_AML_SCREENING'
    | 'PARTIALLY_COMPLETED'
    | 'CANCELLING'
    | 'CANCELLED'
    | 'REJECTED'
    | 'FAILED'
    | 'TIMEOUT'
    | 'BLOCKED'

/**
 * Fireblocks signature response
 */
interface FireblocksSignature {
    r: string
    s: string
    v: number
    fullSig: string
}

/**
 * Fireblocks signed message
 */
interface FireblocksSignedMessage {
    derivationPath: number[]
    algorithm: string
    publicKey: string
    signature: FireblocksSignature
    content: string
}

/**
 * Fireblocks transaction response
 */
interface FireblocksTransaction {
    id: string
    status: FireblocksTransactionState
    signedMessages?: FireblocksSignedMessage[]
}

/**
 * Fireblocks source for transaction
 */
interface FireblocksTransferPeerPath {
    type: 'VAULT_ACCOUNT'
    id: string
}

/**
 * Fireblocks EIP-712 message structure
 */
interface FireblocksEIP712Message {
    types: {
        EIP712Domain: Array<{ name: string; type: string }>
        [key: string]: Array<{ name: string; type: string }>
    }
    primaryType: string
    domain: {
        name: string
        version: string
        chainId: number
        verifyingContract: string
    }
    message: Record<string, unknown>
}

/**
 * Fireblocks create transaction request for EIP-712 typed data
 */
interface FireblocksCreateTransactionRequest {
    operation: 'TYPED_MESSAGE'
    assetId: 'ETH'
    source: FireblocksTransferPeerPath
    note?: string
    extraParameters: {
        rawMessageData: {
            messages: Array<{
                content: FireblocksEIP712Message
                type: 'EIP712'
            }>
        }
    }
}

/**
 * Signer implementation using Fireblocks API for signing
 */
export class FireblocksSigner implements IHyperliquidSigner {
    private config: Required<FireblocksConfig>
    private address: string | null = null

    constructor(config: FireblocksConfig) {
        this.config = {
            ...config,
            apiUrl: config.apiUrl ?? DEFAULT_FIREBLOCKS_API_URL,
            addressIndex: config.addressIndex ?? 0,
            signatureTimeout: config.signatureTimeout ?? 300000,
            pollingInterval: config.pollingInterval ?? 2000,
        }
    }

    /**
     * Generate a JWT token for Fireblocks API authentication
     */
    private generateJWT(path: string, bodyJson?: string): string {
        const now = Math.floor(Date.now() / 1000)
        const nonce = crypto.randomUUID()

        const header = {
            alg: 'RS256',
            typ: 'JWT',
        }

        const payload: Record<string, unknown> = {
            uri: path,
            nonce,
            iat: now,
            exp: now + 30,
            sub: this.config.apiKey,
        }

        if (bodyJson) {
            const bodyHash = crypto.createHash('sha256').update(bodyJson).digest('hex')
            payload.bodyHash = bodyHash
        }

        const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
        const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')

        const signatureInput = `${encodedHeader}.${encodedPayload}`
        const signature = crypto
            .createSign('RSA-SHA256')
            .update(signatureInput)
            .sign(this.config.secretKey, 'base64url')

        return `${signatureInput}.${signature}`
    }

    /**
     * Get the address associated with this vault account
     */
    async getAddress(): Promise<string> {
        if (this.address) {
            return this.address
        }

        const path = `/v1/vault/accounts/${this.config.vaultAccountId}/ETH/addresses`
        const jwt = this.generateJWT(path)

        const response = await fetch(`${this.config.apiUrl}${path}`, {
            headers: {
                'X-API-Key': this.config.apiKey,
                Authorization: `Bearer ${jwt}`,
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(
                `Failed to fetch ETH addresses for vault account ${this.config.vaultAccountId}: ${response.status} ${response.statusText}\n${errorText}`
            )
        }

        const addresses = await response.json()

        logger.debug('ETH addresses response: %O', addresses)

        if (!Array.isArray(addresses) || addresses.length === 0) {
            throw new Error(
                `No ETH addresses found in vault account ${this.config.vaultAccountId}. ` +
                    `You may need to create an ETH wallet address in your Fireblocks vault.`
            )
        }

        const addressIndex = this.config.addressIndex ?? 0
        if (addressIndex >= addresses.length) {
            throw new Error(
                `Address index ${addressIndex} is out of range. ` +
                    `Vault account ${this.config.vaultAccountId} has ${addresses.length} address(es). ` +
                    `Valid indices are 0-${addresses.length - 1}.`
            )
        }

        const selectedAddress = addresses[addressIndex]
        if (!selectedAddress || !selectedAddress.address) {
            throw new Error(
                `Invalid address at index ${addressIndex} for vault account ${this.config.vaultAccountId}. ` +
                    `Expected an address field but got: ${JSON.stringify(selectedAddress)}`
            )
        }

        this.address = selectedAddress.address
        return selectedAddress.address
    }

    /**
     * Sign EIP-712 typed data using Fireblocks API
     */
    async signTypedData(
        domain: TypedDataDomain,
        types: Record<string, Array<TypedDataField>>,
        value: Record<string, unknown>
    ): Promise<string> {
        const eip712Message: FireblocksEIP712Message = {
            types: {
                EIP712Domain: [
                    { name: 'name', type: 'string' },
                    { name: 'version', type: 'string' },
                    { name: 'chainId', type: 'uint256' },
                    { name: 'verifyingContract', type: 'address' },
                ],
                ...types,
            },
            primaryType: Object.keys(types)[0]!,
            domain: {
                name: domain.name as string,
                version: domain.version as string,
                chainId: domain.chainId as number,
                verifyingContract: domain.verifyingContract as string,
            },
            message: value,
        }

        const createRequest: FireblocksCreateTransactionRequest = {
            operation: 'TYPED_MESSAGE',
            assetId: 'ETH',
            source: {
                type: 'VAULT_ACCOUNT',
                id: this.config.vaultAccountId,
            },
            note: 'Hyperliquid L1 action signature',
            extraParameters: {
                rawMessageData: {
                    messages: [
                        {
                            content: eip712Message,
                            type: 'EIP712',
                        },
                    ],
                },
            },
        }

        logger.debug('Creating transaction with request: %O', {
            operation: createRequest.operation,
            assetId: createRequest.assetId,
            source: createRequest.source,
            note: createRequest.note,
        })
        logger.debug('Typed data being signed: %O', eip712Message)

        const path = '/v1/transactions'
        const requestBody = JSON.stringify(createRequest)
        const jwt = this.generateJWT(path, requestBody)

        const createResponse = await fetch(`${this.config.apiUrl}${path}`, {
            method: 'POST',
            headers: {
                'X-API-Key': this.config.apiKey,
                Authorization: `Bearer ${jwt}`,
                'Content-Type': 'application/json',
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
                `Failed to create Fireblocks transaction: ${createResponse.status} ${createResponse.statusText}\n${errorText}`
            )
        }

        const transaction: FireblocksTransaction = await createResponse.json()
        const transactionId = transaction.id

        return await this.waitForSignature(transactionId)
    }

    /**
     * Poll Fireblocks API until signature is complete
     */
    private async waitForSignature(transactionId: string): Promise<string> {
        const startTime = Date.now()

        while (Date.now() - startTime < this.config.signatureTimeout) {
            const path = `/v1/transactions/${transactionId}`
            const jwt = this.generateJWT(path)

            const response = await fetch(`${this.config.apiUrl}${path}`, {
                headers: {
                    'X-API-Key': this.config.apiKey,
                    Authorization: `Bearer ${jwt}`,
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(
                    `Failed to fetch transaction status: ${response.status} ${response.statusText}\n${errorText}`
                )
            }

            const transaction: FireblocksTransaction = await response.json()

            logger.debug('Transaction status response: %O', transaction)

            if (
                transaction.status === 'COMPLETED' &&
                transaction.signedMessages &&
                transaction.signedMessages.length > 0
            ) {
                const signedMessage = transaction.signedMessages[0]
                if (!signedMessage?.signature) {
                    throw new Error(`No signature found in completed transaction: ${transactionId}`)
                }

                const { r, s, v } = signedMessage.signature
                const fullSignature = `0x${r}${s}${v.toString(16).padStart(2, '0')}`
                return fullSignature
            }

            if (transaction.status === 'FAILED') {
                throw new Error(`Fireblocks transaction failed: ${transactionId}`)
            }

            if (transaction.status === 'REJECTED') {
                throw new Error(`Fireblocks transaction was rejected: ${transactionId}`)
            }

            if (transaction.status === 'CANCELLED') {
                throw new Error(`Fireblocks transaction was cancelled: ${transactionId}`)
            }

            if (transaction.status === 'TIMEOUT') {
                throw new Error(`Fireblocks transaction timed out: ${transactionId}`)
            }

            if (transaction.status === 'BLOCKED') {
                throw new Error(`Fireblocks transaction was blocked: ${transactionId}`)
            }

            await new Promise((resolve) => setTimeout(resolve, this.config.pollingInterval))
        }

        throw new Error(
            `Fireblocks signature timeout after ${this.config.signatureTimeout}ms for transaction ${transactionId}`
        )
    }
}
