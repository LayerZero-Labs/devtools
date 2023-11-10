import { Chain, Stage } from "@layerzerolabs/lz-definitions"
import hre from "hardhat"
import { expect } from "chai"
import { describe } from "mocha"
import { createGetDefinedNetworkNamesOnStage, withExternalDeployments } from "../src/config"

describe("config", () => {
    describe("withExternalDeployments()", () => {
        it("should add no external deployments if no networks have been specified", () => {
            const config = {}

            expect(withExternalDeployments("some/path")(config)).to.eql({
                external: {
                    deployments: {},
                },
            })
        })

        it("should add external deployments for all networks", () => {
            const config = {
                networks: {
                    "vengaboys-testnet": {},
                },
            }

            expect(withExternalDeployments("some/path")(config)).to.eql({
                networks: {
                    "vengaboys-testnet": {},
                },
                external: {
                    deployments: {
                        "vengaboys-testnet": ["some/path/vengaboys-testnet"],
                    },
                },
            })
        })

        it("should append external deployments for all networks", () => {
            const config = {
                networks: {
                    "vengaboys-testnet": {},
                },
            }

            const configWithSomePath = withExternalDeployments("some/path")(config)
            const configWithSomeOtherPath = withExternalDeployments("some/other/path")(configWithSomePath)

            expect(configWithSomeOtherPath).to.eql({
                networks: {
                    "vengaboys-testnet": {},
                },
                external: {
                    deployments: {
                        "vengaboys-testnet": ["some/path/vengaboys-testnet", "some/other/path/vengaboys-testnet"],
                    },
                },
            })
        })

        it("should not append duplicate external deployments for all networks", () => {
            const config = {
                networks: {
                    "vengaboys-testnet": {},
                },
            }

            const configWithSomePath = withExternalDeployments("some/path")(config)
            const configWithSomeOtherPath = withExternalDeployments("some/other/path")(configWithSomePath)
            const configWithSomePathAgain = withExternalDeployments("some/path")(configWithSomeOtherPath)

            expect(configWithSomePathAgain).to.eql({
                networks: {
                    "vengaboys-testnet": {},
                },
                external: {
                    deployments: {
                        "vengaboys-testnet": ["some/path/vengaboys-testnet", "some/other/path/vengaboys-testnet"],
                    },
                },
            })
        })
    })

    describe("createGetDefinedNetworkNamesOnStage()", () => {
        const getNetworkNames = createGetDefinedNetworkNamesOnStage(hre.config.networks)

        it("should return all network names on the stage if called with null/undefined", () => {
            expect(getNetworkNames(Stage.TESTNET, null)).to.eql(["bsc-testnet"])
            expect(getNetworkNames(Stage.TESTNET, undefined)).to.eql(["bsc-testnet"])
            expect(getNetworkNames(Stage.MAINNET, null)).to.eql(["ethereum-mainnet"])
            expect(getNetworkNames(Stage.MAINNET, undefined)).to.eql(["ethereum-mainnet"])
        })

        it("should return an empty array if called with an empty array", () => {
            expect(getNetworkNames(Stage.TESTNET, [])).to.eql([])
            expect(getNetworkNames(Stage.MAINNET, [])).to.eql([])
        })

        it("should return an array of defined networks if called with an non-empty array", () => {
            expect(getNetworkNames(Stage.TESTNET, [Chain.BSC, Chain.AAVEGOTCHI, Chain.ETHEREUM])).to.eql(["bsc-testnet"])
            expect(getNetworkNames(Stage.MAINNET, [Chain.BSC, Chain.AAVEGOTCHI, Chain.ETHEREUM])).to.eql(["ethereum-mainnet"])
        })
    })
})
