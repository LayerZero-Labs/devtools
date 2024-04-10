import type { ILzApp } from '@layerzerolabs/ua-devtools'
import {
    type OmniAddress,
    type OmniTransaction,
    formatEid,
    areBytes32Equal,
    ignoreZero,
    makeBytes32,
    AsyncRetriable,
} from '@layerzerolabs/devtools'
import { type OmniContract, parseGenericError } from '@layerzerolabs/devtools-evm'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import { OmniSDK } from '@layerzerolabs/devtools-evm'

export class LzApp extends OmniSDK implements ILzApp {
    constructor(contract: OmniContract) {
        super(contract)
    }

    @AsyncRetriable()
    async getTrustedRemote(eid: EndpointId): Promise<OmniAddress | undefined> {
        this.logger.debug(`Getting trusted remote for eid ${eid} (${formatEid(eid)})`)

        try {
            return ignoreZero(await this.contract.contract.getTrustedRemoteAddress(eid))
        } catch (error: unknown) {
            const parsedError = parseGenericError(error)

            // The method will revert if there is no trusted remote set for this path
            // in which case we want to return undefined instead of throwing
            if (parsedError?.reason === 'LzApp: no trusted path record') {
                return undefined
            }

            this.logger.debug(`Got an error getting trusted remote for eid ${eid} (${formatEid(eid)}): ${error}`)

            throw error
        }
    }

    async hasTrustedRemote(eid: EndpointId, address: OmniAddress | null | undefined): Promise<boolean> {
        this.logger.debug(`Checking trusted remote for eid ${eid} (${formatEid(eid)})`)

        return areBytes32Equal(address, await this.getTrustedRemote(eid))
    }

    async setTrustedRemote(eid: EndpointId, address: OmniAddress | null | undefined): Promise<OmniTransaction> {
        const description = `Setting trusted remote for eid ${eid} (${formatEid(eid)}) to address ${makeBytes32(address)}`
        this.logger.debug(description)

        const data = this.contract.contract.interface.encodeFunctionData('setTrustedRemoteAddress', [
            eid,
            makeBytes32(address),
        ])

        return {
            ...this.createTransaction(data),
            description,
        }
    }
}
