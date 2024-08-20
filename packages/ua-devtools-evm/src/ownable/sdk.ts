import type { OmniAddress, OmniPoint, OmniTransaction } from '@layerzerolabs/devtools'
import { OmniSDK, Provider } from '@layerzerolabs/devtools-evm'
import type { IOwnable } from '@layerzerolabs/ua-devtools'
import { AsyncRetriable } from '@layerzerolabs/devtools'
import { OwnableMixin } from './mixin'
import { abi as defaultAbi } from './abi'
import { JsonFragment } from '@ethersproject/abi'

export class Ownable extends OmniSDK implements IOwnable {
    constructor(provider: Provider, point: OmniPoint, abi: JsonFragment[] = defaultAbi) {
        super(provider, point, abi)
    }

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
