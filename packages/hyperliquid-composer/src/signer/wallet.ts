import axios, { AxiosInstance } from 'axios'
import { Wallet } from 'ethers'
import inquirer from 'inquirer'

import { Logger, createModuleInteractionLogger } from '@layerzerolabs/io-devtools'

import { getTimestampMs, signL1Action } from '../signer'
import { HYPERLIQUID_URLS, ValueType } from '../types'

export class HyperliquidClient {
    private readonly client: AxiosInstance
    private readonly baseUrl: string
    private readonly isTestnet: boolean
    private readonly logger: Logger
    private readonly skipPrompt: boolean

    constructor(isTestnet: boolean, logLevel: string, skipPrompt?: boolean) {
        this.baseUrl = isTestnet ? HYPERLIQUID_URLS.TESTNET : HYPERLIQUID_URLS.MAINNET
        this.isTestnet = isTestnet
        this.skipPrompt = skipPrompt ?? false
        this.logger = createModuleInteractionLogger('hyperliquid-client', logLevel)
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Content-Type': 'application/json',
            },
        })
    }

    async submitHyperliquidAction(endpoint: string, wallet: Wallet | null, action: ValueType) {
        let payload = action

        if (endpoint === '/exchange') {
            if (!wallet) {
                this.logger.error('Wallet is null')
                process.exit(1)
            }

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

            this.logger.info(
                `Transaction is sent from ${wallet.address} on network hypercore-${this.isTestnet ? 'testnet' : 'mainnet'}`
            )

            if (this.skipPrompt) {
                this.logger.info('CI mode enabled - skipping confirmation prompt')
                this.logger.debug(`Transaction payload: ${JSON.stringify(payload, null, 2)}`)
            } else {
                const { executeTx } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'executeTx',
                        message: `Do you want to execute the transaction ${JSON.stringify(payload, null, 2)}?`,
                        default: false,
                    },
                ])

                if (!executeTx) {
                    this.logger.info('Transaction bundle cancelled - quitting.')
                    process.exit(1)
                }
            }
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
