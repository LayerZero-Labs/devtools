import { expect } from "chai"
import { describe } from "mocha"
import { getNetworkRuntimeEnvironment } from "@layerzerolabs/utils-evm-hardhat"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { BigNumber, Contract } from "ethers"
import { TransactionResponse } from "@ethersproject/providers"

const NETWORK_NAMES = ["vengaboys", "britney"]
describe("config", () => {
    NETWORK_NAMES.forEach((networkName) => {
        describe(`Network '${networkName}`, () => {
            let environment: HardhatRuntimeEnvironment
            let ultraLightNode302: Contract
            let ulnConfig: Contract
            let endpoint: Contract
            let endpointId: number

            before(async () => {
                environment = await getNetworkRuntimeEnvironment(networkName)
                endpoint = await environment.ethers.getContract("EndpointV2")
                endpointId = await endpoint.eid()

                ultraLightNode302 = await environment.ethers.getContract("UltraLightNode302")
                const ulnConfigAddress = await ultraLightNode302.ulnConfig()

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
                expect(decodedUlnConfig).to.eql(defaultUnlConfig)

                let decodeOutboundConfig = decodeOutboundConfigStruct(outboundConfigStruct)
                expect(decodeOutboundConfig).to.eql(defaultOutboundConfig)
            })

            it("should setDefaultConfig ", async () => {
                // TODO clean up test
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

                const setDefaultConfigResponse: TransactionResponse = await ultraLightNode302.setDefaultConfig([setDefaultConfigParam])
                await setDefaultConfigResponse.wait()

                const registerLibraryResponse: TransactionResponse = await endpoint.registerLibrary(ultraLightNode302.address)
                await registerLibraryResponse.wait()

                const setDefaultSendLibraryResponse: TransactionResponse = await endpoint.setDefaultSendLibrary(
                    endpointId,
                    ultraLightNode302.address
                )
                await setDefaultSendLibraryResponse.wait()

                const setDefaultReceiveLibraryResponse: TransactionResponse = await endpoint.setDefaultReceiveLibrary(
                    endpointId,
                    ultraLightNode302.address,
                    0
                )
                await setDefaultReceiveLibraryResponse.wait()

                let getDefaultConfigTask = await environment.run("getDefaultConfig", { networks: networkName })

                const defaultSendLibrary = await endpoint.defaultSendLibrary(endpointId)
                expect(defaultSendLibrary).to.eql(ultraLightNode302.address)

                const defaultReceiveLibrary = await endpoint.defaultReceiveLibrary(endpointId)
                expect(defaultReceiveLibrary).to.eql(ultraLightNode302.address)

                const ulnConfigStruct = await ulnConfig.getDefaultUlnConfig(endpointId)
                expect(ulnConfigStruct.inboundConfirmations).to.eql(getDefaultConfigTask.inboundConfirmations)
                expect(ulnConfigStruct.optionalVerifiers).to.eql(getDefaultConfigTask.optionalVerifiers)
                expect(ulnConfigStruct.optionalVerifierThreshold).to.eql(getDefaultConfigTask.optionalVerifierThreshold)
                expect(ulnConfigStruct.verifiers).to.eql(getDefaultConfigTask.verifiers)

                const outboundConfigStruct = await ulnConfig.defaultOutboundConfig(endpointId)
                expect(outboundConfigStruct.maxMessageSize).to.eql(getDefaultConfigTask.maxMessageSize)
                expect(outboundConfigStruct.outboundConfirmations).to.eql(getDefaultConfigTask.outboundConfirmations)
                expect(outboundConfigStruct.executor).to.eql(getDefaultConfigTask.executor)
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
