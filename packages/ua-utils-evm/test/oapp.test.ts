import { Contract } from "@ethersproject/contracts"
import { EndpointId } from "@layerzerolabs/lz-definitions"
import { expect } from "chai"
import { describe } from "mocha"
import sinon from "sinon"
import { createSetPeerProperty } from "../src/oapp"
import { isMisconfigured } from "@layerzerolabs/ua-utils"

describe("oapp", () => {
    describe("createSetPeerProperty", () => {
        it("should check peers and return Misconfigured if they don't match", async () => {
            const peers = sinon.stub().resolves("peer-not-set")
            const setPeer = sinon.stub().resolves("okay")
            const oapp = { peers, setPeer } as unknown as Contract

            const desired = (oapp: Contract, endpointId: EndpointId) => `peer-on-${endpointId}`
            const configurable = createSetPeerProperty(desired)
            const state = await configurable(oapp, EndpointId.AAVEGOTCHI_TESTNET)

            expect(isMisconfigured(state)).to.be.true
            expect(state.value).to.eql("peer-not-set")
            expect(state.desiredValue).to.eql(`peer-on-${EndpointId.AAVEGOTCHI_TESTNET}`)

            const result = await state.configure?.()

            expect(result).to.eql("okay")
            expect(setPeer.calledOnceWith(EndpointId.AAVEGOTCHI_TESTNET, `peer-on-${EndpointId.AAVEGOTCHI_TESTNET}`)).to.be.true
        })
    })
})
