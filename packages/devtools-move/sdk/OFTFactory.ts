import { EndpointId } from '@layerzerolabs/lz-definitions'
import { Aptos } from '@aptos-labs/ts-sdk'
import { RESTClient } from '@initia/initia.js'
import { IOFT } from './IOFT'
import { aptosOFT } from './aptosOFT'
import { InitiaOFT } from './initiaOFT'

export class OFTFactory {
    static create(
        connection: Aptos | RESTClient,
        oftAddress: string,
        accountAddress: string,
        privateKey: string,
        eid: EndpointId
    ): IOFT {
        if (connection instanceof RESTClient) {
            return new InitiaOFT(connection, oftAddress, accountAddress, privateKey, eid)
        }
        return new aptosOFT(connection, oftAddress, accountAddress, privateKey, eid)
    }
}
