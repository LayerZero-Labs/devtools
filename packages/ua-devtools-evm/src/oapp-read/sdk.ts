import { OApp } from '@/oapp/sdk'
import { areBytes32Equal, mapError, normalizePeer, type OmniTransaction } from '@layerzerolabs/devtools'
import type { IOAppRead } from '@layerzerolabs/ua-devtools'

export class OAppRead extends OApp implements IOAppRead {
    async setReadChannel(channelId: number, active: boolean): Promise<OmniTransaction> {
        this.logger.debug(`Setting channel (${channelId}) to ${active ? 'active' : 'inactive'}`)

        const data = this.contract.contract.interface.encodeFunctionData('setReadChannel', [channelId, active])
        return {
            ...this.createTransaction(data),
            description: `Setting channel (${channelId}) to ${active ? 'active' : 'inactive'}`,
        }
    }

    async isReadChannelActive(channelId: number): Promise<boolean> {
        this.logger.debug(`Getting peer for channelId: ${channelId}`)

        const peer = await mapError(
            () => this.contract.contract.peers(channelId),
            (error) => new Error(`Failed to get peer for ${channelId} for OApp ${this.label}: ${error}`)
        )

        return areBytes32Equal(
            normalizePeer(peer, this.contract.eid),
            normalizePeer(this.contract.contract.address, this.contract.eid)
        )
    }
}
