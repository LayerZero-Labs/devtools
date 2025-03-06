import { Wallet } from 'ethers'
import axios, { AxiosInstance } from 'axios'
import { HYPERLIQUID_URLS } from '@/types'

import { getTimestampMs, signL1Action } from '@/signer'

export class HyperliquidClient {
    private readonly client: AxiosInstance
    private readonly baseUrl: string
    private readonly isTestnet: boolean

    constructor(isTestnet: boolean) {
        this.baseUrl = isTestnet ? HYPERLIQUID_URLS.TESTNET : HYPERLIQUID_URLS.MAINNET
        this.isTestnet = isTestnet
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Content-Type': 'application/json',
            },
        })
    }

    async submitHyperliquidAction(endpoint: string, wallet: Wallet, action: any) {
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

        try {
            console.log('Sending payload:', JSON.stringify(payload, null, 2))
            console.log(`Sending to: ${this.baseUrl}${endpoint}`)

            // Direct POST to the full endpoint
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
