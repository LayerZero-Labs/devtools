import 'hardhat'
import { avaxLzApp, deployLzApp, ethLzApp } from '../__utils__/lzapp'
import { createConnectedContractFactory, OmniContractFactoryHardhat } from '@layerzerolabs/devtools-evm-hardhat'
import { configureLzApp, ILzApp, LzAppFactory, LzAppOmniGraph } from '@layerzerolabs/ua-devtools'
import { OmniContract, omniContractToPoint } from '@layerzerolabs/devtools-evm'
import { deployEndpoint } from '../__utils__/endpoint'
import { OmniPoint, OmniTransaction } from '@layerzerolabs/devtools'
import { createLzAppFactory } from '@layerzerolabs/ua-devtools-evm'

describe('lzapp/config', () => {
    let contractFactory: OmniContractFactoryHardhat
    let lzappSdkFactory: LzAppFactory

    let ethContract: OmniContract
    let ethLzAppPoint: OmniPoint
    let ethLzAppSdk: ILzApp

    let avaxContract: OmniContract
    let avaxLzAppPoint: OmniPoint
    let avaxLzAppSdk: ILzApp
    let transactions: OmniTransaction[]

    // This is the LzApp config that we want to use against our contracts
    beforeEach(async () => {
        await deployEndpoint()
        await deployLzApp()

        contractFactory = createConnectedContractFactory()
        lzappSdkFactory = createLzAppFactory(contractFactory)

        ethContract = await contractFactory(ethLzApp)
        avaxContract = await contractFactory(avaxLzApp)

        ethLzAppPoint = omniContractToPoint(ethContract)
        ethLzAppSdk = await lzappSdkFactory(ethLzAppPoint)

        avaxLzAppPoint = omniContractToPoint(avaxContract)
        avaxLzAppSdk = await lzappSdkFactory(avaxLzAppPoint)
    })

    describe('configureLzAppTrustedRemotes', () => {
        it('should return all setPeer transactions', async () => {
            const graph: LzAppOmniGraph = {
                contracts: [
                    {
                        point: ethLzAppPoint,
                    },
                    {
                        point: avaxLzAppPoint,
                    },
                ],
                connections: [
                    {
                        vector: { from: ethLzAppPoint, to: avaxLzAppPoint },
                        config: undefined,
                    },
                    {
                        vector: { from: avaxLzAppPoint, to: ethLzAppPoint },
                        config: undefined,
                    },
                ],
            }

            // This is the LzApp config that we want to use against our contracts
            transactions = await configureLzApp(graph, lzappSdkFactory)

            expect(transactions).toEqual([
                await ethLzAppSdk.setTrustedRemote(avaxLzAppPoint.eid, avaxLzAppPoint.address),
                await avaxLzAppSdk.setTrustedRemote(ethLzAppPoint.eid, ethLzAppPoint.address),
            ])
        })

        it('should return all setPeer transactions in parallel mode', async () => {
            const graph: LzAppOmniGraph = {
                contracts: [
                    {
                        point: ethLzAppPoint,
                    },
                    {
                        point: avaxLzAppPoint,
                    },
                ],
                connections: [
                    {
                        vector: { from: ethLzAppPoint, to: avaxLzAppPoint },
                        config: undefined,
                    },
                    {
                        vector: { from: avaxLzAppPoint, to: ethLzAppPoint },
                        config: undefined,
                    },
                ],
            }

            process.env.LZ_ENABLE_EXPERIMENTAL_PARALLEL_EXECUTION = '1'

            // This is the LzApp config that we want to use against our contracts
            transactions = await configureLzApp(graph, lzappSdkFactory)

            expect(transactions).toEqual([
                await ethLzAppSdk.setTrustedRemote(avaxLzAppPoint.eid, avaxLzAppPoint.address),
                await avaxLzAppSdk.setTrustedRemote(ethLzAppPoint.eid, ethLzAppPoint.address),
            ])
        })
    })

    afterEach(() => {
        process.env.LZ_ENABLE_EXPERIMENTAL_PARALLEL_EXECUTION = undefined
    })
})
