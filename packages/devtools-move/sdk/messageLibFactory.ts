import { Aptos } from '@aptos-labs/ts-sdk'
import { RESTClient } from '@initia/initia.js'
import { AptosMsgLib } from './aptosMessageLib'
import { InitiaMsgLib } from './initiaMsgLib'
import { IMessageLib } from './IMessageLib'

export class MessageLibFactory {
    static create(moveVMConnection: Aptos | RESTClient, msgLibAddress: string): IMessageLib {
        if (moveVMConnection instanceof Aptos) {
            return new AptosMsgLib(moveVMConnection, msgLibAddress)
        }
        return new InitiaMsgLib(moveVMConnection, msgLibAddress)
    }
}
