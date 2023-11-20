import { expect } from "chai"
import { describe } from "mocha"
import { getNetworkRuntimeEnvironment } from "../../utils-evm-hardhat/dist"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const NETWORK_NAMES = ["vengaboys", "britney"]

describe("config", () => {
    NETWORK_NAMES.forEach((networkName) => {
        describe(`Network '${networkName}`, () => {
            let environment: HardhatRuntimeEnvironment

            before(async () => {
                environment = await getNetworkRuntimeEnvironment(networkName)
            })

            it("should have an endpoint deployed", async () => {
                const endpoint = await environment.ethers.getContract("EndpointV2")
                const endpointId = await endpoint.eid()

                expect(environment.network.config.endpointId).to.be.a("number")
                expect(endpointId).to.eql(environment.network.config.endpointId)
            })
        })
    })
})
