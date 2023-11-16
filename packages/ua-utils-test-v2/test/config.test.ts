import { NetworkEnvironment, createGetNetworkEnvironment } from "@layerzerolabs/hardhat-utils"
import { getDefaultConfig } from "@layerzerolabs/ua-utils"
import { AddressZero } from "@ethersproject/constants"
import { expect } from "chai"
import hre from "hardhat"
import { describe } from "mocha"

describe("config", () => {
    let environment: NetworkEnvironment

    /**
     * This is a workaround for until we have the endpoint deployment ready.
     *
     * Since we don't have an endpoint deployment file yet, we need to create one here
     * (and delete it after we're done since it's not valid outside the lifetime of this test).
     *
     * TODO We might turn this into a deployment file and grab a fixture instead,
     * that might be nicer plus it will enable us to run tests in parallel
     */
    before(async () => {
        environment = await createGetNetworkEnvironment(hre)("hardhat")
        const signer = environment.provider.getSigner()

        await environment.deployments.deploy("EndpointV2", {
            from: await signer.getAddress(),
            args: [environment.network.config.endpointId, AddressZero],
        })
    })

    after(async () => {
        await environment.deployments.delete("EndpointV2")
    })

    it("should return the default config", async () => {
        const config = await getDefaultConfig("hardhat")

        expect(config).to.equal({
            // FIXME
        })
    })
})
