import { getDefaultConfig } from "@layerzerolabs/ua-utils"
import { expect } from "chai"
import { describe } from "mocha"

const NETWORK_NAMES = ["vengaboys", "britney"]

describe("config", () => {
    NETWORK_NAMES.forEach((networkName) => {
        describe(`Network '${networkName}`, () => {
            it("should return the default config", async () => {
                const config = await getDefaultConfig(networkName)

                expect(config).to.equal({
                    // FIXME
                })
            })
        })
    })
})
