import { Aptos } from '@aptos-labs/ts-sdk'
import { RESTClient } from '@initia/initia.js'
import { AptosEndpoint } from './aptosEndpoint'
import { InitiaEndpoint } from './initiaEndpoint'
import { IEndpoint } from './IEndpoint'

export class EndpointFactory {
    static create(connection: Aptos | RESTClient, endpointAddress: string): IEndpoint {
        if (connection instanceof Aptos) {
            return new AptosEndpoint(connection, endpointAddress)
        }
        return new InitiaEndpoint(connection, endpointAddress)
    }
}
