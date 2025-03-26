import axios, { AxiosInstance } from 'axios'
import { Wallet } from 'ethers'

import { Logger, createModuleInteractionLogger } from '@layerzerolabs/io-devtools'

import { getTimestampMs, signL1Action } from '../signer'
import { HYPERLIQUID_URLS, ValueType } from '../types'

export class HyperliquidClient {
    private readonly client: AxiosInstance
    private readonly baseUrl: string
    private readonly isTestnet: boolean
    private readonly logger: Logger

    constructor(isTestnet: boolean, logLevel: string) {
        this.baseUrl = isTestnet ? HYPERLIQUID_URLS.TESTNET : HYPERLIQUID_URLS.MAINNET
        this.isTestnet = isTestnet
        this.logger = createModuleInteractionLogger('hyperliquid-client', logLevel)
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Content-Type': 'application/json',
            },
        })
    }

    async submitHyperliquidAction(endpoint: string, wallet: Wallet, action: ValueType) {
        let payload
        if (endpoint === '/exchange') {
            const nonce = getTimestampMs()

            const signature = await signL1Action({
                wallet,
                action,
                nonce,
                isTestnet: this.isTestnet,
                vaultAddress: null,
            })

            payload = {
                action,
                nonce,
                signature,
                vaultAddress: null,
            }
        } else if (endpoint === '/info') {
            payload = action
        }

        this.logger.debug(`Sending payload to full url: ${this.baseUrl}${endpoint}`)
        this.logger.debug(`payload: \n ${JSON.stringify(payload, null, 2)}`)

        try {
            const response = await this.client.post(endpoint, payload)
            const data = response.data
            if (data.status === 'err') {
                this.logger.error(`Hyperliquid API error: ${data['response']}`)
            } else if (endpoint === '/exchange') {
                this.logger.info(`Hyperliquid API response: ${JSON.stringify(data['response'], null, 2)}`)
            }
            return data
        } catch (error) {
            // These are HTTP errors that we catch
            this.logger.error(error)
            this.logger.error(`Sending payload to full url: ${this.baseUrl}${endpoint}`)
            this.logger.error(`payload: ${JSON.stringify(payload, null, 2)}`)
            if (axios.isAxiosError(error) && error.response) {
                this.logger.error('API Error:', {
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
