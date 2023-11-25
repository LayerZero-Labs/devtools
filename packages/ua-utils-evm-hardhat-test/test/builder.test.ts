import { expect } from 'chai'
import hre from 'hardhat'
import { describe } from 'mocha'
import { eidAndDeploymentToPoint, OmniGraphBuilderHardhat } from '@layerzerolabs/ua-utils-evm-hardhat'
import { getNetworkRuntimeEnvironment } from '@layerzerolabs/utils-evm-hardhat'
import { OmniPoint } from '@layerzerolabs/ua-utils'
import assert from 'assert'

describe('builder', () => {
    it('should collect all deployed DefaultOApp contracts', async () => {
        const britneyEnv = await getNetworkRuntimeEnvironment('britney')
        const vengaboysEnv = await getNetworkRuntimeEnvironment('vengaboys')

        const britneyDeployment = await britneyEnv.deployments.get('DefaultOApp')
        const vengaboysDeployment = await vengaboysEnv.deployments.get('DefaultOApp')

        const britneyPoint: OmniPoint = eidAndDeploymentToPoint(britneyEnv.network.config.endpointId, britneyDeployment)
        const vengaboysPoint: OmniPoint = eidAndDeploymentToPoint(
            vengaboysEnv.network.config.endpointId,
            vengaboysDeployment
        )

        const builder = await OmniGraphBuilderHardhat.fromDeployedContract(hre, 'DefaultOApp')

        expect(builder.graph).to.eql({
            contracts: [
                {
                    point: vengaboysPoint,
                    config: undefined,
                },
                {
                    point: britneyPoint,
                    config: undefined,
                },
            ],
            connections: [
                {
                    vector: { from: vengaboysPoint, to: britneyPoint },
                    config: undefined,
                },
                {
                    vector: { from: britneyPoint, to: vengaboysPoint },
                    config: undefined,
                },
            ],
        })
    })

    it('should collect all newly deployed DefaultOApp contracts', async () => {
        const britneyEnv = await getNetworkRuntimeEnvironment('britney')
        const vengaboysEnv = await getNetworkRuntimeEnvironment('vengaboys')

        const [_, deployer] = await britneyEnv.getUnnamedAccounts()
        assert(deployer, 'Missing deployer')

        const britneyDeployment = await britneyEnv.deployments.deploy('DefaultOApp', {
            from: deployer,
            skipIfAlreadyDeployed: false,
        })
        const vengaboysDeployment = await vengaboysEnv.deployments.get('DefaultOApp')

        const britneyPoint: OmniPoint = eidAndDeploymentToPoint(britneyEnv.network.config.endpointId, britneyDeployment)
        const vengaboysPoint: OmniPoint = eidAndDeploymentToPoint(
            vengaboysEnv.network.config.endpointId,
            vengaboysDeployment
        )

        const builder = await OmniGraphBuilderHardhat.fromDeployedContract(hre, 'DefaultOApp')

        expect(builder.graph).to.eql({
            contracts: [
                {
                    point: vengaboysPoint,
                    config: undefined,
                },
                {
                    point: britneyPoint,
                    config: undefined,
                },
            ],
            connections: [
                {
                    vector: { from: vengaboysPoint, to: britneyPoint },
                    config: undefined,
                },
                {
                    vector: { from: britneyPoint, to: vengaboysPoint },
                    config: undefined,
                },
            ],
        })
    })
})
