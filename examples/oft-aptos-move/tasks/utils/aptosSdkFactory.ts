/* eslint-disable import/no-unresolved */
import { AptosAccount, AptosClient } from 'aptos'

import { OmniAddress, OmniPoint, OmniTransaction } from '@layerzerolabs/devtools'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { IOApp, OAppEnforcedOptionParam } from '@layerzerolabs/ua-devtools'

import { AptosEndpointV2 } from './aptosEndpointV2'
import { createAptosConnectionFactory } from './aptosUtils'

export function createAptosOAppFactory(
    accountFactory: (point: OmniPoint) => AptosAccount,
    connectionFactory = createAptosConnectionFactory()
) {
    return async function (point: OmniPoint): Promise<IOApp> {
        const client: AptosClient = await connectionFactory(point.eid)
        const aptosAccount = accountFactory(point)
        return {
            point,
            async getOwner(): Promise<OmniAddress | undefined> {
                return undefined
            },
            async hasOwner(_owner: OmniAddress): Promise<boolean> {
                return false
            },
            async setOwner(_owner: OmniAddress): Promise<OmniTransaction> {
                return {} as OmniTransaction
            },
            async getEndpointSDK() {
                return new AptosEndpointV2(point, client, aptosAccount)
            },
            async getPeer(_eid: EndpointId): Promise<OmniAddress | undefined> {
                return undefined
            },
            async hasPeer(_eid: EndpointId, _peer: OmniAddress): Promise<boolean> {
                return false
            },
            async setPeer(_eid: EndpointId, _peer: OmniAddress | null | undefined): Promise<OmniTransaction> {
                return {} as OmniTransaction
            },
            async getDelegate(): Promise<OmniAddress | undefined> {
                return undefined
            },
            async setDelegate(_address: OmniAddress): Promise<OmniTransaction> {
                return {} as OmniTransaction
            },
            async isDelegate(): Promise<boolean> {
                return false
            },
            async getEnforcedOptions(): Promise<any> {
                return {}
            },
            async setEnforcedOptions(_enforcedOptions: OAppEnforcedOptionParam[]): Promise<OmniTransaction> {
                return {} as OmniTransaction
            },
            async getCallerBpsCap(): Promise<bigint | undefined> {
                return 0n
            },
            async setCallerBpsCap(_callerBpsCap: bigint): Promise<OmniTransaction | undefined> {
                return {} as OmniTransaction
            },
        }
    }
}
