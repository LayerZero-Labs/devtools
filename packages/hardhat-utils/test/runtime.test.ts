import chai from "chai"
import chaiAsPromised from "chai-as-promised"
import hre from "hardhat"
import sinon from "sinon"
import { expect } from "chai"
import {
    createGetDeployments,
    createGetNetwork,
    createGetNetworkEnvironment,
    createGetEthereumProvider,
    wrapEIP1193Provider,
} from "../src/runtime"
import * as providersConstruction from "hardhat/internal/core/providers/construction"
import { verifyMessage } from "@ethersproject/wallet"

chai.use(chaiAsPromised)

describe("runtime", () => {
    let createProviderStub: sinon.SinonStub

    beforeEach(() => {
        createProviderStub = sinon.stub(providersConstruction, "createProvider")

        // We want to clear the memoization cache before running the test suite
        createGetEthereumProvider.cache.keys.length = 0
        createGetEthereumProvider.cache.values.length = 0
        createGetNetwork.cache.keys.length = 0
        createGetNetwork.cache.values.length = 0
        createGetNetworkEnvironment.cache.keys.length = 0
        createGetNetworkEnvironment.cache.values.length = 0
    })

    afterEach(() => {
        createProviderStub.restore()
    })

    describe("createGetEthereumProvider", () => {
        it("should reject if network does not exist", async () => {
            const getProvider = createGetEthereumProvider(hre)

            await expect(getProvider("not-existent-in-hardhat-config")).to.eventually.be.rejected
        })

        it("should reject if createProvider rejects", async () => {
            const error = new Error("oh no oh no")
            createProviderStub.rejects(error)

            const getProvider = createGetEthereumProvider(hre)

            await expect(getProvider("ethereum-mainnet")).to.eventually.be.rejectedWith(error)
        })

        it("should resolve with provider", async () => {
            createProviderStub.restore()

            const getProvider = createGetEthereumProvider(hre)
            const provider = await getProvider("ethereum-mainnet")

            expect(provider).not.to.be.undefined
        })

        it("should cache the result", async () => {
            createProviderStub.restore()

            const getProvider = createGetEthereumProvider(hre)
            const provider1 = await getProvider("ethereum-mainnet")
            const provider2 = await getProvider("ethereum-mainnet")
            const provider3 = await getProvider("bsc-testnet")
            const provider4 = await getProvider("bsc-testnet")

            expect(provider1).to.equal(provider2)
            expect(provider3).to.equal(provider4)
            expect(provider1).not.to.equal(provider4)
        })

        it("should cache the factory", () => {
            expect(createGetEthereumProvider(hre)).to.eql(createGetEthereumProvider(hre))
        })

        describe("getSigner()", () => {
            it("should sign a transaction", async () => {
                createProviderStub.restore()

                const getProvider = createGetEthereumProvider(hre)
                const provider = await getProvider("bsc-testnet").then(wrapEIP1193Provider)
                const signer = provider.getSigner()

                const message = "hello"
                const signature = await signer.signMessage(message)
                const address = verifyMessage(message, signature)

                expect(address).to.equal(await signer.getAddress())
            })

            it("should throw an error if there is no mnemonic", async () => {
                createProviderStub.restore()

                const getProvider = createGetEthereumProvider(hre)
                const provider = await getProvider("ethereum-mainnet").then(wrapEIP1193Provider)
                const signer = provider.getSigner()

                await expect(signer.signMessage("hello")).to.eventually.be.rejected
            })
        })
    })

    describe("createGetNetwork", () => {
        it("should reject if the network is not defined in hardhat config", async () => {
            const getNetwork = createGetNetwork(hre)

            await expect(getNetwork("not-existent-in-hardhat-config")).to.eventually.be.rejected
        })

        it("should reject if createProvider rejects", async () => {
            const error = new Error("oh no oh no")
            createProviderStub.rejects(error)

            const getNetwork = createGetNetwork(hre)

            await expect(getNetwork("ethereum-mainnet")).to.eventually.be.rejectedWith(error)
        })

        it("should resolve with network", async () => {
            const getProvider = createGetEthereumProvider(hre)
            const getNetwork = createGetNetwork(hre)

            const provider = await getProvider("ethereum-mainnet")
            const network = await getNetwork("ethereum-mainnet")

            expect(network).to.eql({
                name: "ethereum-mainnet",
                config: hre.config.networks["ethereum-mainnet"],
                provider,
                saveDeployments: true,
            })
        })

        it("should cache the result", async () => {
            createProviderStub.restore()

            const getNetwork = createGetNetwork(hre)
            const network1 = await getNetwork("ethereum-mainnet")
            const network2 = await getNetwork("ethereum-mainnet")
            const network3 = await getNetwork("bsc-testnet")
            const network4 = await getNetwork("bsc-testnet")

            expect(network1).to.equal(network2)
            expect(network3).to.equal(network4)
            expect(network1).not.to.equal(network4)
        })

        it("should cache the factory", () => {
            expect(createGetNetwork(hre)).to.eql(createGetNetwork(hre))
        })
    })

    describe("createGetDeployments", () => {
        it("should reject if the network is not defined in hardhat config", async () => {
            const getDeployments = createGetDeployments(hre)

            await expect(getDeployments("not-existent-in-hardhat-config")).to.eventually.be.rejected
        })

        it("should reject if createProvider rejects", async () => {
            const error = new Error("oh no oh no")
            createProviderStub.rejects(error)

            const getDeployments = createGetDeployments(hre)

            await expect(getDeployments("ethereum-mainnet")).to.eventually.be.rejectedWith(error)
        })

        it("should resolve with network", async () => {
            const getDeployments = createGetDeployments(hre)
            const deployments = await getDeployments("ethereum-mainnet")

            expect(deployments).to.have.property("get")
            expect(deployments).to.have.property("getOrNull")
            expect(deployments).to.have.property("save")
        })

        it("should cache the factory", () => {
            expect(createGetDeployments(hre)).to.eql(createGetDeployments(hre))
        })
    })

    describe("createGetNetworkEnvironment", () => {
        beforeEach(() => {
            createProviderStub.restore()
        })

        it("should reject if the network is not defined in hardhat config", async () => {
            const getNetworkEnvironment = createGetNetworkEnvironment(hre)

            await expect(getNetworkEnvironment("not-existent-in-hardhat-config")).to.eventually.be.rejected
        })

        it("should reject if createProvider rejects", async () => {
            const error = new Error("oh no oh no")
            const mockGetProvider = sinon.stub().throws(error)

            const getNetworkEnvironment = createGetNetworkEnvironment(hre, mockGetProvider)

            await expect(getNetworkEnvironment("ethereum-mainnet")).to.eventually.be.rejectedWith(error)
        })

        it("should reject if createNetwork rejects", async () => {
            const error = new Error("oh no oh no")
            const mockGetNetwork = sinon.stub().throws(error)

            const getNetworkEnvironment = createGetNetworkEnvironment(hre, undefined, mockGetNetwork)

            await expect(getNetworkEnvironment("ethereum-mainnet")).to.eventually.be.rejectedWith(error)
        })

        it("should reject if createDeployments rejects", async () => {
            const error = new Error("oh no oh no")
            const mockGetDeployments = sinon.stub().throws(error)

            const getNetworkEnvironment = createGetNetworkEnvironment(hre, undefined, undefined, mockGetDeployments)

            await expect(getNetworkEnvironment("ethereum-mainnet")).to.eventually.be.rejectedWith(error)
        })

        it("should resolve with network environment", async () => {
            const getNetworkEnvironment = createGetNetworkEnvironment(hre)
            const env = await getNetworkEnvironment("ethereum-mainnet")

            expect(env).to.have.property("network")
            expect(env).to.have.property("deployments")
            expect(env).to.have.property("provider")
        })

        it("should cache the factory", () => {
            expect(createGetNetworkEnvironment(hre)).to.eql(createGetNetworkEnvironment(hre))
        })
    })
})
