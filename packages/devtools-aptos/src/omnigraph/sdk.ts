import type { Aptos } from '@aptos-labs/ts-sdk'
import type { OmniPoint, IOmniSDK } from '@layerzerolabs/devtools'

import type { ConnectionFactory } from '../connection/types'

/**
 * Base OmniSDK implementation for Aptos
 *
 * This provides the foundation for building Aptos-specific SDKs
 * that integrate with the OmniGraph framework.
 */
export abstract class OmniSDK implements IOmniSDK {
    public readonly point: OmniPoint

    protected aptos?: Aptos

    constructor(
        point: OmniPoint,
        protected readonly connectionFactory?: ConnectionFactory
    ) {
        this.point = point
    }

    /**
     * Get or create the Aptos client connection
     */
    protected async getAptos(): Promise<Aptos> {
        if (this.aptos) {
            return this.aptos
        }

        if (!this.connectionFactory) {
            throw new Error('ConnectionFactory is required to create Aptos client')
        }

        this.aptos = await this.connectionFactory(this.point.eid)
        return this.aptos
    }
}
