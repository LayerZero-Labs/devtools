import { getTimestampMs, signL1Action } from '@/signer'
import { HYPERLIQUID_URLS, ValueType } from '@/types'
import axios, { AxiosInstance } from 'axios'
import { Wallet } from 'ethers'

import { Logger, createLogger } from '@layerzerolabs/io-devtools'

export class HyperliquidClient {
    private readonly client: AxiosInstance
    private readonly baseUrl: string
    private readonly isTestnet: boolean
    private readonly logger: Logger

    constructor(isTestnet: boolean, logLevel: string) {
        this.baseUrl = isTestnet ? HYPERLIQUID_URLS.TESTNET : HYPERLIQUID_URLS.MAINNET
        this.isTestnet = isTestnet
        this.logger = createLogger(logLevel)
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Content-Type': 'application/json',
            },
        })
    }

    async submitHyperliquidAction(endpoint: string, wallet: Wallet, action: ValueType) {
        const nonce = getTimestampMs()

        const signature = await signL1Action({
            wallet,
            action,
            nonce,
            isTestnet: this.isTestnet,
            vaultAddress: null,
        })

        // Format the payload exactly as shown in the working example
        const payload = {
            action,
            nonce,
            signature,
            vaultAddress: null,
        }

        this.logger.debug(`Sending payload to full url: ${this.baseUrl}${endpoint}`)
        this.logger.debug(`payload: ${JSON.stringify(payload, null, 2)}`)

        try {
            const response = await this.client.post(endpoint, payload)
            return response.data
        } catch (error) {
            console.error(error)
            if (axios.isAxiosError(error) && error.response) {
                console.error('API Error:', {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data,
                    url: `${this.baseUrl}${endpoint}`,
                    payload: JSON.stringify(payload),
                })
                throw new Error(`Hyperliquid API error: ${JSON.stringify(error.response.data)}`)
            }
            throw new Error(`Failed to submit Hyperliquid action: ${error}`)
        }
    }
}
