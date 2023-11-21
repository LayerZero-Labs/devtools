import { expect } from "chai"
import { describe } from "mocha"
import { getNetworkRuntimeEnvironment } from "../../utils-evm-hardhat/dist"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { BigNumber, Contract } from "ethers"
import Config = Chai.Config

const NETWORK_NAMES = ["vengaboys", "britney"]

describe("config", () => {
    NETWORK_NAMES.forEach((networkName) => {
        describe(`Network '${networkName}`, () => {
            let environment: HardhatRuntimeEnvironment
            let ultraLightNode302: Contract
            let ulnConfig: Contract
            let endpointId: number

            before(async () => {
                environment = await getNetworkRuntimeEnvironment(networkName)
                const endpoint = await environment.ethers.getContract("EndpointV2")
                endpointId = await endpoint.eid()

                ultraLightNode302 = await environment.ethers.getContract("UltraLightNode302")
                const ulnConfigAddress = await ultraLightNode302.ulnConfig()
                console.log({ ulnConfigAddress })

                const defaultUnlConfig = {
                    inboundConfirmations: BigNumber.from(0),
                    useCustomVerifiers: false,
                    useCustomOptionalVerifiers: false,
                    verifierCount: 0,
                    optionalVerifierCount: 0,
                    optionalVerifierThreshold: 0,
                    verifiers: [],
                    optionalVerifiers: [],
                }

                const defaultOutboundConfig = {
                    maxMessageSize: 0,
                    outboundConfirmations: BigNumber.from(0),
                    executor: environment.ethers.constants.AddressZero,
                }

                const UlnConfigFactory = await environment.ethers.getContractFactory("UlnConfig")
                ulnConfig = UlnConfigFactory.attach(ulnConfigAddress)

                let ulnConfigStruct = await ulnConfig.getDefaultUlnConfig(endpointId)
                let outboundConfigStruct = await ulnConfig.defaultOutboundConfig(endpointId)

                let decodedUlnConfig = decodeUlnConfigStruct(ulnConfigStruct)
                console.log({ decodedUlnConfig, defaultUnlConfig })
                expect(decodedUlnConfig).to.eql(defaultUnlConfig)

                let decodeOutboundConfig = decodeOutboundConfigStruct(outboundConfigStruct)
                console.log({ decodeOutboundConfig, defaultOutboundConfig })
                expect(decodeOutboundConfig).to.eql(defaultOutboundConfig)
            })

            it("should have an endpoint deployed", async () => {
                const endpoint = await environment.ethers.getContract("EndpointV2")
                const endpointId = await endpoint.eid()

                expect(environment.network.config.endpointId).to.be.a("number")
                expect(endpointId).to.eql(environment.network.config.endpointId)
            })

            it("should setDefaultConfig ", async () => {
                const executerWallet = await environment.ethers.Wallet.createRandom()
                const executerAddress = executerWallet.address

                const verifierWallet = await environment.ethers.Wallet.createRandom()
                const verifierAddress = verifierWallet.address

                const setDefaultConfigParam = {
                    eid: endpointId,
                    outboundConfig: {
                        maxMessageSize: 1,
                        outboundConfirmations: BigNumber.from(1),
                        executor: executerAddress,
                    },
                    inboundConfirmations: BigNumber.from(1),
                    verifiers: [verifierAddress],
                    optionalVerifiers: [],
                    optionalVerifierThreshold: 0,
                }

                const setUnlConfig = {
                    inboundConfirmations: setDefaultConfigParam.inboundConfirmations,
                    useCustomVerifiers: false,
                    useCustomOptionalVerifiers: false,
                    verifierCount: setDefaultConfigParam.verifiers.length,
                    optionalVerifierCount: setDefaultConfigParam.optionalVerifiers.length,
                    optionalVerifierThreshold: setDefaultConfigParam.optionalVerifierThreshold,
                    verifiers: setDefaultConfigParam.verifiers,
                    optionalVerifiers: setDefaultConfigParam.optionalVerifiers,
                }

                await ultraLightNode302.setDefaultConfig([setDefaultConfigParam])

                const ulnConfigStruct = await ulnConfig.getDefaultUlnConfig(endpointId)
                let decodedUlnConfig = decodeUlnConfigStruct(ulnConfigStruct)
                console.log({ decodedUlnConfig, setUnlConfig })
                expect(decodedUlnConfig).to.eql(setUnlConfig)

                const outboundConfigStruct = await ulnConfig.defaultOutboundConfig(endpointId)
                let decodeOutboundConfig = decodeOutboundConfigStruct(outboundConfigStruct)
                console.log({ decodeOutboundConfig, setDefaultConfigParam: setDefaultConfigParam.outboundConfig })
                expect(decodeOutboundConfig).to.eql(setDefaultConfigParam.outboundConfig)
            })
        })
    })
})

function decodeUlnConfigStruct(result: any): any {
    return {
        inboundConfirmations: result.inboundConfirmations,
        useCustomVerifiers: result.useCustomVerifiers,
        useCustomOptionalVerifiers: result.useCustomOptionalVerifiers,
        verifierCount: result.verifierCount,
        optionalVerifierCount: result.optionalVerifierCount,
        optionalVerifierThreshold: result.optionalVerifierThreshold,
        verifiers: result.verifiers,
        optionalVerifiers: result.optionalVerifiers,
    }
}

function decodeOutboundConfigStruct(result: any): any {
    return {
        maxMessageSize: result.maxMessageSize,
        outboundConfirmations: result.outboundConfirmations,
        executor: result.executor,
    }
}
