import hre from "hardhat"
import { expect } from "chai"
import { describe } from "mocha"
import { NetworkEnvironment, createGetNetworkEnvironment } from "../../utils-evm-hardhat/dist"

const NETWORK_NAMES = ["vengaboys", "britney"]

describe("config", () => {
    NETWORK_NAMES.forEach((networkName) => {
        const getEnvironment = createGetNetworkEnvironment(hre)

        describe(`Network '${networkName}`, () => {
            let environment: NetworkEnvironment

            before(async () => {
                environment = await getEnvironment(networkName)
            })

            it("should have an endpoint deployed", async () => {
                const endpoint = await environment.getContract("EndpointV2", environment.provider)
                const endpointId = await endpoint.eid()

                expect(environment.network.config.endpointId).to.be.a("number")
                expect(endpointId).to.eql(environment.network.config.endpointId)
            })
        })
    })
})
