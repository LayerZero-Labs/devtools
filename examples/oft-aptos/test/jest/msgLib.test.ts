import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { expect } from 'chai'

import { EndpointId } from '@layerzerolabs/lz-definitions-v3'

import { MsgLib } from '../../sdk/msgLib'

const MSG_LIB_ADDRESS = '0xbe533727aebe97132ec0a606d99e0ce137dbdf06286eb07d9e0f7154df1f3f10'

describe('msgLib-tests', () => {
    let aptos: Aptos
    let msgLib: MsgLib

    beforeEach(async () => {
        const config = new AptosConfig({ network: Network.TESTNET })
        aptos = new Aptos(config)
        msgLib = new MsgLib(aptos, MSG_LIB_ADDRESS)
    })

    describe('get default uln configs', () => {
        it('Should get default send uln config', async () => {
            const sendConfig = await msgLib.get_default_uln_send_config(EndpointId.BSC_V2_TESTNET)
            expect(sendConfig).to.not.be.undefined
        })

        it('Should get default receive uln config', async () => {
            const receiveConfig = await msgLib.get_default_uln_receive_config(EndpointId.BSC_V2_TESTNET)
            expect(receiveConfig).to.not.be.undefined
        })
    })
})
