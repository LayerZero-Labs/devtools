import { OmniAddress, OmniTransaction, areBytes32Equal, ignoreZero, mapError } from '@layerzerolabs/devtools'
import { OmniSDK } from '@layerzerolabs/devtools-evm'
import type { IOwnable } from '@layerzerolabs/ua-devtools'

export const OwnableMixin: IOwnable = {
    async getOwner(this: OmniSDK): Promise<OmniAddress | undefined> {
        this.logger.debug(`Getting owner`)

        const owner = await mapError(
            async () => this.contract.contract.owner(),
            (error) => new Error(`Failed to get owner for OApp ${this.label}: ${error}`)
        )

        return this.logger.debug(`Got owner: ${owner}`), ignoreZero(owner)
    },
    async hasOwner(this: OmniSDK, address: OmniAddress): Promise<boolean> {
        this.logger.debug(`Checking whether owner is ${address}`)

        return areBytes32Equal(await OwnableMixin.getOwner.apply(this), address)
    },
    async setOwner(this: OmniSDK, address: OmniAddress): Promise<OmniTransaction> {
        this.logger.debug(`Setting owner to address ${address}`)

        const data = this.contract.contract.interface.encodeFunctionData('transferOwnership', [address])

        return {
            ...this.createTransaction(data),
            description: `Setting owner to address ${address}`,
        }
    },
}
