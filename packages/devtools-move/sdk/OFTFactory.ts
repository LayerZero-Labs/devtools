import { EndpointId } from '@layerzerolabs/lz-definitions'
import { Aptos } from '@aptos-labs/ts-sdk'
import { RESTClient } from '@initia/initia.js'
import { IOFT } from './IOFT'
import { OFT } from './oft'
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
        return new OFT(connection, oftAddress, accountAddress, privateKey, eid)
    }
}
