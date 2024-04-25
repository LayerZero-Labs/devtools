import type { OmniAddress, OmniTransaction } from '@layerzerolabs/devtools'
import { OmniSDK } from '@layerzerolabs/devtools-evm'
import type { IOwnable } from '@layerzerolabs/ua-devtools'
import { AsyncRetriable } from '@layerzerolabs/devtools'
import { OwnableMixin } from './mixin'

export class Ownable extends OmniSDK implements IOwnable {
    @AsyncRetriable()
    async getOwner(): Promise<OmniAddress | undefined> {
        return OwnableMixin.getOwner.call(this)
    }

    @AsyncRetriable()
    hasOwner(address: string): Promise<boolean> {
        return OwnableMixin.hasOwner.call(this, address)
    }

    setOwner(address: string): Promise<OmniTransaction> {
        return OwnableMixin.setOwner.call(this, address)
    }
}
